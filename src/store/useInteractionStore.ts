import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';

// Things the user operates in the scene that are not part of the design: the van's cargo doors
// and running water. UI-only state (never saved, never in the Undo/Redo history), like useViewStore.
// The 3D side eases towards these targets (canvas/props/van/vanDoorMotion.ts, canvas/water/*).

export type VanDoorId = 'side' | 'rear';

export const VAN_DOOR_IDS: readonly VanDoorId[] = ['side', 'rear'];

// Spanish UI labels
export const VAN_DOOR_LABEL: Record<VanDoorId, string> = {
  side: 'Puerta lateral',
  rear: 'Portones traseros',
};

export interface InteractionState {
  // Target pose of each cargo door (true = open)
  vanDoors: Record<VanDoorId, boolean>;
  // Water running per module id (kitchen tap, shower). Missing = off.
  runningWater: Record<string, boolean>;
}

export interface InteractionActions {
  toggleVanDoor: (door: VanDoorId) => void;
  setVanDoor: (door: VanDoorId, open: boolean) => void;
  toggleRunningWater: (itemId: string) => void;
  setRunningWater: (itemId: string, on: boolean) => void;
  // Closes every tap and shower (e.g. when loading another project)
  stopAllWater: () => void;
}

export type InteractionStore = InteractionState & InteractionActions;

export const useInteractionStore = create<InteractionStore>()((set) => ({
  vanDoors: { side: false, rear: false },
  runningWater: {},
  toggleVanDoor: (door) => set((state) => ({ vanDoors: { ...state.vanDoors, [door]: !state.vanDoors[door] } })),
  setVanDoor: (door, open) =>
    set((state) => (state.vanDoors[door] === open ? state : { vanDoors: { ...state.vanDoors, [door]: open } })),
  toggleRunningWater: (itemId) =>
    set((state) => ({ runningWater: withWater(state.runningWater, itemId, !state.runningWater[itemId]) })),
  setRunningWater: (itemId, on) =>
    set((state) =>
      (state.runningWater[itemId] === true) === on ? state : { runningWater: withWater(state.runningWater, itemId, on) },
    ),
  stopAllWater: () => set({ runningWater: {} }),
}));

// Off entries are dropped, so the record only lists running fixtures
function withWater(current: Record<string, boolean>, itemId: string, on: boolean): Record<string, boolean> {
  const next = { ...current };
  if (on) next[itemId] = true;
  else delete next[itemId];
  return next;
}

// Selector helper: whether a module's water is running
export const isWaterRunning = (state: InteractionState, itemId: string): boolean => state.runningWater[itemId] === true;

// A deleted kitchen or shower takes its running water with it (undoing the delete brings it back off)
useProjectStore.subscribe((state, previous) => {
  if (state.items === previous.items) return;
  const { runningWater } = useInteractionStore.getState();
  const gone = Object.keys(runningWater).filter((id) => !state.items.some((item) => item.id === id));
  if (gone.length === 0) return;
  const next = { ...runningWater };
  for (const id of gone) delete next[id];
  useInteractionStore.setState({ runningWater: next });
});
