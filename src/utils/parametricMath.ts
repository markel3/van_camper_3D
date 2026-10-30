import type { CatalogItemDef, DimensionsMM, MaterialDef } from '../types/camper.types';
import { mmToM } from './unitConverters';

// Parametric re-pricing (WORKFLOWS.md, Flow 4). The board used by a module is approximated by the
// surface area of its bounding box (constant board thickness):  A = 2 · (w·h + w·d + h·d)
export function boxSurfaceAreaM2(dimensions: DimensionsMM): number {
  const w = mmToM(dimensions.width);
  const h = mmToM(dimensions.height);
  const d = mmToM(dimensions.depth);
  return 2 * (w * h + w * d + h * d);
}

// Mass of one m² of board: thickness × density
export const boardKgPerM2 = (material: MaterialDef): number => mmToM(material.thicknessMM) * material.densityKgM3;

export interface MassAndCost {
  weightKg: number;
  priceEur: number;
}

// Splits a catalog value into a board part and a fixed part (hardware, appliances, labour).
// The board part is capped at the catalog value, so the fixed part is never negative.
function splitBaseline(total: number, boardEstimate: number): { board: number; fixed: number } {
  const board = Math.min(total, boardEstimate);
  return { board, fixed: total - board };
}

// Mass and cost of a board module at new dimensions and/or material.
// Calibrated on the catalog baseline (never on current values, so repeated edits don't compound):
//   board₀ = min(catalog, A₀ · k₀)       fixed = catalog − board₀
//   value  = fixed + board₀ · (A / A₀) · (k / k₀)
// with k = thickness × density for mass and k = €/m² for cost. At the catalog size and material
// the result equals the catalog exactly; resizing only scales the board share, not the sink or hinges.
export function estimateMassAndCost(
  base: CatalogItemDef,
  baseMaterial: MaterialDef,
  dimensions: DimensionsMM,
  material: MaterialDef,
): MassAndCost {
  const baseArea = boxSurfaceAreaM2(base.dimensions);
  const areaRatio = boxSurfaceAreaM2(dimensions) / baseArea;

  const mass = splitBaseline(base.weightKg, baseArea * boardKgPerM2(baseMaterial));
  const cost = splitBaseline(base.priceEur, baseArea * baseMaterial.priceEurM2);
  const massRatio = boardKgPerM2(material) / boardKgPerM2(baseMaterial);
  const costRatio = material.priceEurM2 / baseMaterial.priceEurM2;

  return {
    weightKg: Math.round((mass.fixed + mass.board * areaRatio * massRatio) * 10) / 10,
    priceEur: Math.round((cost.fixed + cost.board * areaRatio * costRatio) * 100) / 100,
  };
}
