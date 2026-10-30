import type { MaterialDef } from '../types/camper.types';

// Materials catalogue used by camper modules (ids referenced by itemsCatalog.ts).
// WARNING: densities, thicknesses, prices and texture colours are approximate REFERENCE values
// (Spanish market, €/m² of finished sheet). They must be verified against supplier data sheets
// before use in a type-approval report.
export const MATERIALS_CATALOG: readonly MaterialDef[] = [
  {
    id: 'chopo-15mm',
    name: 'Contrachapado de chopo 15 mm',
    kind: 'plywood',
    densityKgM3: 470,
    thicknessMM: 15,
    priceEurM2: 22,
    texture: { baseColor: '#ebdcb9', roughness: 0.7, grain: 'fine' },
  },
  {
    id: 'chopo-18mm',
    name: 'Contrachapado de chopo 18 mm',
    kind: 'plywood',
    densityKgM3: 470,
    thicknessMM: 18,
    priceEurM2: 26,
    texture: { baseColor: '#ebdcb9', roughness: 0.7, grain: 'fine' },
  },
  {
    id: 'pino-macizo',
    name: 'Pino macizo',
    kind: 'solidWood',
    densityKgM3: 520,
    thicknessMM: 20,
    priceEurM2: 42,
    texture: { baseColor: '#dcb47e', roughness: 0.65, grain: 'strong' },
  },
  {
    id: 'abedul-cpl',
    name: 'Abedul con laminado CPL',
    kind: 'laminate',
    densityKgM3: 700,
    thicknessMM: 18,
    priceEurM2: 48,
    texture: { baseColor: '#f2efe6', roughness: 0.4, grain: 'fine' },
  },
  {
    id: 'roble-18mm',
    name: 'Contrachapado de roble 18 mm',
    kind: 'plywood',
    densityKgM3: 680,
    thicknessMM: 18,
    priceEurM2: 62,
    texture: { baseColor: '#b8895a', roughness: 0.6, grain: 'strong' },
  },
  {
    // Oak plywood carcass and worktop with sage-green lacquered MDF fronts (reference kitchen look)
    id: 'roble-salvia',
    name: 'Roble 18 mm + frentes lacados verde salvia',
    kind: 'plywood',
    densityKgM3: 700,
    thicknessMM: 18,
    priceEurM2: 74,
    texture: { baseColor: '#8a9a80', roughness: 0.6, grain: 'fine' },
  },
  {
    // Matte black laminated board (reference finish for the decoration swatches)
    id: 'negro-mate',
    name: 'Tablero laminado negro mate 15 mm',
    kind: 'laminate',
    densityKgM3: 700,
    thicknessMM: 15,
    priceEurM2: 54,
    texture: { baseColor: '#1c1d1f', roughness: 0.55, grain: 'none' },
  },
  {
    id: 'cpl-antracita',
    name: 'Tablero CPL antracita 15 mm',
    kind: 'laminate',
    densityKgM3: 690,
    thicknessMM: 15,
    priceEurM2: 52,
    texture: { baseColor: '#3a3d42', roughness: 0.6, grain: 'none' },
  },
  {
    id: 'metal-inox',
    name: 'Acero inoxidable AISI 304',
    kind: 'metal',
    densityKgM3: 7900,
    thicknessMM: 1.5,
    priceEurM2: 55,
    texture: { baseColor: '#c9ced3', roughness: 0.25, grain: 'none' },
  },
  {
    id: 'plastico-abs',
    name: 'Plástico ABS',
    kind: 'plastic',
    densityKgM3: 1050,
    thicknessMM: 4,
    priceEurM2: 30,
    texture: { baseColor: '#2d2f33', roughness: 0.5, grain: 'none' },
  },
  {
    id: 'hdpe',
    name: 'Polietileno HDPE',
    kind: 'plastic',
    densityKgM3: 950,
    thicknessMM: 10,
    priceEurM2: 40,
    texture: { baseColor: '#e8e8e4', roughness: 0.6, grain: 'none' },
  },
  {
    id: 'aluminio-acrilico',
    name: 'Panel compuesto de aluminio (ACM)',
    kind: 'composite',
    densityKgM3: 1400,
    thicknessMM: 4,
    priceEurM2: 28,
    texture: { baseColor: '#d9dde2', roughness: 0.35, grain: 'none' },
  },
  {
    id: 'aluminio-celula',
    name: 'Aluminio anodizado (marco de placa solar)',
    kind: 'metal',
    densityKgM3: 2700,
    thicknessMM: 2,
    priceEurM2: 35,
    texture: { baseColor: '#b8bec6', roughness: 0.3, grain: 'none' },
  },
  // ---- Decoration (bought-in items: never offered as a board material) ----
  {
    // Textile has no own kind: 'plastic' keeps it non-metallic and outside the board list
    id: 'lino-natural',
    name: 'Lino natural (tapicería y textiles)',
    kind: 'plastic',
    densityKgM3: 350,
    thicknessMM: 2,
    priceEurM2: 24,
    texture: { baseColor: '#cfc5b3', roughness: 0.95, grain: 'none' },
  },
  {
    id: 'lino-salvia',
    name: 'Lino verde salvia (tapicería y textiles)',
    kind: 'plastic',
    densityKgM3: 350,
    thicknessMM: 2,
    priceEurM2: 27,
    texture: { baseColor: '#7f8f78', roughness: 0.95, grain: 'none' },
  },
  {
    id: 'lino-negro',
    name: 'Lino negro mate (tapicería y textiles)',
    kind: 'plastic',
    densityKgM3: 350,
    thicknessMM: 2,
    priceEurM2: 27,
    texture: { baseColor: '#232427', roughness: 0.95, grain: 'none' },
  },
  {
    id: 'ceramica',
    name: 'Cerámica esmaltada',
    kind: 'plastic',
    densityKgM3: 2300,
    thicknessMM: 6,
    priceEurM2: 45,
    texture: { baseColor: '#efece6', roughness: 0.3, grain: 'none' },
  },
  {
    id: 'yute',
    name: 'Yute tejido',
    kind: 'plastic',
    densityKgM3: 450,
    thicknessMM: 8,
    priceEurM2: 30,
    texture: { baseColor: '#a88b5e', roughness: 0.95, grain: 'none' },
  },
];

export const DEFAULT_MATERIAL_ID = 'chopo-15mm';

export function findMaterial(id: string): MaterialDef | undefined {
  return MATERIALS_CATALOG.find((material) => material.id === id);
}
