import type { Box3 } from 'three';
import type { VanSpec, Vector3Tuple } from '../types/camper.types';
import { cargoBox, wheelArchBoxes, type BoxedItem } from './collisionMath';
import { isRoofMounted } from './roofMount';
import { itemParts } from './shapes/itemShape';
import { unionOf } from './shapes/shapeBox';
import { roofZoneBox } from './vanLayout';

// Magnetic snap (WORKFLOWS.md, Flow 3): a face closer than this to a wall or another face sticks to it at 0 mm.
export const MAGNET_DISTANCE_M = 0.03;

type FloorAxis = 'x' | 'z';
const CROSS_AXIS: Record<FloorAxis, FloorAxis> = { x: 'z', z: 'x' };

// Shared length of two boxes along an axis; zero or negative means they do not face each other.
const sharedSpan = (a: Box3, b: Box3, axis: 'x' | 'y' | 'z'): number =>
  Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);

// Smallest shift along `axis` that brings a face of the moving module flush with a nearby target, or
// 0 if none is in range. `envelope` (union of its parts) meets the walls; each of its `parts` meets
// the facing parts of other modules and the wheel arches.
// `bounds` is the cargo box for interior modules and the roof footprint for roof modules.
function magnetOffset(envelope: Box3, parts: readonly Box3[], axis: FloorAxis, bounds: Box3, obstacles: readonly Box3[]): number {
  let best = 0;
  let bestDistance = Infinity;
  const consider = (offset: number) => {
    const distance = Math.abs(offset);
    if (distance < MAGNET_DISTANCE_M && distance < bestDistance) {
      best = offset;
      bestDistance = distance;
    }
  };

  // Cargo walls (sides on X; bulkhead and rear doors on Z) or roof edges, approached from the inside
  consider(bounds.min[axis] - envelope.min[axis]);
  consider(bounds.max[axis] - envelope.max[axis]);

  // Faces of module parts and wheel arches, only when they actually face a moving part
  const cross = CROSS_AXIS[axis];
  for (const box of parts) {
    for (const obstacle of obstacles) {
      if (sharedSpan(box, obstacle, cross) <= 0 || sharedSpan(box, obstacle, 'y') <= 0) continue;
      consider(obstacle.max[axis] - box.min[axis]);
      consider(obstacle.min[axis] - box.max[axis]);
    }
  }

  return best;
}

// Applies the wall/face magnet to a module that is already grid-snapped. Y is left untouched.
// Faces are those of the real shapes (utils/shapes): a bed's post, a table top, a worktop edge.
// Roof modules snap to the roof edges and to each other; interior modules never see them.
export function magnetSnap(van: VanSpec, items: readonly BoxedItem[], moving: BoxedItem): Vector3Tuple {
  const parts = itemParts(moving);
  const envelope = unionOf(parts);
  const roof = isRoofMounted(moving.catalogId);
  const bounds = roof ? roofZoneBox(van) : cargoBox(van);
  const others = items.filter((i) => i.id !== moving.id && isRoofMounted(i.catalogId) === roof).flatMap((i) => itemParts(i));
  const obstacles = roof ? others : [...wheelArchBoxes(van), ...others];

  return {
    x: moving.position.x + magnetOffset(envelope, parts, 'x', bounds, obstacles),
    y: moving.position.y,
    z: moving.position.z + magnetOffset(envelope, parts, 'z', bounds, obstacles),
  };
}
