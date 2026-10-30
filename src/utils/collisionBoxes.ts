import { Box3, Vector3 } from 'three';
import type { CamperItem, VanSpec } from '../types/camper.types';
import { mmToM } from './unitConverters';

// Collision primitives shared by the collision engine (collisionMath.ts) and the fit adaptation
// rules (fitAdaptation.ts). All boxes live in van space:
// X centred, Y = 0 on the cargo floor, Z = 0 at the bulkhead, metres.

// Interpenetration up to this depth is tolerated, so flush contact never flags.
export const COLLISION_TOLERANCE_M = 0.002;

const AXES = ['x', 'y', 'z'] as const;

export const isDecor = (catalogId: string): boolean => catalogId.startsWith('decor-');

// adaptToFit (optional) lets the fit rules honour the per-item opt-out (fitAdaptation.ts)
export type BoxedItem = Pick<CamperItem, 'id' | 'catalogId' | 'position' | 'rotation' | 'dimensions' | 'adaptToFit'>;

// Module envelope: the box of its dimensions. The pivot is the centre of the base; odd quarter turns
// around Y swap width and depth. Collisions, surface snap, magnets and carry use the real shape
// instead (utils/shapes/itemShape.ts: itemParts); the envelope is only for what is meant to be the
// overall size: the notch footprint rule, the walkthrough minimap and the dimensions themselves.
export function itemBox(item: Omit<BoxedItem, 'id' | 'catalogId'>): Box3 {
  const quarterTurns = Math.round(item.rotation.y / (Math.PI / 2));
  const swapped = Math.abs(quarterTurns) % 2 === 1;
  const sizeX = mmToM(swapped ? item.dimensions.depth : item.dimensions.width);
  const sizeZ = mmToM(swapped ? item.dimensions.width : item.dimensions.depth);
  const { x, y, z } = item.position;

  return new Box3(
    new Vector3(x - sizeX / 2, y, z - sizeZ / 2),
    new Vector3(x + sizeX / 2, y + mmToM(item.dimensions.height), z + sizeZ / 2),
  );
}

// Usable interior volume: side walls, floor, ceiling, bulkhead and rear doors.
export function cargoBox(van: VanSpec): Box3 {
  const halfWidth = mmToM(van.interiorWidthMM) / 2;
  return new Box3(
    new Vector3(-halfWidth, 0, 0),
    new Vector3(halfWidth, mmToM(van.interiorHeightMM), mmToM(van.interiorLengthMM)),
  );
}

// Left and right wheel arches: against each side wall, centred on the rear axle.
export function wheelArchBoxes(van: VanSpec): [Box3, Box3] {
  const halfWidth = mmToM(van.interiorWidthMM) / 2;
  const archWidth = mmToM(van.wheelArchWidthMM);
  const archHeight = mmToM(van.wheelArchHeightMM);
  const zMin = mmToM(van.rearAxleZMM - van.wheelArchLengthMM / 2);
  const zMax = mmToM(van.rearAxleZMM + van.wheelArchLengthMM / 2);

  return [
    new Box3(new Vector3(-halfWidth, 0, zMin), new Vector3(-halfWidth + archWidth, archHeight, zMax)),
    new Box3(new Vector3(halfWidth - archWidth, 0, zMin), new Vector3(halfWidth, archHeight, zMax)),
  ];
}

// True when the boxes interpenetrate by more than the tolerance on every axis.
export function overlaps(a: Box3, b: Box3): boolean {
  return AXES.every(
    (axis) => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]) > COLLISION_TOLERANCE_M,
  );
}

// True when `inner` sticks out of `outer` by more than the tolerance on any side.
export function exceeds(inner: Box3, outer: Box3): boolean {
  return AXES.some(
    (axis) =>
      outer.min[axis] - inner.min[axis] > COLLISION_TOLERANCE_M ||
      inner.max[axis] - outer.max[axis] > COLLISION_TOLERANCE_M,
  );
}

