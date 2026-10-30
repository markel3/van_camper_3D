import type { DimensionsMM, VanSpec } from '../types/camper.types';
import { diyLimitsOf } from '../data/diyCatalog';

// Size limits of a parametric module, shared by the store (resizeItem), the Inspector fields and the
// 3D push/pull handles (ResizeHandles3D). DIY carpentry has its own per-template limits
// (diyCatalog.ts); other parametric modules get a generic range bounded by the cargo box.

export const GENERIC_MIN_MM = 100;

export interface SizeLimits {
  min: DimensionsMM;
  max: DimensionsMM;
}

export function sizeLimits(van: VanSpec, catalogId: string): SizeLimits {
  // Width and depth may lie along either van axis once the module is turned a quarter
  const plan = Math.max(van.interiorLengthMM, van.interiorWidthMM);
  const cargo: DimensionsMM = { width: plan, height: van.interiorHeightMM, depth: plan };
  const diy = diyLimitsOf(catalogId);
  if (!diy) {
    return { min: { width: GENERIC_MIN_MM, height: GENERIC_MIN_MM, depth: GENERIC_MIN_MM }, max: cargo };
  }
  return {
    min: diy.min,
    max: {
      width: Math.min(diy.max.width, cargo.width),
      height: Math.min(diy.max.height, cargo.height),
      depth: Math.min(diy.max.depth, cargo.depth),
    },
  };
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

// Tenths of a millimetre within the module's limits (a 15 mm board centred on the grid has its faces on
// half millimetres, and an edge stuck to one must land exactly on it)
export const roundToTenthMM = (mm: number): number => Math.round(mm * 10) / 10;

export function clampDimensions(van: VanSpec, catalogId: string, dims: DimensionsMM): DimensionsMM {
  const { min, max } = sizeLimits(van, catalogId);
  return {
    width: roundToTenthMM(clamp(dims.width, min.width, max.width)),
    height: roundToTenthMM(clamp(dims.height, min.height, max.height)),
    depth: roundToTenthMM(clamp(dims.depth, min.depth, max.depth)),
  };
}
