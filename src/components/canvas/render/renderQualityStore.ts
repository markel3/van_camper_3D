import { create } from 'zustand';

// Render quality preset. UI-only state (never saved, never in undo history).
// - high: full post-processing (N8AO full-res, bloom, SMAA, vignette), device pixel ratio up to 2
// - balanced: half-res AO, bloom and SMAA, pixel ratio capped at 1.5
// - low: no post-processing at all (renderer MSAA + tone mapping only), pixel ratio 1
export type RenderQuality = 'high' | 'balanced' | 'low';

export const RENDER_QUALITIES: readonly RenderQuality[] = ['high', 'balanced', 'low'];

interface RenderQualityState {
  quality: RenderQuality;
  setQuality: (quality: RenderQuality) => void;
}

export const useRenderQualityStore = create<RenderQualityState>()((set) => ({
  quality: 'high',
  setQuality: (quality) => set({ quality }),
}));

// Canvas pixel-ratio range per preset ([min, max], clamped to the device ratio by R3F)
export const QUALITY_DPR: Record<RenderQuality, [number, number]> = {
  high: [1, 2],
  balanced: [1, 1.5],
  low: [1, 1],
};
