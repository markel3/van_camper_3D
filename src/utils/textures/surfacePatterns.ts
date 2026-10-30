import type { MaterialDef } from '../../types/camper.types';
import { periodicFbm, periodicNoise } from './periodicNoise';

// Visual family of a catalogue material: decides the procedural pattern
export type SurfaceFamily = 'wood' | 'laminate' | 'brushed' | 'plastic';

export interface SurfaceSpec {
  resolution: number; // px per tile side
  tileM: number; // physical size of one tile, metres (box UVs are in metres)
  normalStrength: number; // height gradient → normal tilt
}

// Fine patterns need pixels (wood fibre, brushing); matte surfaces read well at 512 px
export const SURFACE_SPECS: Record<SurfaceFamily, SurfaceSpec> = {
  wood: { resolution: 1024, tileM: 0.8, normalStrength: 1.6 },
  laminate: { resolution: 512, tileM: 0.3, normalStrength: 3 },
  brushed: { resolution: 1024, tileM: 0.5, normalStrength: 0.6 },
  plastic: { resolution: 512, tileM: 0.3, normalStrength: 2.5 },
};

export function surfaceFamilyOf(kind: MaterialDef['kind']): SurfaceFamily {
  if (kind === 'plywood' || kind === 'solidWood') return 'wood';
  if (kind === 'laminate') return 'laminate';
  if (kind === 'metal' || kind === 'composite') return 'brushed';
  return 'plastic';
}

// Grain level → pattern intensity ('none' still keeps a faint fibre so wood never looks painted)
const GRAIN_INTENSITY: Record<MaterialDef['texture']['grain'], number> = {
  none: 0.1,
  fine: 0.35,
  medium: 0.65,
  strong: 1,
};

// Per-pixel fields of one tile, row-major, size × size
export interface SurfaceFields {
  size: number;
  height: Float32Array; // 0-1 relief, source of the normal map
  tone: Float32Array; // relative brightness offset applied to the base colour (0 = base)
  roughness: Float32Array; // absolute 0-1
}

interface Sample {
  height: number;
  tone: number;
  roughness: number;
}

export type SurfaceSampler = (u: number, v: number) => Sample;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

// Growth rings run along U; an integer ring count keeps them tileable across V
const WOOD_RINGS = 11;
// Ring phase wander, in ring widths: gentle drift, never contour-line waves
const WOOD_WAVE = 0.35;

// Soft latewood line near the end of each ring (Gaussian on the ring fraction, ~0 at the wrap)
const latewoodAt = (ring: number): number => Math.exp(-(((ring - 0.82) / 0.07) ** 2));

// Sawn/veneer look: long straight fibres along U, low-contrast annual rings, sparse pores.
// `grain` raises figure visibility and latewood darkness, not wave amplitude.
function woodSampler(grain: number, baseRoughness: number, seed: number): SurfaceSampler {
  return (u, v) => {
    const wave = periodicFbm(u, v, 2, 1, 2, seed) - 0.5;
    const phase = v * WOOD_RINGS + wave * WOOD_WAVE;
    const latewood = latewoodAt(phase - Math.floor(phase));
    // Few lattice cells along U and many across V: long, fine parallel fibres
    const fibre = periodicFbm(u, v, 4, 256, 2, seed + 7);
    const fleck = periodicNoise(u, v, 32, 512, seed + 13) > 0.88 ? 1 : 0;
    // Broad colour drift between and within boards, a few percent
    const drift = periodicFbm(u, v, 2, 3, 2, seed + 29) - 0.5;
    return {
      height: 0.5 + (fibre - 0.5) * 0.6 - latewood * 0.12 * grain - fleck * 0.08,
      tone: -latewood * (0.03 + 0.09 * grain) + (fibre - 0.5) * 0.06 + drift * 0.06 - fleck * 0.03,
      roughness: baseRoughness + (fibre - 0.5) * 0.06 + fleck * 0.05,
    };
  };
}

// CPL: micro-rough anti-glare finish, almost no colour variation
function laminateSampler(baseRoughness: number, seed: number): SurfaceSampler {
  return (u, v) => {
    const micro = periodicFbm(u, v, 64, 64, 3, seed);
    return {
      height: micro,
      tone: (periodicFbm(u, v, 8, 8, 2, seed + 3) - 0.5) * 0.04,
      roughness: Math.max(baseRoughness + 0.15, 0.65) + (micro - 0.5) * 0.1,
    };
  };
}

// Satin brushed finish: long streaks along U
function brushedSampler(baseRoughness: number, seed: number): SurfaceSampler {
  return (u, v) => {
    const streak = periodicFbm(u, v, 2, 256, 2, seed);
    return {
      height: streak,
      tone: (streak - 0.5) * 0.06 + (periodicFbm(u, v, 4, 4, 2, seed + 5) - 0.5) * 0.04,
      roughness: baseRoughness + 0.1 + (streak - 0.5) * 0.06,
    };
  };
}

// Fine matte moulded plastic
function plasticSampler(baseRoughness: number, seed: number): SurfaceSampler {
  return (u, v) => {
    const fine = periodicFbm(u, v, 32, 32, 2, seed);
    return {
      height: fine,
      tone: (fine - 0.5) * 0.04,
      roughness: Math.max(baseRoughness, 0.55) + (fine - 0.5) * 0.06,
    };
  };
}

function samplerFor(family: SurfaceFamily, texture: MaterialDef['texture'], seed: number): SurfaceSampler {
  if (family === 'wood') return woodSampler(GRAIN_INTENSITY[texture.grain], texture.roughness, seed);
  if (family === 'laminate') return laminateSampler(texture.roughness, seed);
  if (family === 'brushed') return brushedSampler(texture.roughness, seed);
  return plasticSampler(texture.roughness, seed);
}

// Stable seed from the material id, so two materials of a family don't look identical
export function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function surfaceSamplerFor(material: MaterialDef): SurfaceSampler {
  return samplerFor(surfaceFamilyOf(material.kind), material.texture, seedFromId(material.id) % 100000);
}

export function createSurfaceFields(size: number): SurfaceFields {
  const count = size * size;
  return { size, height: new Float32Array(count), tone: new Float32Array(count), roughness: new Float32Array(count) };
}

// Samples rows [rowStart, rowEnd) of the tile, so large tiles can be generated in time slices.
// Pure (no DOM), so it can be tested outside the browser.
export function fillSurfaceRows(sample: SurfaceSampler, fields: SurfaceFields, rowStart: number, rowEnd: number): void {
  const { size } = fields;
  for (let row = rowStart; row < Math.min(rowEnd, size); row++) {
    for (let col = 0; col < size; col++) {
      const s = sample(col / size, row / size);
      const index = row * size + col;
      fields.height[index] = s.height;
      fields.tone[index] = s.tone;
      fields.roughness[index] = Math.min(1, Math.max(0.04, s.roughness));
    }
  }
}

// Whole tile in one call (tests and small tiles)
export function generateSurfaceFields(material: MaterialDef, size: number): SurfaceFields {
  const fields = createSurfaceFields(size);
  fillSurfaceRows(surfaceSamplerFor(material), fields, 0, size);
  return fields;
}

// Tangent-space normal (0-255 RGB) from the height field, with wrap-around differences so the
// normal map tiles as seamlessly as the height. Canvas rows grow downwards (−V), hence +dy on Y.
export function normalAt(fields: SurfaceFields, col: number, row: number, strength: number): [number, number, number] {
  const { size, height } = fields;
  const at = (c: number, r: number): number => height[((r + size) % size) * size + ((c + size) % size)] ?? 0;
  const dx = (at(col + 1, row) - at(col - 1, row)) * strength;
  const dy = (at(col, row + 1) - at(col, row - 1)) * strength;
  const length = Math.hypot(dx, dy, 1);
  return [clamp01(0.5 - (dx / length) * 0.5) * 255, clamp01(0.5 + (dy / length) * 0.5) * 255, (0.5 + 0.5 / length) * 255];
}
