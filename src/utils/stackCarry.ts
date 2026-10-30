import type { Vector3Tuple } from '../types/camper.types';
import { isDecor, type BoxedItem } from './collisionMath';
import { isRoofMounted } from './roofMount';
import { isSurfaceSnapped, partsUnder, resolveRestingY, surfaceSnapY } from './surfaceSnap';

// Stack carry: decor resting on a module travels with it (move, quarter turn) and re-rests when
// the module is resized or removed.
// Rider rule, on the real shapes (utils/shapes): surface-snapped decor whose X/Z centre lies inside
// the footprint of one of the support's parts (closed interval, as in surfaceSnap.ts), whose Y equals
// that part's top within RIDER_TOLERANCE_M, and for which that level is a free resting level
// (surfaceSnapY keeps it). A rug or a plant on the floor under a table or in a bed's open bay is
// therefore never carried.

export const RIDER_TOLERANCE_M = 0.001;

type StackItem = Pick<BoxedItem, 'id' | 'catalogId' | 'position' | 'rotation' | 'dimensions'>;

export interface CarriedPose {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

const QUARTER = Math.PI / 2;
const roundToMicron = (m: number): number => Math.round(m * 1e6) / 1e6;

// Only interior, non-decor modules hold anything up (same rule as surfaceSnapY)
const canSupport = (catalogId: string): boolean => !isDecor(catalogId) && !isRoofMounted(catalogId);

// Ids of the decor items resting on `support` in `items`
export function findRiders(items: readonly StackItem[], support: StackItem): string[] {
  if (!canSupport(support.catalogId)) return [];
  return items
    .filter((rider) => {
      if (rider.id === support.id || !isSurfaceSnapped(rider.catalogId)) return false;
      const { x, y, z } = rider.position;
      const onSupport = partsUnder([support], rider.id, x, z).some(({ box }) => Math.abs(y - box.max.y) <= RIDER_TOLERANCE_M);
      if (!onSupport) return false;
      return Math.abs(surfaceSnapY(items, rider) - y) <= RIDER_TOLERANCE_M;
    })
    .map((rider) => rider.id);
}

// Adds a Y rotation; whole quarter turns are snapped to [0, 4) quarters so repeated turns never drift
export function addYaw(y: number, delta: number): number {
  const sum = y + delta;
  const turns = Math.round(sum / QUARTER);
  if (Math.abs(sum - turns * QUARTER) < 1e-9) return (((turns % 4) + 4) % 4) * QUARTER;
  const full = 2 * Math.PI;
  return ((sum % full) + full) % full;
}

// New poses of the decor riding on `supportId` once that module becomes `next` (moved, rotated,
// resized) or is removed (`next` = null). The support's translation (dx, dy, dz) and yaw change are
// applied rigidly about its pivot, using the same sign convention as three.js rotation.y:
// x' = x·cos θ + z·sin θ, z' = −x·sin θ + z·cos θ. Each rider's Y is then re-resolved against the
// updated scene, so it rests on the new top (or drops to the floor when its support is gone).
// Only riders whose pose actually changes are returned.
export function carryRiders(
  items: readonly StackItem[],
  supportId: string,
  next: StackItem | null,
): Map<string, CarriedPose> {
  const result = new Map<string, CarriedPose>();
  const support = items.find((item) => item.id === supportId);
  if (!support) return result;
  const riderIds = new Set(findRiders(items, support));
  if (riderIds.size === 0) return result;

  const dYaw = next ? next.rotation.y - support.rotation.y : 0;
  const cos = Math.cos(dYaw);
  const sin = Math.sin(dYaw);
  const moved = new Map<string, StackItem>();
  for (const rider of items) {
    if (!riderIds.has(rider.id)) continue;
    if (!next) {
      moved.set(rider.id, rider);
      continue;
    }
    const ox = rider.position.x - support.position.x;
    const oz = rider.position.z - support.position.z;
    const position = {
      x: roundToMicron(next.position.x + ox * cos + oz * sin),
      y: roundToMicron(rider.position.y + next.position.y - support.position.y),
      z: roundToMicron(next.position.z - ox * sin + oz * cos),
    };
    const rotation = dYaw === 0 ? rider.rotation : { ...rider.rotation, y: addYaw(rider.rotation.y, dYaw) };
    moved.set(rider.id, { ...rider, position, rotation });
  }

  // Scene after the change: support replaced (or gone), riders at their carried X/Z
  const after: StackItem[] = [];
  for (const item of items) {
    if (item.id === supportId) {
      if (next) after.push(next);
    } else {
      after.push(moved.get(item.id) ?? item);
    }
  }

  for (const [id, rider] of moved) {
    const position = { ...rider.position, y: resolveRestingY(after, rider) };
    const original = items.find((item) => item.id === id);
    const same =
      original &&
      original.position.x === position.x &&
      original.position.y === position.y &&
      original.position.z === position.z &&
      original.rotation.y === rider.rotation.y;
    if (!same) result.set(id, { position, rotation: rider.rotation });
  }
  return result;
}
