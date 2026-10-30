import type { CatalogItemDef, DimensionsMM } from '../types/camper.types';

// Free carpentry, board by board (Phase 20): three loose pieces the user combines into any
// structure. Boards are cut from 15 mm poplar plywood by default (materialId 'chopo-15mm');
// their thickness is locked to the material (boardPieces.ts), and the 40 × 40 mm slat section is fixed.
//   board-horizontal  shelf / worktop / bed base   600 × 15 × 400 mm (W × H × D)
//   board-vertical    side / partition / front     600 × 700 × 15 mm
//   wood-slat         pine batten 40 × 40 mm       1000 × 40 × 40 mm
// Weights and prices at default size match boardPricing.ts (one sheet / linear metre), which
// uses approximate Spanish market references and must be checked against supplier quotes.
export const DIY_CATALOG: readonly CatalogItemDef[] = [
  {
    catalogId: 'board-horizontal',
    name: 'Tablero horizontal',
    category: 'structure',
    dimensions: { width: 600, height: 15, depth: 400 },
    parametric: true,
    weightKg: 1.7,
    priceEur: 5.28,
    materialId: 'chopo-15mm',
  },
  {
    catalogId: 'board-vertical',
    name: 'Tablero vertical',
    category: 'structure',
    dimensions: { width: 600, height: 700, depth: 15 },
    parametric: true,
    weightKg: 3,
    priceEur: 9.24,
    materialId: 'chopo-15mm',
  },
  {
    catalogId: 'wood-slat',
    name: 'Listón de pino 40 × 40',
    category: 'structure',
    dimensions: { width: 1000, height: 40, depth: 40 },
    parametric: true,
    weightKg: 0.8,
    priceEur: 2.4,
    materialId: 'pino-macizo',
  },
];

const DIY_IDS: ReadonlySet<string> = new Set(DIY_CATALOG.map((def) => def.catalogId));

// Allowed size range per piece (mm). Min and max are inclusive.
// Boards: the two stretchable sides run 50–2500 mm; the thickness axis stays within 9–40 mm,
// so the material thickness (15 / 18 mm…) always fits. Slat: length 100–3000, section exactly 40.
export const DIY_LIMITS: Readonly<Record<string, { min: DimensionsMM; max: DimensionsMM }>> = {
  'board-horizontal': {
    min: { width: 50, height: 9, depth: 50 },
    max: { width: 2500, height: 40, depth: 2500 },
  },
  'board-vertical': {
    min: { width: 50, height: 50, depth: 9 },
    max: { width: 2500, height: 2500, depth: 40 },
  },
  'wood-slat': {
    min: { width: 100, height: 40, depth: 40 },
    max: { width: 3000, height: 40, depth: 40 },
  },
};

// Materials the loose boards may be cut from (all are plywood, solid wood or laminate)
export const DIY_BOARD_MATERIALS: readonly { id: string; label: string }[] = [
  { id: 'chopo-15mm', label: 'Chopo 15 mm' },
  { id: 'roble-18mm', label: 'Roble 18 mm' },
  { id: 'pino-macizo', label: 'Pino' },
  { id: 'abedul-cpl', label: 'Abedul CPL' },
  { id: 'roble-salvia', label: 'Verde Salvia' },
];

export const isDiy = (catalogId: string): boolean => DIY_IDS.has(catalogId);

export const diyLimitsOf = (catalogId: string): { min: DimensionsMM; max: DimensionsMM } | undefined =>
  DIY_LIMITS[catalogId];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

// Keeps each axis inside the piece limits. Ids without limits are returned unchanged.
export function clampToLimits(catalogId: string, dims: DimensionsMM): DimensionsMM {
  const limits = diyLimitsOf(catalogId);
  if (!limits) return dims;
  return {
    width: clamp(dims.width, limits.min.width, limits.max.width),
    height: clamp(dims.height, limits.min.height, limits.max.height),
    depth: clamp(dims.depth, limits.min.depth, limits.max.depth),
  };
}
