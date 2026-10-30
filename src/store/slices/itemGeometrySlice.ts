import { repriceItem } from '../../utils/itemPricing';
import { resolveRestingY } from '../../utils/surfaceSnap';
import { clampItemY } from '../../utils/verticalMove';
import { clampDimensions } from '../../utils/resizeLimits';
import { lockBoardThickness } from '../../utils/boardPieces';
import { carryDependents } from '../../utils/nestCarry';
import type { ProjectActions } from '../useProjectStore';
import { applyCarriedPoses, syncCollisionFlags, type ImmerSet } from './projectHelpers';

// Placement and geometry actions for a single module (position, size, rotation)
export const createItemGeometrySlice = (
  set: ImmerSet,
): Pick<ProjectActions, 'moveItem' | 'resizeItem' | 'rotateItemQuarterTurn'> => ({
  // Y stays within [0, ceiling − height]: no interior furniture goes below the floor or through the roof.
  // Surface decor ignores the requested Y and rests on the furniture top beneath it (surfaceSnap.ts).
  // Decor resting on a moved module travels with it by the same (dx, dy, dz) (stackCarry.ts).
  // Devices nested inside it (battery under the bed) travel with it too (nestCarry.ts).
  // Locked riders are carried too: the lock stops the user dragging the item, not its support moving.
  moveItem: (id, position) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.locked) return;
      // The ceiling clamp runs before the carry delta, so riders follow the clamped pose
      const requested = { ...position, y: clampItemY(state.van, item, position.y) };
      const next = { ...requested, y: resolveRestingY(state.items, { ...item, position: requested }) };
      // No-op moves must not touch the draft, or they would create an empty undo step
      const { x, y, z } = item.position;
      if (next.x === x && next.y === y && next.z === z) return;
      // Riders are found in the pre-move scene, before the support's position changes
      const carried = carryDependents(state.van, state.items, id, { ...item, position: next });
      item.position = next;
      applyCarriedPoses(state, carried);
      syncCollisionFlags(state);
    }),

  // Parametric modules re-derive mass and cost from their catalog baseline (WORKFLOWS.md, Flow 4).
  // `position` (optional) moves the pivot in the same step: push/pull handles keep the opposite face
  // fixed by shifting the centre half the size change (ResizeHandles3D). Sizes stay within the
  // module's limits (resizeLimits.ts). Decor resting on the module rises or drops to its new top
  // (or off it, if the footprint shrank); nested devices keep their place.
  resizeItem: (id, dimensions, position) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.locked || !item.parametric) return;
      // Loose boards keep the material thickness whatever is asked (boardPieces.ts)
      const resized = lockBoardThickness(item.catalogId, item.materialId, clampDimensions(state.van, item.catalogId, { ...item.dimensions, ...dimensions }));
      const moved = position ? { ...position, y: clampItemY(state.van, { ...item, dimensions: resized }, position.y) } : item.position;
      const same = resized.width === item.dimensions.width && resized.height === item.dimensions.height && resized.depth === item.dimensions.depth;
      if (same && moved.x === item.position.x && moved.y === item.position.y && moved.z === item.position.z) return;
      // Dependents keep their X/Z (only the dragged face moves) and follow any height change
      const inPlace = { x: item.position.x, y: moved.y, z: item.position.z };
      const carried = carryDependents(state.van, state.items, id, { ...item, dimensions: resized, position: inPlace });
      item.dimensions = resized;
      item.position = moved;
      applyCarriedPoses(state, carried);
      // Riders re-rest on the module's real new top, now that its pivot has moved too
      for (const rider of state.items) {
        if (carried.has(rider.id)) rider.position = { ...rider.position, y: resolveRestingY(state.items, rider) };
      }
      const priced = repriceItem(item);
      if (priced) Object.assign(item, priced);
      syncCollisionFlags(state);
    }),

  // Rotates +90° around Y, snapped to whole quarter turns so repeated clicks never drift.
  // Decor resting on the module and devices nested inside it turn with it about the module's pivot.
  rotateItemQuarterTurn: (id) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.locked) return;
      const quarter = Math.PI / 2;
      const turns = (Math.round(item.rotation.y / quarter) + 1) % 4;
      const rotation = { ...item.rotation, y: turns * quarter };
      const carried = carryDependents(state.van, state.items, id, { ...item, rotation });
      item.rotation = rotation;
      applyCarriedPoses(state, carried);
      syncCollisionFlags(state);
    }),
});
