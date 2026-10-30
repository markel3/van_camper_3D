import type { VanSpec } from '../types/camper.types';

// Base chassis (WORKFLOWS.md, Flow 1): generic large panel van, L3 length / H2 roof.
// Exterior fields (overall length, body width, floor height, wheel radius, roof thickness) are
// approximate REFERENCE values for rendering and the roof zone, to be verified against the
// body builder guide of the reference van. Homologated tare L3H2: 2,135 kg.
export const DEFAULT_VAN: VanSpec = {
  id: 'van_l3h2_3700',
  name: 'Furgón grande L3H2 · 3,70 m',
  interiorLengthMM: 3705,
  interiorWidthMM: 1870,
  interiorHeightMM: 1932,
  wheelArchSpacingMM: 1422,
  tareWeightKg: 2135,
  mmaKg: 3500,
  // Wheelbase 4035 mm (official). Rear axle 2695 mm from the bulkhead: consistent with the L3's
  // ≈1015 mm rear overhang and with the wheel openings of the calibrated van-l3h2.glb, so the
  // interior wheel arches (collisions) line up with them. Replaces the old 2600 mm estimate.
  wheelbaseMM: 4035,
  rearAxleZMM: 2695,
  // Official wheel arch envelope: 920 (Z) × 220 (X) × 340 (Y) mm
  wheelArchHeightMM: 340,
  wheelArchLengthMM: 920,
  wheelArchWidthMM: 220,
  bodyStyle: 'van',
  paintColor: '#dfe3e6',
  awning: false,
  overallLengthMM: 5998,
  bodyWidthMM: 2050,
  floorHeightMM: 540,
  wheelRadiusMM: 350,
  roofThicknessMM: 70,
  // Real H2 body (no cab cap): fitted on the axles, see props/van/vanModelFit.ts
  modelUrl: '/models/van-l3h2.glb',
};

// The H2 model must not dress the H3 body: Camper Pro keeps the procedural body
const { modelUrl: _l3h2Model, ...L3_PLATFORM } = DEFAULT_VAN;

// Same L3 platform with the H3 high roof, cab-top cap and side mouldings.
// Interior height 2172 mm and tare are REFERENCE values.
export const CAMPER_PRO_VAN: VanSpec = {
  ...L3_PLATFORM,
  id: 'van_l3h3_camper',
  name: 'Furgón gran volumen H3 · 3,70 m',
  interiorHeightMM: 2172,
  tareWeightKg: 2205,
  bodyStyle: 'camperPro',
  paintColor: '#f3f4f1',
  awning: true,
};

// Other panel vans (chassis menu). REFERENCE values, approximate: interior dimensions, wheelbase,
// MMA and tare from the brief; rear axle, arches, floor height, wheel radius and body width are
// estimates to be verified against the body builder guides. No .glb: procedural body.
const PANEL_VAN_BASE: Omit<VanSpec, 'id' | 'name' | 'paintColor'> = {
  interiorLengthMM: 3270,
  interiorWidthMM: 1780,
  interiorHeightMM: 1940,
  wheelArchSpacingMM: 1300,
  tareWeightKg: 2050,
  mmaKg: 3500,
  wheelbaseMM: 3665,
  rearAxleZMM: 2000,
  wheelArchHeightMM: 340,
  wheelArchLengthMM: 900,
  wheelArchWidthMM: 220,
  bodyStyle: 'van',
  awning: false,
  overallLengthMM: 5932,
  bodyWidthMM: 1993,
  floorHeightMM: 560,
  wheelRadiusMM: 350,
  roofThicknessMM: 70,
};

export const VAN_L2H2_3270: VanSpec = {
  ...PANEL_VAN_BASE,
  id: 'van_l2h2_3270',
  name: 'Furgón medio L2H2 · 3,27 m',
  paintColor: '#b8bcc2',
};

export const VAN_L3H2_3450: VanSpec = {
  ...PANEL_VAN_BASE,
  id: 'van_l3h2_3450',
  name: 'Furgón L3H2 · 3,45 m',
  interiorLengthMM: 3450,
  interiorWidthMM: 1832,
  interiorHeightMM: 1861,
  wheelArchSpacingMM: 1300,
  wheelbaseMM: 3640,
  rearAxleZMM: 1850,
  wheelArchHeightMM: 340,
  floorHeightMM: 530,
  overallLengthMM: 6240,
  paintColor: '#8e939a',
};

export const VAN_L3H2_3490: VanSpec = {
  ...PANEL_VAN_BASE,
  id: 'van_l3h2_3490',
  name: 'Furgón L3H2 · 3,49 m',
  interiorLengthMM: 3494,
  interiorWidthMM: 1784,
  interiorHeightMM: 1886,
  wheelArchSpacingMM: 1100,
  tareWeightKg: 2100,
  wheelbaseMM: 3750,
  rearAxleZMM: 2176,
  wheelArchLengthMM: 880,
  wheelArchWidthMM: 210,
  wheelRadiusMM: 355,
  floorHeightMM: 550,
  bodyWidthMM: 2002,
  overallLengthMM: 6068,
  paintColor: '#1f3a6d',
};

export const VANS_CATALOG: readonly VanSpec[] = [
  DEFAULT_VAN,
  CAMPER_PRO_VAN,
  VAN_L2H2_3270,
  VAN_L3H2_3450,
  VAN_L3H2_3490,
];

// Rear axle estimate used before the .glb calibration; files carrying it get the catalogue value
export const LEGACY_REAR_AXLE_Z_MM = 2600;

// Ids used by older project files
export const LEGACY_VAN_IDS: Readonly<Record<string, string>> = {};

export const findVan = (id: string): VanSpec | undefined => VANS_CATALOG.find((van) => van.id === id);
