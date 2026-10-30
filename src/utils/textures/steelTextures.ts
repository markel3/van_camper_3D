import { CanvasTexture, NoColorSpace, RepeatWrapping } from 'three';
import { periodicFbm } from './periodicNoise';

// Procedural maps for the factory-painted steel of the bare cargo shell. No photographic CC0 set
// shows clean light-grey OEM paint (they are all rusty or chipped), so the micro surface is
// generated: a fine "orange peel" relief with slight roughness mottling. Tileable, built once.

export const STEEL_TILE_M = 0.5; // real-world size of one tile of the paint maps
export const FLOOR_RIB_PITCH_M = 0.125; // stamped longitudinal ribs of the cargo floor

interface HeightField {
  size: number;
  height: Float32Array;
}

function heightField(size: number, sample: (u: number, v: number) => number): HeightField {
  const height = new Float32Array(size * size);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) height[row * size + col] = sample(col / size, row / size);
  }
  return { size, height };
}

function toCanvasTexture(size: number, fill: (data: Uint8ClampedArray) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.createImageData(size, size);
    fill(image.data);
    ctx.putImageData(image, 0, 0);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Tangent-space normal map (OpenGL convention) from a periodic height field
function normalTexture({ size, height }: HeightField, strength: number): CanvasTexture {
  return toCanvasTexture(size, (data) => {
    const at = (c: number, r: number) => height[((r + size) % size) * size + ((c + size) % size)] ?? 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const dx = (at(col + 1, row) - at(col - 1, row)) * strength;
        const dy = (at(col, row - 1) - at(col, row + 1)) * strength;
        const inv = 1 / Math.hypot(dx, dy, 1);
        const i = (row * size + col) * 4;
        data[i] = (-dx * inv * 0.5 + 0.5) * 255;
        data[i + 1] = (-dy * inv * 0.5 + 0.5) * 255;
        data[i + 2] = (inv * 0.5 + 0.5) * 255;
        data[i + 3] = 255;
      }
    }
  });
}

function greyTexture({ size, height }: HeightField, map: (h: number) => number): CanvasTexture {
  return toCanvasTexture(size, (data) => {
    for (let i = 0; i < size * size; i++) {
      const value = Math.max(0, Math.min(255, map(height[i] ?? 0) * 255));
      data[i * 4] = value;
      data[i * 4 + 1] = value;
      data[i * 4 + 2] = value;
      data[i * 4 + 3] = 255;
    }
  });
}

export interface SteelMaps {
  normalMap: CanvasTexture;
  roughnessMap: CanvasTexture;
}

let paintMaps: SteelMaps | null = null;
// Orange-peel paint over pressed sheet: fine cells plus a slow waviness of the panel
export function getPaintedSteelMaps(): SteelMaps {
  if (paintMaps) return paintMaps;
  const peel = heightField(256, (u, v) => periodicFbm(u, v, 48, 48, 3, 11) * 0.7 + periodicFbm(u, v, 4, 4, 2, 5) * 0.3);
  const mottle = heightField(128, (u, v) => periodicFbm(u, v, 6, 6, 4, 23));
  paintMaps = {
    normalMap: normalTexture(peel, 2.2),
    // Read by the material's roughness multiplier: ≈ 0.85–1.0 of the base value
    roughnessMap: greyTexture(mottle, (h) => 0.82 + h * 0.18),
  };
  return paintMaps;
}

let floorMaps: SteelMaps | null = null;
// Cargo floor: shallow rounded ribs pressed along the van (U across, one rib per tile) on top of the paint
export function getRibbedFloorMaps(): SteelMaps {
  if (floorMaps) return floorMaps;
  const ribs = heightField(256, (u, v) => {
    const across = Math.abs(u - 0.5) * 2; // 0 at the rib crest, 1 at the valley
    const rib = across < 0.45 ? Math.cos((across / 0.45) * Math.PI * 0.5) ** 2 : 0;
    return rib * 6 + periodicFbm(u, v, 16, 16, 3, 41) * 0.25;
  });
  const wear = heightField(128, (u, v) => periodicFbm(u, v, 3, 12, 4, 61));
  floorMaps = {
    normalMap: normalTexture(ribs, 1.6),
    roughnessMap: greyTexture(wear, (h) => 0.7 + h * 0.3),
  };
  return floorMaps;
}
