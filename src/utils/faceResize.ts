import { Vector3 } from 'three';
import type { CamperItem, DimensionsMM, VanSpec } from '../types/camper.types';
import { cargoBox, isDecor, wheelArchBoxes } from './collisionBoxes';
import { itemParts } from './shapes/itemShape';
import { roundToTenthMM, sizeLimits } from './resizeLimits';
import { mmToM, mToMm, snapToGridM } from './unitConverters';

// Push/pull resizing of a parametric module by one of its faces (ResizeHandles3D). The opposite face
// stays where it is in van space: a width change ΔW moves the centre by ΔW/2 towards the dragged
// face. The dragged face sticks to any wall, ceiling, wheel arch or neighbour face within MAGNET_M
// of the pointer, and snaps to the grid otherwise, and the size stays within the module's limits (resizeLimits.ts). Pure: metres
// in van space, millimetres for dimensions.

export type ResizeFace = '+x' | '-x' | '+z' | '-z' | '+y' | '-y';

export const MAGNET_M = 0.03;

type Axis = 'x' | 'y' | 'z';
type Item = Pick<CamperItem, 'id' | 'catalogId' | 'position' | 'rotation' | 'dimensions'>;

const DIM_OF: Record<'x' | 'y' | 'z', keyof DimensionsMM> = { x: 'width', y: 'height', z: 'depth' };

// Local outward normal of a face
export function faceNormal(face: ResizeFace): Vector3 {
  const sign = face[0] === '+' ? 1 : -1;
  const axis = face[1] as Axis;
  return new Vector3(axis === 'x' ? sign : 0, axis === 'y' ? sign : 0, axis === 'z' ? sign : 0);
}

// The face's outward normal in van space (quarter turns about Y), rounded to an exact axis
export function vanNormal(item: Pick<Item, 'rotation'>, face: ResizeFace): Vector3 {
  const n = faceNormal(face).applyAxisAngle(new Vector3(0, 1, 0), item.rotation.y);
  return new Vector3(Math.round(n.x), Math.round(n.y), Math.round(n.z));
}

const axisOf = (n: Vector3): Axis => (n.x !== 0 ? 'x' : n.z !== 0 ? 'z' : 'y');

// Centre of a face in van space (side faces at mid height)
export function faceCentre(item: Item, face: ResizeFace): Vector3 {
  const { width, height, depth } = item.dimensions;
  const half = face[1] === 'x' ? mmToM(width) / 2 : face[1] === 'z' ? mmToM(depth) / 2 : 0;
  const centre = new Vector3(item.position.x, item.position.y + mmToM(height) / 2, item.position.z);
  if (face === '+y') return centre.setY(item.position.y + mmToM(height));
  if (face === '-y') return centre.setY(item.position.y);
  return centre.addScaledVector(vanNormal(item, face), half);
}

// Van-space span of the item on each axis (quarter turns swap width and depth)
function spans(item: Item): Record<Axis, [number, number]> {
  const n = vanNormal(item, '+x');
  const w = mmToM(item.dimensions.width);
  const d = mmToM(item.dimensions.depth);
  const [sx, sz] = n.x !== 0 ? [w, d] : [d, w];
  const { x, y, z } = item.position;
  return { x: [x - sx / 2, x + sx / 2], y: [y, y + mmToM(item.dimensions.height)], z: [z - sz / 2, z + sz / 2] };
}

// Overlapping or touching (within 2 mm): a shelf resting on two sides aligns its edges with their faces
const TOUCH_M = 0.002;
const facing = (a: [number, number], b: [number, number]): boolean => a[0] <= b[1] + TOUCH_M && b[0] <= a[1] + TOUCH_M;

// Face planes the dragged face may stick to along `axis`
function magnetTargets(van: VanSpec, items: readonly Item[], item: Item, axis: Axis): number[] {
  const cargo = cargoBox(van);
  const targets = [cargo.min[axis], cargo.max[axis]];
  const own = spans(item);
  const others = axis === 'x' ? (['y', 'z'] as const) : axis === 'z' ? (['x', 'y'] as const) : (['x', 'z'] as const);
  const boxes = [
    ...wheelArchBoxes(van),
    ...items.filter((other) => other.id !== item.id && !isDecor(other.catalogId)).flatMap((other) => itemParts(other)),
  ];
  for (const box of boxes) {
    if (others.every((o) => facing(own[o], [box.min[o], box.max[o]]))) targets.push(box.min[axis], box.max[axis]);
  }
  return targets;
}

export interface FaceResizeResult {
  dimensions: DimensionsMM;
  position: CamperItem['position'];
  magnet: boolean; // the face stuck to a wall or a neighbour
}

// New size and pivot when `face` of `start` (the module at drag start) is pulled `offsetM` metres
// outwards (negative pushes it in)
export function resizeByFace(
  van: VanSpec,
  items: readonly Item[],
  start: Item,
  face: ResizeFace,
  offsetM: number,
  snapStepMM: number,
): FaceResizeResult {
  const n = vanNormal(start, face);
  const axis = axisOf(n);
  const sign = n[axis];
  const key = DIM_OF[face[1] as Axis];
  const span = spans(start)[axis];
  const anchor = sign > 0 ? span[0] : span[1]; // the opposite face, fixed
  let coord = (sign > 0 ? span[1] : span[0]) + sign * offsetM;

  // A wall or neighbour face within MAGNET_M of the pointer wins over the grid
  let magnet = false;
  let best = MAGNET_M;
  let stuck = coord;
  for (const target of magnetTargets(van, items, start, axis)) {
    const distance = Math.abs(target - coord);
    if (distance < best && Math.sign(target - anchor) === sign) {
      best = distance;
      stuck = target;
      magnet = true;
    }
  }
  coord = magnet ? stuck : snapToGridM(coord, snapStepMM);
  // The dragged face stops at the cargo walls, floor and ceiling
  const cargo = cargoBox(van);
  coord = Math.min(cargo.max[axis], Math.max(cargo.min[axis], coord));

  const { min, max } = sizeLimits(van, start.catalogId);
  // A side face never pushes the top through the ceiling: the base stays put
  const ceilingRoom = face === '+y' ? mToMm(mmToM(van.interiorHeightMM) - start.position.y) : Infinity;
  const limitMax = Math.min(max[key], ceilingRoom);
  const rawMM = roundToTenthMM(mToMm(Math.abs(coord - anchor)));
  const sizeMM = roundToTenthMM(Math.min(limitMax, Math.max(min[key], rawMM)));
  if (sizeMM !== rawMM) magnet = false;
  const size = mmToM(sizeMM);

  const position = { ...start.position };
  // Side faces move the centre; the bottom face moves the base (the top stays put)
  if (axis !== 'y') position[axis] = Math.round((anchor + (sign * size) / 2) * 1e6) / 1e6;
  else if (sign < 0) position.y = Math.round((anchor - size) * 1e6) / 1e6;
  return { dimensions: { ...start.dimensions, [key]: sizeMM }, position, magnet };
}
