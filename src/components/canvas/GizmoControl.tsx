import { useEffect, useState, type ComponentRef, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import type { EventDispatcher, Object3D, Raycaster } from 'three';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import { findCollisions } from '../../utils/collisionMath';
import { magnetSnap } from '../../utils/snapMath';
import { carryDependents, findDependents } from '../../utils/nestCarry';
import { resolveRestingY } from '../../utils/surfaceSnap';
import { snapToGridM } from '../../utils/unitConverters';
import { canMoveVertically, clampItemY } from '../../utils/verticalMove';
import { OVERLAY_LAYER } from './sceneLayers';
import { isHiddenInView } from './viewVisibility';

const roundToMicron = (m: number): number => Math.round(m * 1e6) / 1e6;

const sameIds =(a: readonly string[], b: readonly string[] | null): boolean =>
  b !== null && a.length === b.length && a.every((id, index) => id === b[index]);

// Instance type derived from drei, so three-stdlib (a transitive dependency) is never imported directly
export type GizmoHandle = ComponentRef<typeof TransformControls>;

interface GizmoControlProps {
  gizmoRef: RefObject<GizmoHandle | null>;
}

// three-stdlib's typings omit these runtime members of TransformControls:
// the 'dragging-changed' event and the public `axis` field (typed private).
interface GizmoEvents {
  'dragging-changed': { value: boolean };
}

// True while the pointer is over (or pressing) one of the gizmo's handles
export function isGizmoHandleActive(gizmo: GizmoHandle | null): boolean {
  return Boolean(gizmo && (gizmo as unknown as { axis: string | null }).axis);
}

interface OrbitLike {
  enabled: boolean;
}

// Translate gizmo for the selected module, X/Z on the floor plus a vertical arrow (Y) for items whose height is user-controlled.
export function GizmoControl({ gizmoRef }: GizmoControlProps) {
  const selectedId = useProjectStore((state) => state.selectedId);
  const item = useProjectStore((state) => state.items.find((i) => i.id === state.selectedId));
  const snapStepMM = useProjectStore((state) => state.snapStepMM);
  const moveItem = useProjectStore((state) => state.moveItem);
  const view = useViewStore((state) => state.view);
  // The Select tool keeps the selection highlight but shows no translate handles
  const activeTool = useViewStore((state) => state.activeTool);
  const scene = useThree((state) => state.scene);
  // drei rebuilds the TransformControls instance when the default camera changes
  const camera = useThree((state) => state.camera);
  const orbit = useThree((state) => state.controls) as OrbitLike | null;
  const [target, setTarget] = useState<Object3D | null>(null);

  // Resolve the module's Object3D after it has been committed to the scene graph
  useEffect(() => {
    setTarget(selectedId ? (scene.getObjectByName(selectedId) ?? null) : null);
  }, [scene, selectedId]);

  // Handles live on the overlay layer so they never cast contact shadows. Its private picking
  // raycaster only tests layer 0 by default, so it is widened to keep the handles grabbable.
  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;
    gizmo.traverse((object) => object.layers.set(OVERLAY_LAYER));
    (gizmo as unknown as { raycaster: Raycaster }).raycaster.layers.enable(OVERLAY_LAYER);
  }, [gizmoRef, target, camera, activeTool]);

  // Freeze the camera while a handle is dragged so camera and module never move together
  useEffect(() => {
    const gizmo = gizmoRef.current as unknown as EventDispatcher<GizmoEvents> | null;
    if (!gizmo || !orbit) return;
    const onDraggingChanged = (event: { value: boolean }) => {
      orbit.enabled = !event.value;
    };
    gizmo.addEventListener('dragging-changed', onDraggingChanged);
    return () => {
      gizmo.removeEventListener('dragging-changed', onDraggingChanged);
      orbit.enabled = true;
    };
  }, [gizmoRef, orbit, target, activeTool]);

  // Select shows no handles; Resize shows its own push/pull grips (ResizeHandles3D)
  if (activeTool !== 'move') return null;
  if (!target || !item || item.locked || !item.visible || isHiddenInView(item.catalogId, view)) return null;

  // Snap live in van space (the object's parent), where the grid origin is the bulkhead centre.
  // The gizmo's own translationSnap works in world space, which is offset from van space.
  const handleObjectChange = () => {
    const { van, items, dragCollisionIds, setDragCollisions } = useProjectStore.getState();
    const p = target.position;
    const gridded = { x: snapToGridM(p.x, snapStepMM), y: canMoveVertically(item.catalogId) ? clampItemY(van, item, snapToGridM(p.y, snapStepMM)) : Math.max(0, p.y), z: snapToGridM(p.z, snapStepMM) };
    // The wall/face magnet overrides the grid when a face lands within 30 mm of a target
    const magnet = magnetSnap(van, items, { ...item, position: gridded });
    // Face sums like −0.935 + 0.3 leave float residue; positions are kept to the micrometre
    const planar = { x: roundToMicron(magnet.x), y: roundToMicron(magnet.y), z: roundToMicron(magnet.z) };
    // Surface decor rides live onto worktops, beds and tables, and drops to the floor off them
    const snapped = { ...planar, y: resolveRestingY(items, { ...item, position: planar }) };
    p.set(snapped.x, snapped.y, snapped.z);

    // Decor resting on the module and devices nested inside it follow the live delta (moveItem
    // carries them for real on release). They are always derived from the committed store, so the
    // live pose never compounds.
    const carried = carryDependents(van, items, item.id, { ...item, position: snapped });
    for (const [id, pose] of carried) {
      scene.getObjectByName(id)?.position.set(pose.position.x, pose.position.y, pose.position.z);
    }

    // Real-time collision preview at the live position, without touching the undo history.
    // The store is only written when the colliding set changes, to avoid re-render churn.
    const candidate = items.map((i) => {
      if (i.id === item.id) return { ...i, position: snapped };
      const pose = carried.get(i.id);
      return pose ? { ...i, position: pose.position } : i;
    });
    const ids = [...findCollisions(van, candidate).keys()].sort();
    if (!sameIds(ids, dragCollisionIds)) setDragCollisions(ids);
  };

  // Commit once on release (one drag = one undo step), then hand back to the committed flags.
  // Carried Object3Ds (riders, nested devices) were moved imperatively, so they are re-synced to the
  // committed store: if the drag was a no-op, R3F sees an unchanged position prop and would never
  // reset them itself.
  const handleMouseUp = () => {
    const before = useProjectStore.getState();
    const riderIds = findDependents(before.van, before.items, item);
    const { x, y, z } = target.position;
    const current = item.position;
    if (x !== current.x || y !== current.y || z !== current.z) moveItem(item.id, { x, y, z });
    const { items, setDragCollisions } = useProjectStore.getState();
    for (const id of riderIds) {
      const rider = items.find((i) => i.id === id);
      const object = scene.getObjectByName(id);
      if (!rider || !object) continue;
      object.position.set(rider.position.x, rider.position.y, rider.position.z);
      object.rotation.y = rider.rotation.y;
    }
    setDragCollisions(null);
  };

  return (
    <TransformControls
      ref={gizmoRef}
      object={target}
      mode="translate"
      showY={canMoveVertically(item.catalogId)}
      size={0.8}
      onObjectChange={handleObjectChange}
      onMouseUp={handleMouseUp}
    />
  );
}
