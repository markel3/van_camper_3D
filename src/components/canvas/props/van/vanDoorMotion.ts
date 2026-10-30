import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Matrix4, Ray, Vector3, type Material, type Object3D, type Plane } from 'three';
import { useInteractionStore, type VanDoorId } from '../../../../store/useInteractionStore';
import type { VanLayout } from '../../../../utils/vanLayout';
import { requestContactShadowRefresh } from '../../contactShadowRefresh';

// Cargo doors of the vehicle (sliding side door on +X, rear barn doors), shared by both bodies:
// - progress: one linear 0..1 value per door, advanced once per frame towards the store target
//   (useInteractionStore.vanDoors); each body shapes it into its own motion with `phase`;
// - apertures: the interior opening of each door (van space), registered by the body that is drawn;
//   used by the [E] aim (vanDoorAt) and to cut the interior layers (lining, insulation, bare shell)
//   out of the opening while the door is open (doorCutUniforms, insulation/doorCutPatch.ts).
// Visual only: the walkthrough player stays inside the cargo box and collisions are unchanged.

// Seconds for a full stroke: the sliding door pops out then rolls back; the barn doors swing
const DURATION_S: Record<VanDoorId, number> = { side: 1.25, rear: 1.1 };

export const vanDoorProgress: Record<VanDoorId, number> = { side: 0, rear: 0 };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
// Smoothstep of the progress inside [start, end]: eased sub-motions (pop, slide, each leaf)
export function phase(progress: number, start: number, end: number): number {
  const x = clamp01((progress - start) / (end - start));
  return x * x * (3 - 2 * x);
}

// Interior opening of each door in van space (empty box: the body has no such door)
export const vanDoorApertures: Record<VanDoorId, Box3> = { side: new Box3(), rear: new Box3() };

// Leaves overlap the body around their opening: the clear aperture is this much smaller
const LEAF_OVERLAP_M = 0.03;
// The aperture box spans the wall: from just inside the cargo face to well outside the body
const APERTURE_INSIDE_M = 0.05;
const APERTURE_OUTSIDE_M = 0.3;

// Interior opening of a door from its closed leaf (or leaves) box, both in van space
export function doorAperture(door: VanDoorId, leaf: Box3, layout: VanLayout): Box3 {
  const box = new Box3();
  const top = Math.min(leaf.max.y - LEAF_OVERLAP_M, layout.cargoH);
  if (door === 'side') {
    const face = layout.cargoW / 2;
    box.min.set(face - APERTURE_INSIDE_M, 0, leaf.min.z + LEAF_OVERLAP_M);
    box.max.set(Math.max(face + APERTURE_OUTSIDE_M, leaf.max.x), top, leaf.max.z - LEAF_OVERLAP_M);
  } else {
    box.min.set(leaf.min.x + LEAF_OVERLAP_M, 0, layout.cargoL - APERTURE_INSIDE_M);
    box.max.set(leaf.max.x - LEAF_OVERLAP_M, top, Math.max(layout.cargoL + APERTURE_OUTSIDE_M, leaf.max.z));
  }
  return box;
}

// Section planes on (closed door) or off (open door), keeping the X-ray ghost backup in sync.
// Changes the program only on an actual toggle.
export function setDoorSectionCut(materials: readonly Material[], planes: Plane[], cut: boolean): void {
  const target = cut ? planes : null;
  for (const material of materials) {
    const data = material.userData as { ghost?: boolean; ghostBackup?: { clippingPlanes: Plane[] | null } };
    if (data.ghost && data.ghostBackup) {
      data.ghostBackup.clippingPlanes = target;
      continue;
    }
    if (material.clippingPlanes === target) continue;
    material.clippingPlanes = target;
    material.needsUpdate = true;
  }
}

export function setVanDoorAperture(door: VanDoorId, aperture: Box3 | null): void {
  if (aperture) vanDoorApertures[door].copy(aperture);
  else vanDoorApertures[door].makeEmpty();
}

// World-space boxes whose interior-layer fragments are discarded (min > max: inactive)
const INACTIVE = 1e5;
export const doorCutUniforms = {
  uDoorCutMin: { value: [new Vector3(INACTIVE, INACTIVE, INACTIVE), new Vector3(INACTIVE, INACTIVE, INACTIVE)] },
  uDoorCutMax: { value: [new Vector3(-INACTIVE, -INACTIVE, -INACTIVE), new Vector3(-INACTIVE, -INACTIVE, -INACTIVE)] },
};
const DOOR_SLOT: Record<VanDoorId, number> = { side: 0, rear: 1 };
// The cut reaches through the wall thickness outwards and down below the floor; it starts this far
// inside the aperture plane, which takes the lining and the frame flanges with it
const CUT_INSET_M = 0.06;
const CUT_REACH_M = 2;

const scratch = new Box3();
const vanToWorld = new Matrix4();
const worldToVan = new Matrix4();

function writeCut(door: VanDoorId, active: boolean): void {
  const slot = DOOR_SLOT[door];
  const min = doorCutUniforms.uDoorCutMin.value[slot]!;
  const max = doorCutUniforms.uDoorCutMax.value[slot]!;
  const aperture = vanDoorApertures[door];
  if (!active || aperture.isEmpty()) {
    min.setScalar(INACTIVE);
    max.setScalar(-INACTIVE);
    return;
  }
  scratch.copy(aperture);
  scratch.min.y = -CUT_REACH_M;
  if (door === 'side') {
    scratch.min.x = aperture.min.x - CUT_INSET_M;
    scratch.max.x = aperture.max.x + CUT_REACH_M;
  } else {
    scratch.min.z = aperture.min.z - CUT_INSET_M;
    scratch.max.z = aperture.max.z + CUT_REACH_M;
  }
  scratch.applyMatrix4(vanToWorld);
  min.copy(scratch.min);
  max.copy(scratch.max);
}

// Mounted once by the vehicle body root (VanShellProp): advances the doors, keeps the interior cut
// and the world → van transform of the aim test current. No allocations per frame.
export function useVanDoorMotion(root: RefObject<Object3D | null>): void {
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const { vanDoors } = useInteractionStore.getState();
    let moving = false;
    for (const door of ['side', 'rear'] as const) {
      const target = vanDoors[door] ? 1 : 0;
      const current = vanDoorProgress[door];
      if (current === target) continue;
      const step = delta / DURATION_S[door];
      vanDoorProgress[door] = target > current ? Math.min(target, current + step) : Math.max(target, current - step);
      moving = true;
    }
    if (moving) requestContactShadowRefresh();
    const group = root.current;
    if (group) {
      vanToWorld.copy(group.matrixWorld);
      worldToVan.copy(vanToWorld).invert();
    }
    writeCut('side', vanDoorProgress.side > 0.001);
    writeCut('rear', vanDoorProgress.rear > 0.001);
  });
}

// [E] aim: the door whose interior opening the world-space ray crosses first, within `far` metres.
// Van space is only translated from world space, so distances are comparable with raycast hits.
const vanRay = new Ray();
const hitPoint = new Vector3();
export function vanDoorAt(worldRay: Ray, far: number): { door: VanDoorId; distance: number } | null {
  vanRay.copy(worldRay).applyMatrix4(worldToVan);
  let best: { door: VanDoorId; distance: number } | null = null;
  for (const door of ['side', 'rear'] as const) {
    const box = vanDoorApertures[door];
    if (box.isEmpty() || !vanRay.intersectBox(box, hitPoint)) continue;
    const distance = hitPoint.distanceTo(vanRay.origin);
    if (distance <= far && (!best || distance < best.distance)) best = { door, distance };
  }
  return best;
}
