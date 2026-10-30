// Central domain data model (see ARCHITECTURE.md §4).
// No domain type may be defined outside src/types/ (fit adaptations: adaptation.types.ts).

// 'decor': soft furnishings and props (plants, cushions, rugs, kitchenware), drawn on the 'decor' layer
export type CategoryType = 'structure' | 'kitchen' | 'bathroom' | 'electrical' | 'water' | 'openings' | 'decor';

export interface Vector3Tuple {
  x: number; // metres
  y: number; // metres
  z: number; // metres
}

export interface DimensionsMM {
  width: number; // X axis, mm
  height: number; // Y axis, mm
  depth: number; // Z axis, mm
}

export interface CamperItem {
  id: string;
  catalogId: string;
  name: string;
  category: CategoryType;
  position: Vector3Tuple;
  rotation: Vector3Tuple; // radians
  dimensions: DimensionsMM;
  parametric: boolean; // Whether width/height/depth can be changed
  weightKg: number; // Base weight or weight calculated from volume
  priceEur: number;
  materialId: string;
  electricalSpecs?: {
    batteryCapacityAh?: number;
    solarWatts?: number;
    dailyConsumptionWh?: number;
  };
  waterSpecs?: {
    cleanWaterLiters?: number;
    greyWaterLiters?: number;
  };
  locked: boolean;
  visible: boolean;
  hasCollision?: boolean;
  // Doors, lids and drawers drawn open (articulated modules only). Visual check of the aisle:
  // collisions always use the closed shape.
  isOpen?: boolean;
  // Fit adaptation opt-out (utils/fitAdaptation.ts): false = rigid box (no wheel-arch notch, no
  // nesting). Undefined = adapts (default); only `false` is ever stored.
  adaptToFit?: boolean;
}

// Selectable base chassis (see data/vansCatalog.ts and WORKFLOWS.md, Flow 1)
export interface VanSpec {
  id: string;
  name: string;
  interiorLengthMM: number;
  interiorWidthMM: number;
  interiorHeightMM: number;
  wheelArchSpacingMM: number;
  tareWeightKg: number;
  mmaKg: number;
  wheelbaseMM: number; // wheelbase: distance between axles
  rearAxleZMM: number; // distance from the bulkhead (Z = 0) to the rear axle
  wheelArchHeightMM: number; // wheel arch height above the cargo floor
  wheelArchLengthMM: number; // wheel arch length along Z, centered on the rear axle
  wheelArchWidthMM: number; // wheel arch width along X, measured inward from each side wall
  // Exterior body (rendering, roof zone). Approximate REFERENCE values, see data/vansCatalog.ts
  bodyStyle: VanBodyStyle;
  paintColor: string; // hex
  awning: boolean; // side awning cassette (Camper Pro only)
  modelUrl?: string; // optional .glb replacing the procedural body
  overallLengthMM: number;
  bodyWidthMM: number; // exterior width without mirrors
  floorHeightMM: number; // cargo floor above the ground
  wheelRadiusMM: number;
  roofThicknessMM: number; // roof skin + insulation; roof modules sit on top of it
}

export type VanBodyStyle = 'van' | 'camperPro';

// Why a module is flagged (WORKFLOWS.md, Flow 3)
export type CollisionReason = 'item' | 'bounds' | 'wheelArch';

// Grid snap step in mm (WORKFLOWS.md, Flow 3)
export type SnapStepMM = 10 | 50;

// Catalogue definition of a module: describes the product, without the instance
// (id, position, rotation, state). See data/itemsCatalog.ts
export type CatalogItemDef = Omit<
  CamperItem,
  'id' | 'position' | 'rotation' | 'locked' | 'visible' | 'hasCollision' | 'isOpen' | 'adaptToFit'
> & {
  // 'roof': mounted on the exterior roof (roof zone collisions, re-seated when the van changes).
  // 'overhead': inserted against the ceiling (Y = interior height − module height).
  // Catalogue-only like modelUrl: derived by catalogId, never stored on CamperItem.
  mount?: 'floor' | 'roof' | 'overhead';
  // Has doors, a lid or drawers that the Inspector can open (CamperItem.isOpen). Catalogue-only.
  articulated?: boolean;
  // Optional 3D model, served from public/models (e.g. '/models/fridge-65l.glb'). It is scaled to
  // fill the module's box; without it (or if it fails to load) the textured box is drawn.
  // Catalogue-only: resolved by catalogId at render time, never copied into CamperItem or saved.
  modelUrl?: string;
};

// Lateral weight split (WORKFLOWS.md, Flow 5.2)
export interface LateralBalance {
  leftKg: number;
  rightKg: number;
  leftPct: number; // 0-100, driver side (-X)
  rightPct: number; // 0-100, passenger side (+X)
  isBalanced: boolean; // leftPct within the 45%-55% range
}

// Axle split (front vs. rear)
export interface LongitudinalBalance {
  frontKg: number;
  rearKg: number;
  frontPct: number; // may fall outside 0-100 if the CoG lies outside the axles
  rearPct: number;
}

// MMA usage status (WORKFLOWS.md, 5.1): amber > 90 %, red > 100 %
export type MmaStatus = 'ok' | 'warning' | 'critical';

// Energy balance for batteries (Ah) and solar (W)
export interface EnergyBalance {
  batteryAh: number;
  usableAh: number;
  solarWatts: number;
  dailyConsumptionWh: number;
  dailyConsumptionAh: number;
  autonomyDays: number | null; // null when no consumption is declared
}

// Derived project metrics, recomputed when items or the chassis change
export interface EngineeringMetrics {
  totalMassKg: number;
  mmaPct: number;
  mmaStatus: MmaStatus;
  cog: Vector3Tuple | null;
  lateral: LateralBalance;
  longitudinal: LongitudinalBalance;
  budgetEur: number;
  energy: EnergyBalance;
}

// Decorative lining of the cargo box (Interior menu). Purely visual: drawn just outside the
// collision box or as thin layers, so it never changes collisions, mass or clearances.
export type CeilingFinish = 'bare' | 'woodSlats';
export type FloorFinish = 'bare' | 'oak' | 'pine';
export type WallFinish = 'bare' | 'warmWood' | 'lightWood' | 'offWhite';

export interface VanInteriorFinish {
  ceiling: CeilingFinish;
  floor: FloorFinish;
  walls: WallFinish;
  // Warm 3000 K LED lighting: two strips along the ceiling and under-cabinet strips
  ledStrips: boolean;
  // Thermal/acoustic layers applied to the bare shell (walls, roof, floor), innermost last.
  // Empty = bare metal. Counted in mass and budget by area (data/insulationCatalog.ts).
  insulation: InsulationMaterialId[];
}

// ---- Insulation (workflow phase 2) ----
export type InsulationMaterialId = 'kaiflex-19' | 'kaiflex-10' | 'rockwool-50' | 'alu-tape' | 'vapor-barrier'
  | 'alu-bubble' | 'thermal-felt';

export interface InsulationMaterialDef {
  id: InsulationMaterialId;
  name: string; // Spanish display name
  kind: 'closedCellFoam' | 'mineralWool' | 'tape' | 'barrier' | 'reflective' | 'felt';
  thicknessMM: number;
  massKgM2: number; // installed mass per m² of covered surface
  priceEurM2: number; // reference price per m² (tape: per m² of equivalent coverage)
  lambdaWmK: number | null; // thermal conductivity; null for tapes and barriers
  color: string; // hex, used by the 3D layer and the catalogue swatch
}

// ---- Workflow and scene layers (UI state, never saved) ----
// The five design phases of the bottom stepper. Each phase applies a preset of layers and view toggles.
export type WorkflowPhase = 'model' | 'insulation' | 'systems' | 'furniture' | 'decor';
// Visibility groups of the Layers panel. 'structure' = interior lining (walls, ceiling, floor finish).
export type SceneLayerId = 'structure' | 'insulation' | 'systems' | 'furniture' | 'decor';

// Installation networks (water pipes, electrical cables) routed automatically between modules.
// Derived data: recomputed from the project, never stored or saved.
export type SystemNetworkId = 'coldWater' | 'hotWater' | 'greyWater' | 'solar' | 'dc12v' | 'ac230v';
export type SystemKind = 'water' | 'electrical';

export interface SystemRoute {
  id: string;
  network: SystemNetworkId;
  fromItemId: string;
  toItemId: string; // a module id, or a synthetic target such as 'led-strips'
  label: string; // Spanish, e.g. 'Depósito → Bomba'
  points: Vector3Tuple[]; // van space, metres (polyline corners, first = source port, last = target port)
  lengthM: number;
}

export interface SystemNetworkSummary {
  network: SystemNetworkId;
  kind: SystemKind;
  label: string; // Spanish, e.g. 'Agua fría'
  color: string; // hex
  sizeLabel: string; // e.g. 'Ø12 mm' or '6 mm²'
  totalLengthM: number;
  routeCount: number;
}

export interface SystemRoutes {
  routes: SystemRoute[];
  networks: SystemNetworkSummary[]; // always all 6 networks, in display order
  waterTotalM: number;
  electricalTotalM: number;
}

// Everything a project file carries, as loaded into the store
export interface ProjectContent {
  van: VanSpec;
  items: CamperItem[];
  interiorFinish: VanInteriorFinish;
}

// On-disk project document (.camper.json). hasCollision is derived state and is never saved.
export const PROJECT_FILE_FORMAT = 'camperstudio-project';
export const PROJECT_FILE_VERSION = 1;

export interface ProjectFile {
  format: typeof PROJECT_FILE_FORMAT;
  version: typeof PROJECT_FILE_VERSION;
  savedAt: string; // ISO 8601
  van: VanSpec;
  items: Omit<CamperItem, 'hasCollision'>[];
  interiorFinish?: VanInteriorFinish; // optional: files saved before the Interior menu have none
}

// Board or sheet material used by modules (data/materialsCatalog.ts). Densities and prices are
// reference values, to be verified against supplier data sheets.
export interface MaterialDef {
  id: string;
  name: string; // Spanish display name
  kind: 'plywood' | 'solidWood' | 'laminate' | 'metal' | 'plastic' | 'composite';
  densityKgM3: number;
  thicknessMM: number; // default board thickness
  priceEurM2: number; // reference price per m² of finished sheet
  texture: {
    baseColor: string; // hex
    roughness: number; // 0-1
    grain: 'none' | 'fine' | 'medium' | 'strong';
  };
}
