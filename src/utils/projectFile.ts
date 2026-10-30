import {
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_VERSION,
  type CamperItem,
  type CategoryType,
  type InsulationMaterialId,
  type ProjectContent,
  type ProjectFile,
  type VanInteriorFinish,
  type VanBodyStyle,
  type VanSpec,
} from '../types/camper.types';
import { DEFAULT_VAN, LEGACY_REAR_AXLE_Z_MM, LEGACY_VAN_IDS, findVan } from '../data/vansCatalog';
import { CEILING_FINISHES, DEFAULT_INTERIOR_FINISH, FLOOR_FINISHES, WALL_FINISHES } from '../data/interiorFinish';
import { INSULATION_MATERIALS, findInsulation } from '../data/insulationCatalog';
import { isRoofMounted } from './roofMount';
import { roofTopY } from './vanLayout';

// Serialization and strict validation of .camper.json documents. Parsing never trusts the file:
// every field is checked and rebuilt, so unknown keys are dropped and nothing untyped reaches the store.

export const PROJECT_FILE_EXTENSION = '.camper.json';

// User-facing message (Spanish UI) explaining why a file was rejected
export class ProjectFileError extends Error {}

type Json = Record<string, unknown>;

const CATEGORIES: readonly CategoryType[] = ['structure', 'kitchen', 'bathroom', 'electrical', 'water', 'openings', 'decor'];
const VAN_NUMBER_KEYS = [
  'interiorLengthMM',
  'interiorWidthMM',
  'interiorHeightMM',
  'wheelArchSpacingMM',
  'tareWeightKg',
  'mmaKg',
  'wheelbaseMM',
  'rearAxleZMM',
  'wheelArchHeightMM',
  'wheelArchLengthMM',
  'wheelArchWidthMM',
] as const satisfies readonly (keyof VanSpec)[];
// Added with the exterior body: optional in files, defaulted from the matching catalogue van
const VAN_OPTIONAL_NUMBER_KEYS = [
  'overallLengthMM',
  'bodyWidthMM',
  'floorHeightMM',
  'wheelRadiusMM',
  'roofThicknessMM',
] as const satisfies readonly (keyof VanSpec)[];
const BODY_STYLES: readonly VanBodyStyle[] = ['van', 'camperPro'];

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function fail(path: string, expected: string): never {
  throw new ProjectFileError(`Campo «${path}» no válido: se esperaba ${expected}.`);
}

function record(value: unknown, path: string): Json {
  return isRecord(value) ? value : fail(path, 'un objeto');
}
function num(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(path, 'un número');
}
function str(value: unknown, path: string): string {
  return typeof value === 'string' ? value : fail(path, 'un texto');
}
function bool(value: unknown, path: string): boolean {
  return typeof value === 'boolean' ? value : fail(path, 'verdadero/falso');
}
function optionalNum(value: unknown, path: string): number | undefined {
  return value === undefined ? undefined : num(value, path);
}

function vector(value: unknown, path: string): CamperItem['position'] {
  const v = record(value, path);
  return { x: num(v.x, `${path}.x`), y: num(v.y, `${path}.y`), z: num(v.z, `${path}.z`) };
}

// Strict for every present field; fields added after version 1 fall back to the catalogue van with
// the same id (or the default van). Legacy ids are renamed to their current catalogue id.
function parseVan(value: unknown): VanSpec {
  const v = record(value, 'van');
  const rawId = str(v.id, 'van.id');
  const legacyId = LEGACY_VAN_IDS[rawId];
  const id = legacyId ?? rawId;
  const base = findVan(id) ?? DEFAULT_VAN;
  const name = str(v.name, 'van.name');
  // Ids no longer in the catalogue (renamed vans) take the default van's id and name
  const known = findVan(id) !== undefined;
  const van: VanSpec = { ...base, id: known ? id : base.id, name: legacyId || !known ? base.name : name };
  for (const key of VAN_NUMBER_KEYS) van[key] = num(v[key], `van.${key}`);
  for (const key of VAN_OPTIONAL_NUMBER_KEYS) van[key] = optionalNum(v[key], `van.${key}`) ?? base[key];
  // The obsolete rear axle estimate is upgraded, so old files' wheel arches match the model
  if (van.rearAxleZMM === LEGACY_REAR_AXLE_Z_MM) van.rearAxleZMM = base.rearAxleZMM;

  if (v.bodyStyle !== undefined) {
    const style = str(v.bodyStyle, 'van.bodyStyle');
    if (!BODY_STYLES.includes(style as VanBodyStyle)) fail('van.bodyStyle', BODY_STYLES.join(' | '));
    van.bodyStyle = style as VanBodyStyle;
  }
  if (v.paintColor !== undefined) van.paintColor = str(v.paintColor, 'van.paintColor');
  if (v.awning !== undefined) van.awning = bool(v.awning, 'van.awning');
  if (v.modelUrl !== undefined) van.modelUrl = str(v.modelUrl, 'van.modelUrl');
  return van;
}

// Roof modules from files saved before the exterior roof existed hung under the ceiling:
// seat any roof module found below the roof face on top of it.
function seatRoofItems(van: VanSpec, items: CamperItem[]): CamperItem[] {
  const top = roofTopY(van);
  return items.map((item) =>
    isRoofMounted(item.catalogId) && item.position.y < top - 1e-6
      ? { ...item, position: { ...item.position, y: top } }
      : item,
  );
}

function parseItem(value: unknown, index: number): CamperItem {
  const path = `items[${index}]`;
  const v = record(value, path);
  const category = str(v.category, `${path}.category`);
  if (!CATEGORIES.includes(category as CategoryType)) fail(`${path}.category`, CATEGORIES.join(' | '));
  const d = record(v.dimensions, `${path}.dimensions`);
  const dimensions = {
    width: num(d.width, `${path}.dimensions.width`),
    height: num(d.height, `${path}.dimensions.height`),
    depth: num(d.depth, `${path}.dimensions.depth`),
  };
  if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.depth <= 0) {
    fail(`${path}.dimensions`, 'medidas mayores que 0');
  }

  const item: CamperItem = {
    id: str(v.id, `${path}.id`),
    catalogId: str(v.catalogId, `${path}.catalogId`),
    name: str(v.name, `${path}.name`),
    category: category as CategoryType,
    position: vector(v.position, `${path}.position`),
    rotation: vector(v.rotation, `${path}.rotation`),
    dimensions,
    parametric: bool(v.parametric, `${path}.parametric`),
    weightKg: num(v.weightKg, `${path}.weightKg`),
    priceEur: num(v.priceEur, `${path}.priceEur`),
    materialId: str(v.materialId, `${path}.materialId`),
    locked: bool(v.locked, `${path}.locked`),
    visible: bool(v.visible, `${path}.visible`),
  };
  if (item.position.y < 0) fail(`${path}.position.y`, 'un valor ≥ 0');
  if (v.isOpen !== undefined) item.isOpen = bool(v.isOpen, `${path}.isOpen`);
  if (v.adaptToFit === false) item.adaptToFit = false;
  else if (v.adaptToFit !== undefined) bool(v.adaptToFit, `${path}.adaptToFit`);

  if (v.electricalSpecs !== undefined) {
    const e = record(v.electricalSpecs, `${path}.electricalSpecs`);
    item.electricalSpecs = {
      batteryCapacityAh: optionalNum(e.batteryCapacityAh, `${path}.electricalSpecs.batteryCapacityAh`),
      solarWatts: optionalNum(e.solarWatts, `${path}.electricalSpecs.solarWatts`),
      dailyConsumptionWh: optionalNum(e.dailyConsumptionWh, `${path}.electricalSpecs.dailyConsumptionWh`),
    };
  }
  if (v.waterSpecs !== undefined) {
    const w = record(v.waterSpecs, `${path}.waterSpecs`);
    item.waterSpecs = {
      cleanWaterLiters: optionalNum(w.cleanWaterLiters, `${path}.waterSpecs.cleanWaterLiters`),
      greyWaterLiters: optionalNum(w.greyWaterLiters, `${path}.waterSpecs.greyWaterLiters`),
    };
  }
  return item;
}

// One of the allowed option ids, or the default when the file predates the field
function option<T extends string>(value: unknown, path: string, options: readonly { id: T }[], fallback: T): T {
  if (value === undefined) return fallback;
  const id = str(value, path);
  return options.find((entry) => entry.id === id)?.id ?? fail(path, options.map((entry) => entry.id).join(' | '));
}

function parseInteriorFinish(value: unknown): VanInteriorFinish {
  if (value === undefined) return { ...DEFAULT_INTERIOR_FINISH };
  const v = record(value, 'interiorFinish');
  const base = DEFAULT_INTERIOR_FINISH;
  return {
    ceiling: option(v.ceiling, 'interiorFinish.ceiling', CEILING_FINISHES, base.ceiling),
    floor: option(v.floor, 'interiorFinish.floor', FLOOR_FINISHES, base.floor),
    walls: option(v.walls, 'interiorFinish.walls', WALL_FINISHES, base.walls),
    ledStrips: v.ledStrips === undefined ? base.ledStrips : bool(v.ledStrips, 'interiorFinish.ledStrips'),
    insulation: parseInsulation(v.insulation),
  };
}

// Known material ids only, de-duplicated; files saved before insulation existed have none
function parseInsulation(value: unknown): InsulationMaterialId[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail('interiorFinish.insulation', 'una lista');
  const expected = INSULATION_MATERIALS.map((material) => material.id).join(' | ');
  const ids = value.map((entry, index) => {
    const path = `interiorFinish.insulation[${index}]`;
    const id = str(entry, path);
    return findInsulation(id)?.id ?? fail(path, expected);
  });
  return [...new Set(ids)];
}

export function serializeProject({ van, items, interiorFinish }: Readonly<ProjectContent>, savedAt = new Date()): string {
  const document: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    savedAt: savedAt.toISOString(),
    van,
    items: items.map(({ hasCollision: _derived, ...item }) => item),
    interiorFinish,
  };
  return JSON.stringify(document, null, 2);
}

export function parseProject(text: string): ProjectContent {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ProjectFileError('El archivo no es un JSON válido.');
  }
  const root = record(raw, 'raíz');
  if (root.format !== PROJECT_FILE_FORMAT) throw new ProjectFileError('No es un proyecto de CamperStudio 3D.');
  if (root.version !== PROJECT_FILE_VERSION) {
    throw new ProjectFileError(`Versión de archivo no compatible (${String(root.version)}).`);
  }
  if (!Array.isArray(root.items)) fail('items', 'una lista');

  const van = parseVan(root.van);
  const items = root.items.map(parseItem);
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new ProjectFileError('El archivo contiene módulos con identificadores duplicados.');
  }
  return { van, items: seatRoofItems(van, items), interiorFinish: parseInteriorFinish(root.interiorFinish) };
}

// File name such as "van_l3h2_3700-2026-10-15.camper.json"
export function projectFileName(van: VanSpec, date = new Date()): string {
  return `${van.id}-${date.toISOString().slice(0, 10)}${PROJECT_FILE_EXTENSION}`;
}
