import { create } from 'zustand';
import type { CameraViewId } from '../utils/cameraViews';
import type { SceneLayerId, WorkflowPhase } from '../types/camper.types';

// UI-only view state. Deliberately outside useProjectStore, so it never enters
// the Undo/Redo history nor the saved project file.
export interface ViewState {
  view: CameraViewId;
  // Bumped on every request, so re-selecting the active view re-frames the camera
  viewRequestId: number;
  // X-ray chassis: the whole body drawn as an uncut ghost around the (opaque) furniture
  isVanTransparent: boolean;
  // Installation networks (pipes / cables) visibility in the 3D canvas
  showWater: boolean;
  showElectrical: boolean;
  // Active step of the bottom workflow stepper
  workflowPhase: WorkflowPhase;
  // Layers panel: each group can be hidden independently of the phase
  layers: Record<SceneLayerId, boolean>;
  // First-person walkthrough (WASD + mouse look at eye height)
  isWalkthrough: boolean;
  // Lighting mood: false = daylight studio, true = night (interior LEDs dominate)
  isNight: boolean;
  // Interior LED intensity multiplier, 0..1 (Decoration phase slider)
  ledIntensity: number;
  // "New project" vehicle picker dialog
  isNewProjectOpen: boolean;
  // Tool rail: 'select' shows the selection without gizmo arrows, 'move' shows the translate gizmo,
  // 'resize' shows push/pull handles on the faces of a parametric module
  activeTool: ActiveTool;
  // Board picked in the DIY carpentry catalogue, applied to the next DIY module inserted
  diyMaterialId: string;
}

export type ActiveTool = 'select' | 'move' | 'resize';

export interface ViewActions {
  setView: (view: CameraViewId) => void;
  toggleVanTransparent: () => void;
  toggleWater: () => void;
  toggleElectrical: () => void;
  // Applies the phase preset (layers, X-ray, networks); individual toggles still work afterwards
  setWorkflowPhase: (phase: WorkflowPhase) => void;
  setLayerVisible: (layer: SceneLayerId, visible: boolean) => void;
  setWalkthrough: (on: boolean) => void;
  setNight: (night: boolean) => void;
  setLedIntensity: (value: number) => void;
  setNewProjectOpen: (open: boolean) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setDiyMaterial: (materialId: string) => void;
}

export type ViewStore = ViewState & ViewActions;

const ALL_LAYERS: Record<SceneLayerId, boolean> = {
  structure: true,
  insulation: true,
  systems: true,
  furniture: true,
  decor: true,
};

interface PhasePreset {
  layers: Record<SceneLayerId, boolean>;
  isVanTransparent: boolean;
  showWater: boolean;
  showElectrical: boolean;
}

// What each workflow step shows. Later phases build on the earlier ones (insulation stays under the lining).
export const PHASE_PRESETS: Record<WorkflowPhase, PhasePreset> = {
  model: {
    layers: { structure: false, insulation: false, systems: false, furniture: false, decor: false },
    isVanTransparent: false,
    showWater: false,
    showElectrical: false,
  },
  insulation: {
    layers: { structure: false, insulation: true, systems: false, furniture: false, decor: false },
    isVanTransparent: false,
    showWater: false,
    showElectrical: false,
  },
  systems: {
    layers: { structure: false, insulation: true, systems: true, furniture: true, decor: false },
    isVanTransparent: true,
    showWater: true,
    showElectrical: true,
  },
  furniture: {
    layers: { structure: true, insulation: true, systems: false, furniture: true, decor: false },
    isVanTransparent: false,
    showWater: false,
    showElectrical: false,
  },
  decor: {
    layers: { ...ALL_LAYERS, systems: false },
    isVanTransparent: false,
    showWater: false,
    showElectrical: false,
  },
};

export const useViewStore = create<ViewStore>()((set) => ({
  view: 'perspective',
  viewRequestId: 0,
  isVanTransparent: false,
  showWater: false,
  showElectrical: false,
  workflowPhase: 'furniture',
  layers: { ...PHASE_PRESETS.furniture.layers },
  isWalkthrough: false,
  isNight: false,
  ledIntensity: 0.6,
  isNewProjectOpen: false,
  activeTool: 'move',
  diyMaterialId: 'chopo-15mm',
  setView: (view) => set((state) => ({ view, viewRequestId: state.viewRequestId + 1 })),
  toggleVanTransparent: () => set((state) => ({ isVanTransparent: !state.isVanTransparent })),
  toggleWater: () => set((state) => ({ showWater: !state.showWater })),
  toggleElectrical: () => set((state) => ({ showElectrical: !state.showElectrical })),
  setWorkflowPhase: (phase) => {
    const preset = PHASE_PRESETS[phase];
    set({ workflowPhase: phase, ...preset, layers: { ...preset.layers } });
  },
  setLayerVisible: (layer, visible) => set((state) => ({ layers: { ...state.layers, [layer]: visible } })),
  setWalkthrough: (on) => set({ isWalkthrough: on }),
  setNight: (night) => set({ isNight: night }),
  setLedIntensity: (value) => set({ ledIntensity: Math.min(1, Math.max(0, value)) }),
  setNewProjectOpen: (open) => set({ isNewProjectOpen: open }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setDiyMaterial: (materialId) => set({ diyMaterialId: materialId }),
}));
