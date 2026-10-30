import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { periodicFbm } from './periodicNoise';
import { createSurfaceFields, normalAt } from './surfacePatterns';

// Small procedural textures for the catalogue props. Each is built once, on first use, and shared.
const ANISOTROPY = 8;

function canvasOf(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  return { canvas, context };
}

function tiledTexture(canvas: HTMLCanvasElement, srgb: boolean): Texture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = ANISOTROPY;
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

// --- Monocrystalline cell: one tile = one cell plus half the gap on each side ---
const CELL_PX = 256;
const CELL_GAP_PX = 5; // half gap: neighbouring tiles add up to a 10 px white gap
const CELL_CHAMFER_PX = 30; // cut corners of pseudo-square mono wafers
const BUSBARS = 4;
const FINGER_PITCH_PX = 6;

let solarCell: Texture | null = null;

function cellPath(context: CanvasRenderingContext2D): void {
  const a = CELL_GAP_PX;
  const b = CELL_PX - CELL_GAP_PX;
  const c = CELL_CHAMFER_PX;
  context.beginPath();
  context.moveTo(a + c, a);
  context.lineTo(b - c, a);
  context.lineTo(b, a + c);
  context.lineTo(b, b - c);
  context.lineTo(b - c, b);
  context.lineTo(a + c, b);
  context.lineTo(a, b - c);
  context.lineTo(a, a + c);
  context.closePath();
}

// UV 0-1 spans one cell: callers scale UVs by the number of cells across the wafer
export function getSolarCellTexture(): Texture {
  if (solarCell) return solarCell;
  const { canvas, context } = canvasOf(CELL_PX);
  context.fillStyle = '#e4e8ee'; // white backsheet showing through the gaps
  context.fillRect(0, 0, CELL_PX, CELL_PX);
  cellPath(context);
  const shade = context.createRadialGradient(CELL_PX / 2, CELL_PX / 2, 10, CELL_PX / 2, CELL_PX / 2, CELL_PX * 0.7);
  shade.addColorStop(0, '#111a2e');
  shade.addColorStop(1, '#0a1120');
  context.fillStyle = shade;
  context.fill();
  context.save();
  cellPath(context);
  context.clip();
  // Fine fingers across the cell, then the busbars that collect them
  context.fillStyle = 'rgba(150, 165, 185, 0.32)';
  for (let y = CELL_GAP_PX + 3; y < CELL_PX - CELL_GAP_PX; y += FINGER_PITCH_PX) context.fillRect(0, y, CELL_PX, 1);
  context.fillStyle = '#b9c1cb';
  for (let i = 1; i <= BUSBARS; i++) context.fillRect((CELL_PX * i) / (BUSBARS + 1) - 1.5, 0, 3, CELL_PX);
  context.restore();
  solarCell = tiledTexture(canvas, true);
  return solarCell;
}

// --- Quilted mattress fabric: diamond quilting with a linen weave ---
const FABRIC_PX = 256;
const FABRIC_RGB: readonly [number, number, number] = [230, 220, 203]; // raw / bone textile
const QUILT_DIAMONDS = 2; // diamonds per tile along each diagonal (integer keeps it seamless)

export interface FabricTextures {
  map: Texture;
  normalMap: Texture;
}

let fabric: FabricTextures | null = null;

export function getFabricTextures(): FabricTextures {
  if (fabric) return fabric;
  const fields = createSurfaceFields(FABRIC_PX);
  for (let row = 0; row < FABRIC_PX; row++) {
    for (let col = 0; col < FABRIC_PX; col++) {
      const u = col / FABRIC_PX;
      const v = row / FABRIC_PX;
      const a = (((u + v) * QUILT_DIAMONDS) % 1 + 1) % 1;
      const b = (((u - v) * QUILT_DIAMONDS) % 1 + 1) % 1;
      const pillow = Math.sqrt(Math.sin(Math.PI * a) * Math.sin(Math.PI * b));
      const weave = periodicFbm(u, v, 96, 96, 1, 41);
      const index = row * FABRIC_PX + col;
      fields.height[index] = pillow * 0.7 + weave * 0.08;
      // Stitch seams sit in shadow; the weave adds a faint linen speckle
      fields.tone[index] = (pillow - 1) * 0.12 + (weave - 0.5) * 0.08;
    }
  }
  const { canvas: albedo, context: albedoContext } = canvasOf(FABRIC_PX);
  const { canvas: normal, context: normalContext } = canvasOf(FABRIC_PX);
  const albedoImage = albedoContext.createImageData(FABRIC_PX, FABRIC_PX);
  const normalImage = normalContext.createImageData(FABRIC_PX, FABRIC_PX);
  for (let index = 0; index < FABRIC_PX * FABRIC_PX; index++) {
    const o = index * 4;
    const k = 1 + (fields.tone[index] ?? 0);
    const [nx, ny, nz] = normalAt(fields, index % FABRIC_PX, Math.floor(index / FABRIC_PX), 2.5);
    albedoImage.data.set([FABRIC_RGB[0] * k, FABRIC_RGB[1] * k, FABRIC_RGB[2] * k, 255], o);
    normalImage.data.set([nx, ny, nz, 255], o);
  }
  albedoContext.putImageData(albedoImage, 0, 0);
  normalContext.putImageData(normalImage, 0, 0);
  fabric = { map: tiledTexture(albedo, true), normalMap: tiledTexture(normal, false) };
  return fabric;
}

// --- Induction hob: black glass with two printed cooking zones and a touch-control strip ---
// UV 0-1 spans the whole glass (two zones front to back, controls along the front edge).
const HOB_PX = 512;
let inductionHob: Texture | null = null;

export function getInductionHobTexture(): Texture {
  if (inductionHob) return inductionHob;
  const { canvas, context } = canvasOf(HOB_PX);
  context.fillStyle = '#0d0e10';
  context.fillRect(0, 0, HOB_PX, HOB_PX);
  context.strokeStyle = 'rgba(190, 196, 204, 0.55)';
  context.lineWidth = 3;
  const zones: readonly [number, number, number][] = [
    [HOB_PX * 0.5, HOB_PX * 0.28, HOB_PX * 0.2],
    [HOB_PX * 0.5, HOB_PX * 0.68, HOB_PX * 0.16],
  ];
  for (const [x, y, r] of zones) {
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(x, y, r * 0.62, 0, Math.PI * 2);
    context.globalAlpha = 0.35;
    context.stroke();
    context.globalAlpha = 1;
  }
  // Touch slider and power key near the front edge
  context.fillStyle = 'rgba(200, 205, 212, 0.6)';
  context.fillRect(HOB_PX * 0.3, HOB_PX * 0.92, HOB_PX * 0.4, 3);
  for (let i = 0; i < 9; i++) context.fillRect(HOB_PX * (0.3 + i * 0.05), HOB_PX * 0.905, 2, 10);
  context.beginPath();
  context.arc(HOB_PX * 0.82, HOB_PX * 0.92, 9, 0, Math.PI * 2);
  context.stroke();
  inductionHob = new CanvasTexture(canvas);
  inductionHob.colorSpace = SRGBColorSpace;
  inductionHob.anisotropy = ANISOTROPY;
  return inductionHob;
}
