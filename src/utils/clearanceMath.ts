import type { Box3 } from 'three';
import type { VanSpec } from '../types/camper.types';
import { cargoBox, wheelArchBoxes, type BoxedItem } from './collisionMath';
import { itemParts } from './shapes/itemShape';
import { mToMm } from './unitConverters';
import { isRoofMounted } from './roofMount';

// Pure clearance math for the orthographic drawings (WORKFLOWS.md, Flow 6 "Planta").
// Van space: X centred, Y = 0 on the cargo floor, Z = 0 at the bulkhead, metres.

export type Vec3 = readonly [number, number, number];

export interface DimensionAnnotation {
  id: string;
  kind: 'aisle' | 'headroom';
  start: Vec3;
  end: Vec3;
  lengthMM: number;
  // Below the comfort minimum (aisles only)
  warning: boolean;
}

// Anything starting lower than this blocks walking (wall cabinets above it do not)
export const AISLE_BLOCKING_HEIGHT_M = 1.0;
// Comfortable minimum aisle width
export const AISLE_MIN_MM = 600;
// Shorter stretches or gaps are not worth a dimension line
const MIN_SPAN_M = 0.1;
const EPSILON_M = 0.001;

const roundMM = (m: number): number => Math.round(mToMm(m));

// Every solid in the cargo box: module parts (hidden ones too, they still exist; real shapes, so the
// space under a table top or an overhead cabinet stays free) and wheel arches.
// Roof-mounted modules are outside the living space, so they never shape aisles or headroom.
function obstacleBoxes(van: VanSpec, items: readonly BoxedItem[]): Box3[] {
  const interior = items.filter((item) => !isRoofMounted(item.catalogId));
  return [...interior.flatMap((item) => itemParts(item)), ...wheelArchBoxes(van)];
}

// Widest free X interval across the cargo width, given occupied intervals
function widestGap(minX: number, maxX: number, occupied: readonly (readonly [number, number])[]): [number, number] | null {
  const sorted = [...occupied].sort((a, b) => a[0] - b[0]);
  let cursor = minX;
  let best: [number, number] | null = null;
  const consider = (from: number, to: number) => {
    if (to - from > EPSILON_M && (!best || to - from > best[1] - best[0])) best = [from, to];
  };
  for (const [from, to] of sorted) {
    consider(cursor, Math.min(from, maxX));
    cursor = Math.max(cursor, to);
  }
  consider(cursor, maxX);
  return best;
}

// Plan view: along the van, the widest walkable gap between floor-standing obstacles.
// The length is cut into stretches at every obstacle edge; equal neighbouring stretches merge.
export function aisleAnnotations(van: VanSpec, items: readonly BoxedItem[]): DimensionAnnotation[] {
  const cargo = cargoBox(van);
  const blocking = obstacleBoxes(van, items).filter((box) => box.min.y < AISLE_BLOCKING_HEIGHT_M);
  const cuts = [cargo.min.z, cargo.max.z];
  for (const box of blocking) cuts.push(box.min.z, box.max.z);
  const edges = [...new Set(cuts.map((z) => Math.min(cargo.max.z, Math.max(cargo.min.z, z))))].sort((a, b) => a - b);

  const stretches: { z0: number; z1: number; gap: [number, number] }[] = [];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    const z0 = edges[i] ?? 0;
    const z1 = edges[i + 1] ?? 0;
    if (z1 - z0 < EPSILON_M) continue;
    const zMid = (z0 + z1) / 2;
    const occupied = blocking
      .filter((box) => box.min.z < zMid && box.max.z > zMid)
      .map((box) => [box.min.x, box.max.x] as const);
    const gap = widestGap(cargo.min.x, cargo.max.x, occupied);
    if (!gap) continue;
    const last = stretches.at(-1);
    const sameGap =
      last && Math.abs(last.z1 - z0) < EPSILON_M &&
      Math.abs(last.gap[0] - gap[0]) < EPSILON_M && Math.abs(last.gap[1] - gap[1]) < EPSILON_M;
    if (last && sameGap) last.z1 = z1;
    else stretches.push({ z0, z1, gap });
  }

  const y = cargo.max.y;
  return stretches
    .filter(({ z0, z1, gap }) => z1 - z0 >= MIN_SPAN_M && gap[1] - gap[0] >= MIN_SPAN_M)
    .map(({ z0, z1, gap }) => {
      const z = (z0 + z1) / 2;
      const lengthMM = roundMM(gap[1] - gap[0]);
      return {
        id: `aisle:${roundMM(z0)}-${roundMM(z1)}`,
        kind: 'aisle',
        start: [gap[0], y, z],
        end: [gap[1], y, z],
        lengthMM,
        warning: lengthMM < AISLE_MIN_MM,
      };
    });
}

const footprintsOverlap = (a: Box3, b: Box3): boolean =>
  Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x) > EPSILON_M &&
  Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z) > EPSILON_M;

// Elevations: free height above every obstacle (to the roof or to whatever hangs over it) and,
// for modules mounted off the floor with nothing beneath, the free height underneath.
// `screenAxis` is the drawing's horizontal axis ('z' side elevation, 'x' rear elevation):
// lines that would project onto the same spot are drawn once.
export function headroomAnnotations(
  van: VanSpec,
  items: readonly BoxedItem[],
  screenAxis: 'x' | 'z',
): DimensionAnnotation[] {
  const roof = cargoBox(van).max.y;
  const boxes = obstacleBoxes(van, items);
  const spans: { at: Box3; from: number; to: number }[] = [];

  for (const box of boxes) {
    const above = boxes.filter((other) => other !== box && other.min.y >= box.max.y - EPSILON_M && footprintsOverlap(box, other));
    spans.push({ at: box, from: box.max.y, to: Math.min(roof, ...above.map((other) => other.min.y)) });
    const below = boxes.some((other) => other !== box && other.max.y <= box.min.y + EPSILON_M && footprintsOverlap(box, other));
    if (box.min.y > EPSILON_M && !below) spans.push({ at: box, from: 0, to: box.min.y });
  }

  const seen = new Set<string>();
  const annotations: DimensionAnnotation[] = [];
  for (const { at, from, to } of spans) {
    if (to - from < MIN_SPAN_M) continue;
    const x = (at.min.x + at.max.x) / 2;
    const z = (at.min.z + at.max.z) / 2;
    const id = `headroom:${roundMM(screenAxis === 'x' ? x : z)}:${roundMM(from)}-${roundMM(to)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    annotations.push({ id, kind: 'headroom', start: [x, from, z], end: [x, to, z], lengthMM: roundMM(to - from), warning: false });
  }
  return annotations;
}
