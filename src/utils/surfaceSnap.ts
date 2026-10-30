import type { Box3 } from 'three';
import { DECOR_CATALOG } from '../data/decorCatalog';
import { COLLISION_TOLERANCE_M, isDecor, type BoxedItem } from './collisionBoxes';
import { isRoofMounted } from './roofMount';
import { itemParts } from './shapes/itemShape';
import { mmToM } from './unitConverters';

// Surface snap for decoration, on the modules' real shapes (utils/shapes): a decor item rests on
// the floor or on the top face of a part that is actually under its centre: the mattress, a worktop,
// a table top, or the floor under the table.
// Resting levels at the decor's X/Z centre: the floor (Y = 0) and the top of every supporting part
// whose plan footprint contains that point (closed interval, quarter turns honoured). A level is free
// when the decor's own height fits there, i.e. no supporting part above the point overlaps
// [level, level + height]. Among the free levels the one nearest the requested Y wins (ties: the
// higher one), so an item slides along at its current level and the vertical gizmo arrow lifts it
// from the floor under a table onto the table top. With no hint (insertion) the highest free level
// wins. Only non-decor, interior (non-roof) modules support anything, so a jute rug never lifts
// other decor and always lies on the floor itself.

// Decor hung from the ceiling keeps its own height (hanging plant, LED string, surfboard straps)
const SELF_PLACED_DECOR = new Set(
  DECOR_CATALOG.filter((def) => def.mount === 'overhead' || def.mount === 'roof').map((def) => def.catalogId),
);

// True when the item's Y is derived from the surfaces beneath it
export const isSurfaceSnapped = (catalogId: string): boolean =>
  isDecor(catalogId) && !SELF_PLACED_DECOR.has(catalogId);

type SnapItem = Pick<BoxedItem, 'id' | 'catalogId' | 'position' | 'rotation' | 'dimensions'>;

const roundToMicron = (m: number): number => Math.round(m * 1e6) / 1e6;
const canSupport = (catalogId: string): boolean => !isDecor(catalogId) && !isRoofMounted(catalogId);

// Supporting parts whose plan footprint contains (x, z), with the id of their module
export function partsUnder(items: readonly SnapItem[], movingId: string, x: number, z: number): { id: string; box: Box3 }[] {
  const column: { id: string; box: Box3 }[] = [];
  for (const other of items) {
    if (other.id === movingId || !canSupport(other.catalogId)) continue;
    for (const box of itemParts(other)) {
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) column.push({ id: other.id, box });
    }
  }
  return column;
}

// Free resting levels (metres, ascending) for `moving` at its current X/Z
export function restingLevels(items: readonly SnapItem[], moving: SnapItem): number[] {
  const column = partsUnder(items, moving.id, moving.position.x, moving.position.z).map((entry) => entry.box);
  const height = mmToM(moving.dimensions.height);
  const levels = [...new Set([0, ...column.map((box) => roundToMicron(box.max.y))])].sort((a, b) => a - b);
  const free = levels.filter((level) =>
    column.every((box) => box.max.y <= level + COLLISION_TOLERANCE_M || box.min.y >= level + height - COLLISION_TOLERANCE_M),
  );
  // The highest top always has nothing above it in this column; the guard is for degenerate heights
  return free.length > 0 ? free : [levels[levels.length - 1]!];
}

// Resting height (metres) for `moving` at its current X/Z among `items` (the moving item itself is
// skipped): the free level nearest `hintY` (default: its current Y; Infinity = highest)
export function surfaceSnapY(items: readonly SnapItem[], moving: SnapItem, hintY = moving.position.y): number {
  let best = 0;
  let bestDistance = Infinity;
  for (const level of restingLevels(items, moving)) {
    const distance = Math.abs(level - hintY);
    // Ascending levels: `<=` lets the higher of two equally near levels win (and Infinity picks the top)
    if (distance <= bestDistance || !Number.isFinite(distance)) {
      best = level;
      bestDistance = distance;
    }
  }
  return roundToMicron(best);
}

// Y to apply to `moving`: snapped for surface decor (nearest free level to `hintY`, default its
// requested Y), the requested Y otherwise
export function resolveRestingY(items: readonly SnapItem[], moving: SnapItem, hintY?: number): number {
  return isSurfaceSnapped(moving.catalogId) ? surfaceSnapY(items, moving, hintY ?? moving.position.y) : moving.position.y;
}
