import type { InsulationMaterialId, VanSpec } from '../types/camper.types';
import { findInsulation } from '../data/insulationCatalog';

// Pure insulation quantities (area, mass, cost) for the bare cargo box. Interior dimensions in mm.
// Walls = two sides + rear doors + bulkhead; roof and floor = L·W. Foams, wool, bubble and barrier
// cover walls + roof; felt covers walls + roof + floor; tape covers 10 % of walls + roof (seams).

const MM2_TO_M2 = 1e-6;
const TAPE_COVERAGE_RATIO = 0.1;

export interface InsulationMaterialMetrics {
  id: InsulationMaterialId;
  name: string;
  areaM2: number;
  massKg: number;
  costEur: number;
  thicknessMM: number;
}

export interface InsulationMetrics {
  wallAreaM2: number;
  roofAreaM2: number;
  floorAreaM2: number;
  areaM2: number; // Σ installed area over all materials
  massKg: number;
  costEur: number;
  perMaterial: InsulationMaterialMetrics[];
}

export function cargoBoxAreas(van: VanSpec): { wallAreaM2: number; roofAreaM2: number; floorAreaM2: number } {
  const L = van.interiorLengthMM;
  const W = van.interiorWidthMM;
  const H = van.interiorHeightMM;
  return {
    wallAreaM2: (2 * L * H + 2 * W * H) * MM2_TO_M2,
    roofAreaM2: L * W * MM2_TO_M2,
    floorAreaM2: L * W * MM2_TO_M2,
  };
}

function coveredAreaM2(id: InsulationMaterialId, areas: ReturnType<typeof cargoBoxAreas>): number {
  const wallsAndRoof = areas.wallAreaM2 + areas.roofAreaM2;
  switch (id) {
    case 'thermal-felt':
      return wallsAndRoof + areas.floorAreaM2;
    case 'alu-tape':
      return wallsAndRoof * TAPE_COVERAGE_RATIO;
    default:
      return wallsAndRoof;
  }
}

// Each material counted once; unknown ids are skipped.
export function computeInsulationMetrics(van: VanSpec, ids: readonly InsulationMaterialId[]): InsulationMetrics {
  const areas = cargoBoxAreas(van);
  const perMaterial: InsulationMaterialMetrics[] = [];

  for (const id of new Set(ids)) {
    const def = findInsulation(id);
    if (!def) continue;
    const areaM2 = coveredAreaM2(id, areas);
    perMaterial.push({
      id,
      name: def.name,
      areaM2,
      massKg: areaM2 * def.massKgM2,
      costEur: areaM2 * def.priceEurM2,
      thicknessMM: def.thicknessMM,
    });
  }

  return {
    ...areas,
    areaM2: perMaterial.reduce((sum, row) => sum + row.areaM2, 0),
    massKg: perMaterial.reduce((sum, row) => sum + row.massKg, 0),
    costEur: perMaterial.reduce((sum, row) => sum + row.costEur, 0),
    perMaterial,
  };
}
