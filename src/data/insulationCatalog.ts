import type { InsulationMaterialDef, InsulationMaterialId } from '../types/camper.types';

// Insulation and thermal/acoustic layers for the bare shell (workflow phase 2, see data/interiorFinish.ts).
// REFERENCE values, verify with the manufacturer datasheets before use:
// - Elastomeric foam (Kaiflex / Armaflex type): λ ≈ 0.034–0.036 W/(m·K), density ≈ 55 kg/m³.
// - Stone wool: λ ≈ 0.035–0.040 W/(m·K), density ≈ 40 kg/m³.
// - Bubble foil and vapour barrier: mass per m² only; no λ (radiant barrier, not a conductor).
// - Tape: sold per roll; priceEurM2 is per m² of tape, applied to the tape area (10 % of walls + roof).
// Market prices in Spain (EUR/m²) are approximate. massKgM2 = density × thickness for foams and wool.
export const INSULATION_MATERIALS: readonly InsulationMaterialDef[] = [
  {
    id: 'kaiflex-19',
    name: 'Kaiflex 19 mm',
    kind: 'closedCellFoam',
    thicknessMM: 19,
    massKgM2: 1.05,
    priceEurM2: 22,
    lambdaWmK: 0.035,
    color: '#1c1c1e',
  },
  {
    id: 'kaiflex-10',
    name: 'Kaiflex 10 mm',
    kind: 'closedCellFoam',
    thicknessMM: 10,
    massKgM2: 0.55,
    priceEurM2: 12,
    lambdaWmK: 0.034,
    color: '#1c1c1e',
  },
  {
    id: 'rockwool-50',
    name: 'Lana de roca 50 mm',
    kind: 'mineralWool',
    thicknessMM: 50,
    massKgM2: 2,
    priceEurM2: 11,
    lambdaWmK: 0.037,
    color: '#d9c27a',
  },
  {
    id: 'alu-tape',
    name: 'Cinta de aluminio',
    kind: 'tape',
    thicknessMM: 0,
    massKgM2: 0.06,
    priceEurM2: 8,
    lambdaWmK: null,
    color: '#c9ccd1',
  },
  {
    id: 'vapor-barrier',
    name: 'Barrera de vapor',
    kind: 'barrier',
    thicknessMM: 0.2,
    massKgM2: 0.18,
    priceEurM2: 2.5,
    lambdaWmK: null,
    color: '#e5e7eb',
  },
  {
    id: 'alu-bubble',
    name: 'Aislante aluminio burbuja',
    kind: 'reflective',
    thicknessMM: 8,
    massKgM2: 0.25,
    priceEurM2: 5,
    lambdaWmK: null,
    color: '#c9ccd1',
  },
  {
    id: 'thermal-felt',
    name: 'Fieltro térmico',
    kind: 'felt',
    thicknessMM: 10,
    massKgM2: 1.5,
    priceEurM2: 9,
    lambdaWmK: 0.04,
    color: '#6b7280',
  },
];

// Catalogue lookup by id. Returns undefined for unknown ids (e.g. a corrupt project file).
export const findInsulation = (id: string): InsulationMaterialDef | undefined =>
  INSULATION_MATERIALS.find((material) => material.id === (id as InsulationMaterialId));
