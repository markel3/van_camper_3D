import type { VanSpec } from '../../types/camper.types';
import { findCollisions } from '../../utils/collisionMath';
import type { CarriedPose } from '../../utils/stackCarry';
import type { ProjectState } from '../useProjectStore';

// Immer-wrapped `set` of the project store, as seen by each slice
export type ImmerSet = (fn: (state: ProjectState) => void) => void;

// Re-derives every module's hasCollision flag after a geometry change. Only flags that actually
// change are written, so Immer keeps untouched items referentially equal.
export function syncCollisionFlags(state: ProjectState): void {
  const collisions = findCollisions(state.van, state.items);
  for (const item of state.items) {
    const colliding = collisions.has(item.id);
    if (item.hasCollision !== colliding) item.hasCollision = colliding;
  }
}

// Field-by-field comparison: re-selecting the current chassis must not record an undo step
export const sameVan = (a: VanSpec, b: VanSpec): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof VanSpec>;
  return [...keys].every((key) => a[key] === b[key]);
};

// Writes the poses computed by carryRiders (stackCarry.ts) inside the caller's set(), so the
// support and the decor riding on it change in a single undo step
export function applyCarriedPoses(state: ProjectState, poses: ReadonlyMap<string, CarriedPose>): void {
  for (const item of state.items) {
    const pose = poses.get(item.id);
    if (!pose) continue;
    item.position = pose.position;
    if (pose.rotation.y !== item.rotation.y) item.rotation = pose.rotation;
  }
}
