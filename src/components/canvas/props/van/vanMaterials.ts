import { useEffect, useMemo } from 'react';
import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three';

const lazy = <T>(create: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= create());
};

// Metal flakes reflect a share of the light as coloured specular: a metallic paint's base albedo is
// darker than its catalogue swatch (linear scale), so a white/silver spec reads as metallic silver
const PAINT_ALBEDO_SCALE = 0.62;

// Automotive metallic paint: metal flake base under a glossy clearcoat that mirrors the studio
// HDRI soft boxes. Light colours read as metallic silver-grey in the dark studio.
export function createPaintMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    name: 'VanPaint',
    color: new Color(color).multiplyScalar(PAINT_ALBEDO_SCALE),
    metalness: 0.6,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
}

// Tinted privacy glazing: dark, glossy and see-through enough to hint the cab. No `transmission`
// on purpose (it would render the whole scene a second time every frame).
const createGlass = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanGlass',
    color: '#0a0e13',
    roughness: 0.03,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    transparent: true,
    opacity: 0.72,
    side: DoubleSide,
  });

const createTyre = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanTyre',
    color: '#0e0f10',
    roughness: 0.86,
    metalness: 0,
    // Faint rubber sheen on the sidewalls
    sheen: 0.4,
    sheenRoughness: 0.8,
    sheenColor: new Color('#3a3d42'),
  });

// Brushed alloy rim
const createRim = (): MeshStandardMaterial =>
  new MeshStandardMaterial({ name: 'VanRim', color: '#b9bec5', metalness: 1, roughness: 0.32 });

const createBlackPlastic = (): MeshStandardMaterial =>
  new MeshStandardMaterial({ name: 'VanBlackPlastic', color: '#141518', roughness: 0.62 });

// Glossy dark trim (grille, door handles)
const createDarkTrim = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanDarkTrim',
    color: '#191b1f',
    metalness: 0.4,
    roughness: 0.3,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  });

// Headlight: chrome reflector behind a clear lens
const createHeadlight = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanHeadlight',
    color: '#e6ecf2',
    metalness: 0.95,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });

const createTaillight = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanTaillight',
    color: '#8a0b0b',
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    emissive: '#5e0606',
    emissiveIntensity: 0.5,
  });

const createSeatFabric = (): MeshPhysicalMaterial =>
  new MeshPhysicalMaterial({
    name: 'VanSeatFabric',
    color: '#1d1e21',
    roughness: 0.95,
    sheen: 1,
    sheenRoughness: 0.6,
    sheenColor: new Color('#55585e'),
  });

// Shared, never-mutated body materials (one instance for every van and variant)
export const vanMaterials = {
  glass: lazy(createGlass),
  blackPlastic: lazy(createBlackPlastic),
  tyre: lazy(createTyre),
  rim: lazy(createRim),
  hub: lazy(() => new MeshStandardMaterial({ color: '#4b5058', metalness: 0.9, roughness: 0.35 })),
  cargoFloor: lazy(() => new MeshStandardMaterial({ color: '#334155', roughness: 0.9 })),
  chassis: lazy(() => new MeshStandardMaterial({ color: '#1f2329', roughness: 0.85 })),
  wheelArch: lazy(() => new MeshStandardMaterial({ color: '#475569', roughness: 0.8 })),
  headlight: lazy(createHeadlight),
  taillight: lazy(createTaillight),
  awning: lazy(() => new MeshStandardMaterial({ color: '#d4d7db', metalness: 0.7, roughness: 0.3 })),
};

// PBR upgrade of the .glb's simple materials, by glTF material name (van-l3h2.glb: Paint_White,
// Glass, Plastic_Black, Trim_Dark, Headlight, Taillight, Seat_Fabric, Tire, Rim_Silver), with
// name heuristics for other models. Always returns a NEW per-instance material (the caller owns
// and disposes it); unknown materials are plain clones. Paint takes the van spec colour.
const MATERIAL_RULES: { test: RegExp; create: (paintColor: string) => Material }[] = [
  { test: /paint|body|carrosser/i, create: createPaintMaterial },
  { test: /glass|window|cristal|vidrio/i, create: createGlass },
  { test: /tire|tyre|rubber|neum/i, create: createTyre },
  { test: /rim|wheel|alloy|llanta/i, create: createRim },
  { test: /chrome|cromo/i, create: () => new MeshStandardMaterial({ name: 'VanChrome', color: '#f2f4f7', metalness: 1, roughness: 0.05 }) },
  { test: /headlight|faro/i, create: createHeadlight },
  { test: /taillight|tail|rear_?light|piloto/i, create: createTaillight },
  { test: /trim|grille/i, create: createDarkTrim },
  { test: /plastic|bumper/i, create: createBlackPlastic },
  { test: /seat|fabric/i, create: createSeatFabric },
];

export function upgradeVanMaterial(source: Material, paintColor: string): Material {
  const rule = MATERIAL_RULES.find(({ test }) => test.test(source.name));
  if (!rule) return source.clone();
  const material = rule.create(paintColor);
  material.name = source.name;
  return material;
}

// Automotive paint per colour for the procedural body. One material per van instance,
// disposed when the colour changes.
export function usePaintMaterial(color: string): MeshPhysicalMaterial {
  const paint = useMemo(() => createPaintMaterial(color), [color]);
  useEffect(() => () => paint.dispose(), [paint]);
  return paint;
}
