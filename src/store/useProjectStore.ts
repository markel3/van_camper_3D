import type { BoardOrientation } from '../utils/boardPieces';
import { createBoardSlice } from './slices/boardSlice';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type {
  CamperItem,
  DimensionsMM,
  ProjectContent,
  SnapStepMM,
  VanInteriorFinish,
  VanSpec,
  Vector3Tuple,
} from '../types/camper.types';
import { DEFAULT_VAN } from '../data/vansCatalog';
import { DEFAULT_INTERIOR_FINISH } from '../data/interiorFinish';
import { isRoofMounted } from '../utils/roofMount';
import { resolveRestingY } from '../utils/surfaceSnap';
import { carryRiders } from '../utils/stackCarry';
import { roofTopY } from '../utils/vanLayout';
import { createItemFlagsSlice } from './slices/itemFlagsSlice';
import { createItemGeometrySlice } from './slices/itemGeometrySlice';
import { applyCarriedPoses, sameVan, syncCollisionFlags } from './slices/projectHelpers';

// Single source of truth for the project (ARCHITECTURE.md §1 and §2).
// Selection, snap step and live collisions are NOT part of the Undo/Redo history.
export interface ProjectState {
  van: VanSpec;
  items: CamperItem[];
  // Decorative cargo lining: saved with the project and undoable, never affects collisions
  interiorFinish: VanInteriorFinish;
  selectedId: string | null;
  snapStepMM: SnapStepMM;
  // Live collision preview while a gizmo drag is in progress; null when not dragging
  dragCollisionIds: readonly string[] | null;
}

export interface ProjectActions {
  setVan: (van: VanSpec) => void;
  addItem: (item: Omit<CamperItem, 'id'>) => string;
  moveItem: (id: string, position: Vector3Tuple) => void;
  // `position`: new pivot in the same undo step (push/pull keeps the opposite face fixed)
  resizeItem: (id: string, dimensions: Partial<DimensionsMM>, position?: Vector3Tuple) => void;
  rotateItemQuarterTurn: (id: string) => void;
  // Copy of a module 50 mm along the van, selected; returns its id (null when `id` is unknown)
  duplicateItem: (id: string) => string | null;
  // Free carpentry: lay a board flat or stand it along / across the van (boardPieces.ts)
  setBoardOrientation: (id: string, orientation: BoardOrientation) => void;
  removeItem: (id: string) => void;
  setItemLocked: (id: string, locked: boolean) => void;
  setItemVisible: (id: string, visible: boolean) => void;
  setItemMaterial: (id: string, materialId: string) => void;
  setItemOpen: (id: string, open: boolean) => void;
  setItemAdaptToFit: (id: string, on: boolean) => void;
  setInteriorFinish: (finish: Partial<VanInteriorFinish>) => void;
  select: (id: string | null) => void;
  setSnapStep: (step: SnapStepMM) => void;
  setDragCollisions: (ids: readonly string[] | null) => void;
  loadProject: (project: ProjectContent) => void;
}

export type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>()(
  temporal(
    immer((set) => ({
      van: DEFAULT_VAN,
      items: [],
      interiorFinish: DEFAULT_INTERIOR_FINISH,
      selectedId: null,
      snapStepMM: 50,
      dragCollisionIds: null,

      // One undo step: the van and the roof modules it carries change together.
      // Roof modules keep their height above the roof face (H2 ↔ H3 lifts or lowers them).
      setVan: (van) =>
        set((state) => {
          if (sameVan(state.van, van)) return;
          const lift = roofTopY(van) - roofTopY(state.van);
          state.van = { ...van };
          for (const item of state.items) {
            if (!isRoofMounted(item.catalogId) || lift === 0) continue;
            item.position = { ...item.position, y: Math.max(roofTopY(van), item.position.y + lift) };
          }
          syncCollisionFlags(state);
        }),

      addItem: (item) => {
        const id = crypto.randomUUID();
        set((state) => {
          // Surface decor lands on the highest free surface under its insertion point (surfaceSnap.ts)
          const y = resolveRestingY(state.items, { ...item, id }, Infinity);
          state.items.push({ ...item, id, position: { ...item.position, y } });
          state.selectedId = id;
          syncCollisionFlags(state);
        });
        return id;
      },

      ...createItemGeometrySlice(set),
      ...createItemFlagsSlice(set),
      ...createBoardSlice(set),

      // If the selected module is deleted, the selection is cleared so no dangling pointer remains.
      // Decor that rested on it drops to whatever lies beneath (the floor if nothing), same undo step.
      removeItem: (id) =>
        set((state) => {
          const carried = carryRiders(state.items, id, null);
          state.items = state.items.filter((i) => i.id !== id);
          applyCarriedPoses(state, carried);
          if (state.selectedId === id) state.selectedId = null;
          syncCollisionFlags(state);
        }),

      select: (id) =>
        set((state) => {
          state.selectedId = id;
        }),

      setSnapStep: (step) =>
        set((state) => {
          state.snapStepMM = step;
        }),

      setDragCollisions: (ids) =>
        set((state) => {
          state.dragCollisionIds = ids === null ? null : [...ids];
        }),

      // Replaces the whole project (opened .camper.json). Undoable, so Ctrl+Z restores the previous one.
      loadProject: ({ van, items, interiorFinish }) =>
        set((state) => {
          state.van = van;
          state.items = items;
          state.interiorFinish = interiorFinish;
          state.selectedId = null;
          state.dragCollisionIds = null;
          syncCollisionFlags(state);
        }),
    })),
    {
      partialize: (state) => ({ van: state.van, items: state.items, interiorFinish: state.interiorFinish }),
      // zundo records on every set() unless told the tracked state is unchanged. Immer keeps
      // untouched branches referentially equal, so selection/snap changes add no undo steps.
      equality: (past, current) =>
        past.van === current.van && past.items === current.items && past.interiorFinish === current.interiorFinish,
      limit: 100,
    },
  ),
);

// Undo/redo can remove the selected module (e.g. undoing its insertion); drop the stale pointer
function clearOrphanSelection(): void {
  const { selectedId, items, select } = useProjectStore.getState();
  if (selectedId && !items.some((item) => item.id === selectedId)) select(null);
}

// History actions (Ctrl+Z / Ctrl+Y)
export const undo = (): void => {
  useProjectStore.temporal.getState().undo();
  clearOrphanSelection();
};
export const redo = (): void => {
  useProjectStore.temporal.getState().redo();
  clearOrphanSelection();
};
