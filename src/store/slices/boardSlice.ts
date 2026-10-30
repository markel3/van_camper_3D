import { current } from 'immer';
import { orientBoard } from '../../utils/boardPieces';
import { repriceItem } from '../../utils/itemPricing';
import { resolveRestingY } from '../../utils/surfaceSnap';
import { clampItemY } from '../../utils/verticalMove';
import type { ProjectActions } from '../useProjectStore';
import { syncCollisionFlags, type ImmerSet } from './projectHelpers';

// Free carpentry actions (boardPieces.ts): duplicating a piece and turning a board over
export const DUPLICATE_OFFSET_M = 0.05;

export const createBoardSlice = (set: ImmerSet): Pick<ProjectActions, 'duplicateItem' | 'setBoardOrientation'> => ({
  // Same size, material and turn, 50 mm along the van (+Z); the copy becomes the selection.
  // Works for any module; one undo step.
  duplicateItem: (id) => {
    let copyId: string | null = null;
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item) return;
      copyId = crypto.randomUUID();
      const position = { ...item.position, z: Math.round((item.position.z + DUPLICATE_OFFSET_M) * 1e6) / 1e6 };
      const copy = { ...structuredClone(current(item)), id: copyId, position, locked: false, hasCollision: false };
      copy.position = { ...position, y: resolveRestingY(state.items, copy) };
      state.items.push(copy);
      state.selectedId = copyId;
      syncCollisionFlags(state);
    });
    return copyId;
  },

  // Lay a board flat or stand it up along / across the van, keeping its sides and its plan centre
  setBoardOrientation: (id, orientation) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.locked) return;
      const next = orientBoard(item, orientation);
      const same =
        next.catalogId === item.catalogId &&
        next.rotation.y === item.rotation.y &&
        next.dimensions.width === item.dimensions.width &&
        next.dimensions.height === item.dimensions.height &&
        next.dimensions.depth === item.dimensions.depth;
      if (same) return;
      item.catalogId = next.catalogId;
      item.dimensions = next.dimensions;
      item.rotation = next.rotation;
      item.position = { ...item.position, y: clampItemY(state.van, item, item.position.y) };
      const priced = repriceItem(item);
      if (priced) Object.assign(item, priced);
      syncCollisionFlags(state);
    }),
});
