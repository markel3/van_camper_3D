import { BackSide, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Texture } from 'three';
import { getPbrTextures, type PbrTextureSet } from '../../../utils/textures/pbrTextures';
import { getInductionHobTexture } from '../../../utils/textures/propTextures';

// Photographic finishes of the furniture and decoration props (CC0 sets from Poly Haven in
// public/textures/furn-* and decor-*, see public/models/decor/CREDITS.md). Every material is
// created once on first use and shared by all instances. Parts using them need metric UVs
// (createMetricBoxGeometry, createBevelBox, createCushion…).

const lazy = <T>(create: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= create());
};

interface SetDef {
  sizeM: number; // real-world size of one tile
  rotate?: boolean; // turn the grain/weave a quarter (oak-light has its grain along U)
}

const SETS: Record<string, SetDef> = {
  'furn-oak': { sizeM: 1.83 },
  'furn-oak-light': { sizeM: 1.0, rotate: true },
  'furn-linen': { sizeM: 0.27 },
  'furn-cotton': { sizeM: 0.26 },
  'decor-jute': { sizeM: 0.27 },
};

// Metric repeat (+ optional quarter turn) of a shared set; clones share the GPU images
function metricSet(setId: string, scale = 1): PbrTextureSet {
  const def = SETS[setId] ?? { sizeM: 1 };
  const base = getPbrTextures(setId, { sizeM: def.sizeM });
  const repeat = 1 / (def.sizeM * scale);
  // Clones share the image. A clone must be flagged for upload once, but only when the image has
  // arrived (flagging it while loading makes three.js warn every frame)
  const clone = (texture: Texture): Texture => {
    const copy = texture.clone();
    copy.repeat.set(repeat, repeat);
    if (def.rotate) copy.rotation = Math.PI / 2;
    const flag = () => {
      if (copy.image) copy.needsUpdate = true;
      else requestAnimationFrame(flag);
    };
    flag();
    return copy;
  };
  return { ...base, map: clone(base.map), normalMap: clone(base.normalMap), roughnessMap: clone(base.roughnessMap) };
}

interface PbrOptions {
  color?: string;
  // Brightness factor on top of the tint (photographic albedos are a little dark for interiors)
  gain?: number;
  normalScale?: number;
  roughness?: number; // multiplies the roughness map
  scale?: number; // tile size multiplier
  sheen?: boolean; // fabrics: soft rim highlight
  side?: typeof DoubleSide;
}

function pbr(setId: string, options: PbrOptions = {}): MeshStandardMaterial {
  const set = metricSet(setId, options.scale);
  const color = new Color(options.color ?? '#ffffff').multiplyScalar(options.gain ?? 1);
  const common = {
    color,
    map: set.map,
    normalMap: set.normalMap,
    normalScale: new Vector2(options.normalScale ?? 1, options.normalScale ?? 1),
    roughnessMap: set.roughnessMap,
    roughness: options.roughness ?? 1,
    metalness: 0,
    ...(options.side !== undefined ? { side: options.side } : {}),
  };
  if (options.sheen) {
    return new MeshPhysicalMaterial({ ...common, sheen: 0.35, sheenRoughness: 0.8, sheenColor: color.clone() });
  }
  return new MeshStandardMaterial(common);
}

export const finishMaterials = {
  // Natural light oak (honey tone): worktops, frames, edges, pulls
  oak: lazy(() => pbr('furn-oak', { color: '#ffe6c4', gain: 1.15, roughness: 0.9 })),
  // Paler oak/poplar veneer for carcasses and plywood boards
  oakLight: lazy(() => pbr('furn-oak-light', { color: '#f7e7cf', gain: 1.0, roughness: 0.95 })),
  // Pine: warmer tint over the pale veneer
  pine: lazy(() => pbr('furn-oak-light', { color: '#f2cf9c', gain: 1.0 })),
  // Sage green matte lacquer (fronts). The faint oak normal reads as the grain under the paint.
  sage: lazy(() => {
    const set = metricSet('furn-oak-light');
    return new MeshPhysicalMaterial({
      color: '#7f8f78',
      normalMap: set.normalMap,
      normalScale: new Vector2(0.15, 0.15),
      roughness: 0.62,
      clearcoat: 0.08,
      clearcoatRoughness: 0.5,
    });
  }),
  // Linen upholstery: grey-beige (seat), warm beige (cushions)
  linenGrey: lazy(() => pbr('furn-linen', { color: '#8e887d', normalScale: 1.4, sheen: true })),
  linenBeige: lazy(() => pbr('furn-linen', { color: '#c4b59b', normalScale: 1.4, sheen: true })),
  // Bedding: cream cotton duvet and sheet (double-sided: the duvet is a single draped sheet)
  duvet: lazy(() =>
    pbr('furn-linen', { color: '#ddd2bf', normalScale: 1.6, sheen: true, scale: 1.3, side: DoubleSide }),
  ),
  sheet: lazy(() => pbr('furn-cotton', { color: '#ffffff', gain: 1.18, sheen: true })),
  mattressCover: lazy(() => pbr('furn-cotton', { color: '#f1ede5', gain: 1.2, sheen: true })),
  jute: lazy(() => pbr('decor-jute', { color: '#e8c690', gain: 1.0, normalScale: 2, scale: 0.8 })),
  // Matte black: tap, handles, straps, LED cable
  matteBlack: lazy(() => new MeshStandardMaterial({ color: '#1b1b1c', roughness: 0.55, metalness: 0.35 })),
  // Black granite composite sink, inner faces only (seen through the worktop cut-out)
  graniteSink: lazy(
    () => new MeshStandardMaterial({ color: '#232325', roughness: 0.7, side: BackSide }),
  ),
  graniteRim: lazy(() => new MeshStandardMaterial({ color: '#232325', roughness: 0.7 })),
  // Induction hob: black glass with printed cooking zones
  blackGlass: lazy(
    () =>
      new MeshPhysicalMaterial({
        color: '#ffffff',
        map: getInductionHobTexture(),
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
  ),
  brushedSteel: lazy(() => new MeshStandardMaterial({ color: '#c9cdd1', metalness: 0.9, roughness: 0.38 })),
  darkSteel: lazy(() => new MeshStandardMaterial({ color: '#5d6267', metalness: 0.75, roughness: 0.42 })),
  // Glazed ceramic (mugs, planters)
  ceramicWhite: lazy(
    () => new MeshPhysicalMaterial({ color: '#f1eee8', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  ),
  ceramicSage: lazy(
    () => new MeshPhysicalMaterial({ color: '#8d9a86', roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  ),
  terracotta: lazy(() => new MeshStandardMaterial({ color: '#b86b4b', roughness: 0.85 })),
  glass: lazy(
    () =>
      new MeshPhysicalMaterial({
        color: '#dfe7ea',
        roughness: 0.05,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
  ),
  coffee: lazy(() => new MeshStandardMaterial({ color: '#2a1a12', roughness: 0.25 })),
  // Natural cotton rope (macramé)
  rope: lazy(() => new MeshStandardMaterial({ color: '#e8dfcc', roughness: 0.95 })),
  leaf: lazy(() => new MeshStandardMaterial({ color: '#3f6b35', roughness: 0.6, side: DoubleSide })),
  leafLight: lazy(() => new MeshStandardMaterial({ color: '#5b8a45', roughness: 0.6, side: DoubleSide })),
  soil: lazy(() => new MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 })),
  // Surfboard: glossy resin-coated white deck, stringer and a coloured rail band
  resinWhite: lazy(
    () => new MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
  ),
  resinTeal: lazy(
    () => new MeshPhysicalMaterial({ color: '#4f8f8a', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
  ),
  // Warm 2700 K bulb: emissive intensity is driven per frame by the LED controls
  bulbWarm: lazy(
    () => new MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffb35c', emissiveIntensity: 2, roughness: 0.3 }),
  ),
  // Warm LED strip diffuser (overhead cabinets); intensity follows the lighting mood
  ledStrip: lazy(
    () => new MeshStandardMaterial({ color: '#ffe2bd', emissive: '#ffb469', emissiveIntensity: 1, roughness: 0.4 }),
  ),
  cable: lazy(() => new MeshStandardMaterial({ color: '#2a2622', roughness: 0.6 })),
};

export type FinishKey = keyof typeof finishMaterials;
