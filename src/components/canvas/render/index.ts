// Render pipeline public API (CamperStudio 3D canvas)
export { PostEffects } from './PostEffects';
export { StudioBackdrop } from './StudioBackdrop';
export { getLightingMood, readLightingMood, useLightingMood, type LightingMood } from './lightingMood';
export { QUALITY_DPR, RENDER_QUALITIES, useRenderQualityStore, type RenderQuality } from './renderQualityStore';

// Shared by the renderer (no post-processing) and the composer's AgX ToneMapping effect
export const TONE_MAPPING_EXPOSURE = 1.1;
