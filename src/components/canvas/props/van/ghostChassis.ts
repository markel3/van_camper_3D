import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, type Material, type Object3D, type Plane } from 'three';
import { useViewStore } from '../../../../store/useViewStore';

// X-ray chassis (useViewStore.isVanTransparent): every body material (procedural panels, .glb
// parts, floor slab, wheel arches) turns into an uncut ghost around the opaque furniture.
// depthWrite = false keeps the ghost from hiding the furniture behind it regardless of the
// transparent sort order. The original state is kept on the material, so toggling is lossless
// and works for materials mounted later (Suspense swaps, paint colour changes).

export const GHOST_OPACITY = 0.18;

interface GhostBackup {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
  clippingPlanes: Plane[] | null;
}

const noRaycast = (): void => undefined;

function setGhost(material: Material, ghost: boolean): void {
  const data = material.userData as { ghost?: boolean; ghostBackup?: GhostBackup };
  if ((data.ghost ?? false) === ghost) return;
  if (ghost) {
    data.ghostBackup = {
      transparent: material.transparent,
      opacity: material.opacity,
      depthWrite: material.depthWrite,
      clippingPlanes: material.clippingPlanes,
    };
    material.transparent = true;
    material.opacity = Math.min(material.opacity, GHOST_OPACITY);
    material.depthWrite = false;
    // The whole silhouette shows: no section cut on the ghost
    material.clippingPlanes = null;
  } else if (data.ghostBackup) {
    Object.assign(material, data.ghostBackup);
    delete data.ghostBackup;
  }
  data.ghost = ghost;
  // Clipping planes and transparency change the shader program
  material.needsUpdate = true;
}

// Applies the X-ray state to everything under root each frame. Cheap: a traversal of the body
// meshes with an early exit per material; materials only change on toggles. Body meshes never
// take pointer events, so modules stay selectable and draggable through the (ghost) body.
// Module-level visitor and flag: no closures allocated per frame
let ghostThisFrame = false;
function visit(node: Object3D): void {
  if (!(node instanceof Mesh)) return;
  if (node.raycast !== noRaycast) node.raycast = noRaycast;
  const materials: Material | Material[] = node.material;
  if (!Array.isArray(materials)) setGhost(materials, ghostThisFrame);
  else for (const material of materials) setGhost(material, ghostThisFrame);
}

export function useGhostChassis(root: RefObject<Object3D | null>): void {
  useFrame(() => {
    const group = root.current;
    if (!group) return;
    ghostThisFrame = useViewStore.getState().isVanTransparent;
    group.traverse(visit);
  });
}
