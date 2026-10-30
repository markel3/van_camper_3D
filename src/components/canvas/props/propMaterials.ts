import { BackSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three';
import type { CategoryType } from '../../../types/camper.types';
import { findMaterial } from '../../../data/materialsCatalog';
import { getMaterialTextures } from '../../../utils/textureGenerator';
import { getFabricTextures, getSolarCellTexture } from '../../../utils/textures/propTextures';
import { finishMaterials, type FinishKey } from './finishMaterials';

// Flat colour per category, for modules whose material is missing from the catalogue
export const CATEGORY_COLORS: Record<CategoryType, string> = {
  structure: '#c8a27a',
  kitchen: '#e2e8f0',
  bathroom: '#7dd3fc',
  electrical: '#fbbf24',
  water: '#38bdf8',
  openings: '#a5b4fc',
  decor: '#86efac',
};

// Prop materials are shared by every instance and created on first use (textures need the DOM).
// They are never mutated per module: selection and collision tints use per-module clones (canvas/adapt/ItemSkin).
const lazy = <T>(create: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= create());
};

// Fabric tile size on the mattress (ExtrudeGeometry UVs are in metres)
const FABRIC_TILE_M = 0.25;

export const propMaterials = {
  stainless: lazy(() => new MeshStandardMaterial({ color: '#d6dade', metalness: 0.9, roughness: 0.28 })),
  // Inside faces only: a closed box seen through the worktop hole reads as a sink bowl
  stainlessBowl: lazy(
    () => new MeshStandardMaterial({ color: '#c9ced3', metalness: 0.9, roughness: 0.32, side: BackSide }),
  ),
  anodisedFrame: lazy(() => new MeshStandardMaterial({ color: '#c5cad0', metalness: 0.8, roughness: 0.35 })),
  gasket: lazy(() => new MeshStandardMaterial({ color: '#1c1f24', roughness: 0.85 })),
  darkPlastic: lazy(() => new MeshStandardMaterial({ color: '#2a2d31', roughness: 0.45 })),
  whiteAbs: lazy(() => new MeshStandardMaterial({ color: '#e2e4e7', roughness: 0.5 })),
  // Glass-covered cells: low-roughness clearcoat over a matte cell texture
  solarCells: lazy(
    () =>
      new MeshPhysicalMaterial({
        map: getSolarCellTexture(),
        roughness: 0.35,
        metalness: 0.15,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
      }),
  ),
  // Smoked polycarbonate. Plain alpha blending, not `transmission`: transmission makes three.js
  // render the opaque scene again into a texture every frame while one is visible, which is a
  // full extra pass for a 40 cm part. Opacity + clearcoat reads as tinted plastic at a fraction.
  smokedDome: lazy(
    () =>
      new MeshPhysicalMaterial({
        color: '#4b5563',
        transparent: true,
        opacity: 0.55,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        depthWrite: false,
      }),
  ),
  // LiFePO4 battery: anthracite case, near-black lid, terminal boots and a dim backlit LCD
  batteryCase: lazy(() => new MeshStandardMaterial({ color: '#30353b', roughness: 0.62 })),
  batteryLid: lazy(() => new MeshStandardMaterial({ color: '#16181b', roughness: 0.5 })),
  terminalRed: lazy(() => new MeshStandardMaterial({ color: '#c62828', roughness: 0.45 })),
  terminalBlack: lazy(() => new MeshStandardMaterial({ color: '#0e0f11', roughness: 0.45 })),
  lcd: lazy(
    () => new MeshStandardMaterial({ color: '#0b1a24', roughness: 0.15, emissive: '#22b8e6', emissiveIntensity: 0.35 }),
  ),
  // Natural (translucent off-white) polyethylene: the water inside shows through. depthWrite stays
  // off so the water volume behind the shell is never hidden by sort order.
  tankShell: lazy(
    () =>
      new MeshPhysicalMaterial({
        color: '#eef3f5',
        roughness: 0.55,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
  ),
  tankWater: lazy(() => new MeshStandardMaterial({ color: '#3b9fd8', roughness: 0.2, transparent: true, opacity: 0.85 })),
  tankCap: lazy(() => new MeshStandardMaterial({ color: '#1f5fa8', roughness: 0.5 })),
  // Grey-water tank: opaque dark grey polyethylene with a black cap
  greyTankShell: lazy(() => new MeshStandardMaterial({ color: '#4a4f56', roughness: 0.7 })),
  blackCap: lazy(() => new MeshStandardMaterial({ color: '#141518', roughness: 0.55 })),
  // Shower cabin: glossy, waterproof light liner inside the cabin
  showerLiner: lazy(() => new MeshPhysicalMaterial({ color: '#f4f6f7', roughness: 0.18, clearcoat: 0.6 })),
  chrome: lazy(() => new MeshStandardMaterial({ color: '#e6e9ec', metalness: 1, roughness: 0.12 })),
  // Plumbing: hot (red) and cold (blue) lines, pump body
  pipeRed: lazy(() => new MeshStandardMaterial({ color: '#d32f2f', roughness: 0.4 })),
  pipeBlue: lazy(() => new MeshStandardMaterial({ color: '#1e6fd9', roughness: 0.4 })),
  pumpGrey: lazy(() => new MeshStandardMaterial({ color: '#8a9097', roughness: 0.5, metalness: 0.2 })),
  // Inverter: technical blue case (Victron style), status LEDs, light label panel
  inverterBlue: lazy(() => new MeshStandardMaterial({ color: '#0d5fa6', roughness: 0.42, metalness: 0.25 })),
  statusLed: lazy(() => new MeshStandardMaterial({ color: '#1f7a3a', emissive: '#22c55e', emissiveIntensity: 1.2 })),
  labelPanel: lazy(() => new MeshStandardMaterial({ color: '#d9dee3', roughness: 0.6 })),
  // Warm 3000 K LED strip (diffuser lit / off)
  ledWarmOn: lazy(() => new MeshStandardMaterial({ color: '#ffd7a8', emissive: '#ffb46b', emissiveIntensity: 2.2 })),
  ledOff: lazy(() => new MeshStandardMaterial({ color: '#e8e4dc', roughness: 0.4 })),
  mattress: lazy(() => {
    const { map, normalMap } = getFabricTextures();
    map.repeat.set(1 / FABRIC_TILE_M, 1 / FABRIC_TILE_M);
    normalMap.repeat.copy(map.repeat);
    return new MeshStandardMaterial({ map, normalMap, normalScale: new Vector2(0.8, 0.8), roughness: 0.95 });
  }),
};

const surfaceCache = new Map<string, MeshStandardMaterial>();

// Catalogue materials drawn with a photographic PBR set instead of the procedural texture.
// The rest (laminates, plastics, metals) keep their procedural look.
const PHOTO_SURFACES: Readonly<Record<string, FinishKey>> = {
  'roble-18mm': 'oak',
  'roble-salvia': 'oak',
  'chopo-15mm': 'oakLight',
  'chopo-18mm': 'oakLight',
  'pino-macizo': 'pine',
  'lino-natural': 'linenBeige',
  'ceramica': 'ceramicWhite',
  'yute': 'jute',
};

// Board/sheet material of the module (Inspector selection) with its PBR textures, shared per id.
// Parts using it need metric UVs (createMetricBoxGeometry). Unknown ids get a flat category colour.
export function getSurfaceMaterial(materialId: string, category: CategoryType): MeshStandardMaterial {
  const photo = PHOTO_SURFACES[materialId];
  if (photo) return finishMaterials[photo]();
  const material = findMaterial(materialId);
  const key = material ? material.id : `flat:${category}`;
  const cached = surfaceCache.get(key);
  if (cached) return cached;
  let created: MeshStandardMaterial;
  if (material) {
    const textures = getMaterialTextures(material);
    created = new MeshStandardMaterial({
      map: textures.map,
      normalMap: textures.normalMap,
      roughnessMap: textures.roughnessMap,
      roughness: 1,
      metalness: textures.metalness,
    });
  } else {
    created = new MeshStandardMaterial({ color: CATEGORY_COLORS[category], roughness: 0.7 });
  }
  surfaceCache.set(key, created);
  return created;
}

// Cabinet finish split by part: carcass boards, door/drawer fronts, worktop and solid-wood
// accents (edges, pulls). Only 'roble-salvia' differs per part (oak + sage fronts); any other
// board material is used for every part, so the Inspector selection still drives the look.
export interface CabinetFinish {
  carcass: MeshStandardMaterial;
  front: MeshStandardMaterial;
  top: MeshStandardMaterial;
  accent: MeshStandardMaterial;
}

export function getCabinetFinish(materialId: string, category: CategoryType): CabinetFinish {
  if (materialId === 'roble-salvia') {
    const oak = finishMaterials.oak();
    return { carcass: oak, front: finishMaterials.sage(), top: oak, accent: oak };
  }
  const board = getSurfaceMaterial(materialId, category);
  return { carcass: board, front: board, top: board, accent: finishMaterials.oak() };
}

const textileCache = new Map<string, MeshStandardMaterial>();

// Soft-furnishing fabric (cushions) for the selected textile id; null keeps the prop's default
// beige + grey linen pair. Colour comes from the catalogue entry.
export function getTextileFinish(materialId: string): MeshStandardMaterial | null {
  if (materialId === 'lino-natural') return null;
  const material = findMaterial(materialId);
  if (!material) return null;
  let fabric = textileCache.get(materialId);
  if (!fabric) {
    fabric = new MeshStandardMaterial({ color: material.texture.baseColor, roughness: 0.95 });
    textileCache.set(materialId, fabric);
  }
  return fabric;
}
