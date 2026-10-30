import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { ShapePart } from '../../types/shape.types';

// Box helpers shared by the module shapes (utils/shapes) and the collision engine. Metres.

export type Vec3 = readonly [number, number, number];

const roundToMicron = (m: number): number => Math.round(m * 1e6) / 1e6;

// Box from its bounds
export const span = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box3 =>
  new Box3(new Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)));

// Box from its centre and size
export const sized = ([cx, cy, cz]: Vec3, [sx, sy, sz]: Vec3): Box3 =>
  span(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2);

export const part = (id: string, box: Box3): ShapePart => ({ id, box });

// One level of a prop's group nesting: position and XYZ Euler rotation (R3F props)
export interface Placement {
  position?: Vec3;
  rotation?: Vec3;
}

// AABB of a local box placed through nested groups (outermost first): tilted cushions, a turned kettle
export function placedAabb(local: Box3, ...chain: readonly Placement[]): Box3 {
  const matrix = new Matrix4();
  for (const { position = [0, 0, 0], rotation = [0, 0, 0] } of chain) {
    matrix.multiply(
      new Matrix4().compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(1, 1, 1)),
    );
  }
  return local.clone().applyMatrix4(matrix);
}

// Union of several boxes (empty box when there are none)
export const unionOf = (boxes: readonly Box3[]): Box3 => boxes.reduce((acc, box) => acc.union(box), new Box3());

// `a` minus `cut`, as up to six disjoint boxes (slabs on X, then Z, then Y). Pieces thinner than
// a micrometre are dropped. Returns [a] when they do not intersect.
export function subtractBox(a: Box3, cut: Box3): Box3[] {
  if (!a.intersectsBox(cut)) return [a.clone()];
  const pieces: Box3[] = [];
  const rest = a.clone();
  const keep = (box: Box3) => {
    const size = box.getSize(new Vector3());
    if (size.x > 1e-6 && size.y > 1e-6 && size.z > 1e-6) pieces.push(box);
  };
  for (const axis of ['x', 'z', 'y'] as const) {
    if (cut.min[axis] > rest.min[axis]) {
      const low = rest.clone();
      low.max[axis] = cut.min[axis];
      keep(low);
      rest.min[axis] = cut.min[axis];
    }
    if (cut.max[axis] < rest.max[axis]) {
      const high = rest.clone();
      high.min[axis] = cut.max[axis];
      keep(high);
      rest.max[axis] = cut.max[axis];
    }
  }
  return pieces;
}

// Exact cos/sin of a yaw for whole quarter turns (other angles fall back to Math)
function yawTrig(rotationY: number): { cos: number; sin: number } {
  const quarter = Math.PI / 2;
  const turns = Math.round(rotationY / quarter);
  if (Math.abs(rotationY - turns * quarter) > 1e-9) return { cos: Math.cos(rotationY), sin: Math.sin(rotationY) };
  const index = ((turns % 4) + 4) % 4;
  return { cos: [1, 0, -1, 0][index]!, sin: [0, 1, 0, -1][index]! };
}

// AABB of `box` with each plan corner mapped by `map` (Y is unchanged by a yaw)
function mapPlanBox(box: Box3, map: (x: number, z: number) => [number, number], dy: number): Box3 {
  const out = new Box3();
  for (const x of [box.min.x, box.max.x]) {
    for (const z of [box.min.z, box.max.z]) {
      const [px, pz] = map(x, z);
      out.expandByPoint(new Vector3(roundToMicron(px), 0, roundToMicron(pz)));
    }
  }
  out.min.y = roundToMicron(box.min.y + dy);
  out.max.y = roundToMicron(box.max.y + dy);
  return out;
}

interface Pose {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
}

// Module-local box → van space. Same convention as three.js rotation.y: x' = x·cos θ + z·sin θ, z' = −x·sin θ + z·cos θ
export function localToVanBox(pose: Pose, local: Box3): Box3 {
  const { cos, sin } = yawTrig(pose.rotation.y);
  const { x: px, y: py, z: pz } = pose.position;
  return mapPlanBox(local, (x, z) => [px + x * cos + z * sin, pz - x * sin + z * cos], py);
}

// Van-space box → module-local frame (inverse of localToVanBox)
export function vanToLocalBox(pose: Pose, box: Box3): Box3 {
  const { cos, sin } = yawTrig(pose.rotation.y);
  const { x: px, y: py, z: pz } = pose.position;
  return mapPlanBox(box, (x, z) => [(x - px) * cos - (z - pz) * sin, (x - px) * sin + (z - pz) * cos], -py);
}

// A local box turned by `rotationY` about the module pivot (props that turn their own drawing)
export const turnBox = (box: Box3, rotationY: number): Box3 =>
  rotationY === 0 ? box.clone() : localToVanBox({ position: { x: 0, y: 0, z: 0 }, rotation: { y: rotationY } }, box);
