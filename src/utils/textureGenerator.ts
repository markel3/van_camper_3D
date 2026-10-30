import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { MaterialDef } from '../types/camper.types';
import {
  SURFACE_SPECS,
  createSurfaceFields,
  fillSurfaceRows,
  normalAt,
  surfaceFamilyOf,
  surfaceSamplerFor,
  type SurfaceFields,
  type SurfaceSampler,
  type SurfaceSpec,
} from './textures/surfacePatterns';

// One PBR set per catalogue material, shared by every module that uses it
export interface MaterialTextures {
  map: Texture; // sRGB albedo
  normalMap: Texture;
  roughnessMap: Texture; // absolute roughness: pair with material roughness = 1
  metalness: number;
}

// The renderer clamps to the GPU maximum; 8 keeps grazing-angle grain sharp at a modest cost
const ANISOTROPY = 8;
// Only metals get real metalness; ACM is painted aluminium, so it stays half-dielectric
const METALNESS: Partial<Record<MaterialDef['kind'], number>> = { metal: 0.85, composite: 0.45 };
// A 1024 px wood tile takes ~1 s of CPU, so it is built in slices that leave each frame room to render
const SLICE_BUDGET_MS = 8;
const ROWS_PER_STEP = 4;

interface Layer {
  canvas: HTMLCanvasElement;
  image: ImageData;
  texture: Texture;
}

interface Job {
  material: MaterialDef;
  spec: SurfaceSpec;
  sampler: SurfaceSampler;
  fields: SurfaceFields;
  phase: 'sample' | 'paint';
  row: number;
  albedo: Layer;
  normal: Layer;
  rough: Layer;
}

const cache = new Map<string, MaterialTextures>();
const queue: Job[] = [];
let scheduled = false;

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Full-size canvas pre-filled with a flat colour, shown until the pattern is ready
function createLayer(size: number, fill: string, tileM: number, srgb: boolean): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  context.fillStyle = fill;
  context.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // Box UVs are in metres (metricBoxGeometry), so one repeat covers `tileM` metres
  texture.repeat.set(1 / tileM, 1 / tileM);
  texture.anisotropy = ANISOTROPY;
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return { canvas, image: context.createImageData(size, size), texture };
}

function writePixel(data: Uint8ClampedArray, o: number, r: number, g: number, b: number): void {
  data[o] = r;
  data[o + 1] = g;
  data[o + 2] = b;
  data[o + 3] = 255;
}

// Writes albedo, normal and roughness pixels for rows [rowStart, rowEnd); needs the full height field
function paintRows(job: Job, rowStart: number, rowEnd: number): void {
  const { fields, spec } = job;
  const { size } = fields;
  const [r, g, b] = hexToRgb(job.material.texture.baseColor);
  for (let row = rowStart; row < Math.min(rowEnd, size); row++) {
    for (let col = 0; col < size; col++) {
      const index = row * size + col;
      const o = index * 4;
      const k = 1 + (fields.tone[index] ?? 0);
      const [nx, ny, nz] = normalAt(fields, col, row, spec.normalStrength);
      const rough = (fields.roughness[index] ?? 1) * 255;
      writePixel(job.albedo.image.data, o, r * k, g * k, b * k);
      writePixel(job.normal.image.data, o, nx, ny, nz);
      writePixel(job.rough.image.data, o, rough, rough, rough); // three.js reads roughness from G
    }
  }
}

function upload(job: Job): void {
  for (const layer of [job.albedo, job.normal, job.rough]) {
    layer.canvas.getContext('2d')?.putImageData(layer.image, 0, 0);
    layer.texture.needsUpdate = true;
  }
}

// Advances the first job by one step; returns true when it is finished
function step(job: Job): boolean {
  const end = job.row + ROWS_PER_STEP;
  if (job.phase === 'sample') fillSurfaceRows(job.sampler, job.fields, job.row, end);
  else paintRows(job, job.row, end);
  job.row = end;
  if (job.row < job.fields.size) return false;
  if (job.phase === 'sample') {
    job.phase = 'paint';
    job.row = 0;
    return false;
  }
  upload(job);
  return true;
}

function runSlice(): void {
  scheduled = false;
  const deadline = performance.now() + SLICE_BUDGET_MS;
  while (queue.length > 0 && performance.now() < deadline) {
    const job = queue[0];
    if (job && step(job)) queue.shift();
  }
  schedule();
}

function schedule(): void {
  if (scheduled || queue.length === 0) return;
  scheduled = true;
  setTimeout(runSlice, 0);
}

function startJob(material: MaterialDef): MaterialTextures {
  const spec = SURFACE_SPECS[surfaceFamilyOf(material.kind)];
  const size = spec.resolution;
  const grey = Math.round(Math.min(1, Math.max(0, material.texture.roughness)) * 255);
  const job: Job = {
    material,
    spec,
    sampler: surfaceSamplerFor(material),
    fields: createSurfaceFields(size),
    phase: 'sample',
    row: 0,
    albedo: createLayer(size, material.texture.baseColor, spec.tileM, true),
    normal: createLayer(size, '#8080ff', spec.tileM, false), // flat tangent-space normal
    rough: createLayer(size, `rgb(${grey},${grey},${grey})`, spec.tileM, false),
  };
  queue.push(job);
  schedule();
  return {
    map: job.albedo.texture,
    normalMap: job.normal.texture,
    roughnessMap: job.rough.texture,
    metalness: METALNESS[material.kind] ?? 0,
  };
}

// Lazy and cached by material id: the first module showing a material starts its generation
// (flat colours until the pattern is uploaded), every later module reuses the same textures.
// Never regenerated per render or per module.
export function getMaterialTextures(material: MaterialDef): MaterialTextures {
  const cached = cache.get(material.id);
  if (cached) return cached;
  const textures = startJob(material);
  cache.set(material.id, textures);
  return textures;
}
