import { lockBoardThickness } from '../../utils/boardPieces';
import type { VanInteriorFinish } from '../../types/camper.types';
import { materialsAllowedFor, repriceItem } from '../../utils/itemPricing';
import type { ProjectActions } from '../useProjectStore';
import { syncCollisionFlags, type ImmerSet } from './projectHelpers';

// Flag and material actions: toggles that do not move geometry, plus interior finish
export const createItemFlagsSlice = (
  set: ImmerSet,
): Pick<
  ProjectActions,
  'setItemLocked' | 'setItemVisible' | 'setItemMaterial' | 'setItemOpen' | 'setItemAdaptToFit' | 'setInteriorFinish'
> => ({
  // Flag toggles bypass the locked guard (otherwise a locked module could never be unlocked).
  // Unchanged values return before touching the draft so no empty undo step is recorded.
  setItemLocked: (id, locked) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.locked === locked) return;
      item.locked = locked;
    }),

  // Hidden modules still count for mass, CoG and collisions: this is a display flag only
  setItemVisible: (id, visible) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.visible === visible) return;
      item.visible = visible;
    }),

  // Rebuilds a board module in another board material (or a textile item in another textile); mass and cost follow (Flow 4)
  setItemMaterial: (id, materialId) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || item.materialId === materialId) return;
      if (!materialsAllowedFor(item).includes(materialId)) return;
      item.materialId = materialId;
      // A loose board takes the new board's thickness (boardPieces.ts)
      const locked = lockBoardThickness(item.catalogId, materialId, item.dimensions);
      if (locked.height !== item.dimensions.height || locked.depth !== item.dimensions.depth) item.dimensions = locked;
      const priced = repriceItem(item);
      if (priced) Object.assign(item, priced);
      syncCollisionFlags(state);
    }),

  // Visual only (doors, lids, drawers): collisions keep the closed shape, so no re-sync
  setItemOpen: (id, open) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || (item.isOpen === true) === open) return;
      item.isOpen = open;
    }),

  // Fit adaptation opt-out (fitAdaptation.ts): off = rigid box again, so notches and nesting are
  // re-evaluated in the same undo step. Only `false` is stored; on removes the field.
  setItemAdaptToFit: (id, on) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      if (!item || (item.adaptToFit !== false) === on) return;
      if (on) delete item.adaptToFit;
      else item.adaptToFit = false;
      syncCollisionFlags(state);
    }),

  setInteriorFinish: (finish) =>
    set((state) => {
      const next = { ...state.interiorFinish, ...finish };
      const keys = Object.keys(next) as (keyof VanInteriorFinish)[];
      if (keys.every((key) => next[key] === state.interiorFinish[key])) return;
      state.interiorFinish = next;
    }),
});
