import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createMetricBoxGeometry } from '../../../../utils/textures/metricBoxGeometry';

// Geometry of the wooden lining: tongue-and-groove boards with real V-grooves and individual slats.
// Every board gets its own slice of the wood image (random UV offset) and a slight tone variation
// (vertex colour), like real timber cut from different planks. UVs are metric (1 unit = 1 m).

// Deterministic per-board random in [0, 1)
function rand(index: number, seed: number): number {
  const x = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const tone = (index: number, seed: number): number => 0.9 + rand(index, seed + 7) * 0.16;

// Panel of horizontal boards in the local X-Y plane (X = board length, centred; Y from 0 up),
// front faces towards +Z at z = 0, V-grooves `groove` deep and wide at every joint.
// The grain runs along U = X (use a texture variant with the grain along U).
export function createBoardPanelGeometry(length: number, height: number, boardH: number, groove: number, seed = 1): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const x0 = -length / 2;
  const x1 = length / 2;
  const s = Math.SQRT1_2;
  const quad = (ya: number, za: number, yb: number, zb: number, n: [number, number, number], du: number, dv: number, c: number) => {
    const base = positions.length / 3;
    for (const [x, y, z] of [
      [x0, ya, za],
      [x1, ya, za],
      [x1, yb, zb],
      [x0, yb, zb],
    ] as const) {
      positions.push(x, y, z);
      normals.push(...n);
      uvs.push(x + du, y + dv);
      colors.push(c, c, c);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const count = Math.ceil(height / boardH - 1e-6);
  for (let k = 0; k < count; k++) {
    const yb = k * boardH;
    const yt = Math.min(height, yb + boardH);
    const du = rand(k, seed) * 7.3;
    const dv = rand(k, seed + 3) * 5.1;
    const c = tone(k, seed);
    const gb = k === 0 ? 0 : groove;
    const gt = yt >= height - 1e-6 ? 0 : groove;
    if (gb > 0) quad(yb, -gb, yb + gb, 0, [0, -s, s], du, dv, c * 0.82);
    quad(yb + gb, 0, yt - gt, 0, [0, 0, 1], du, dv, c);
    if (gt > 0) quad(yt - gt, 0, yt, -gt, [0, s, s], du, dv, c * 0.82);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// Ceiling slats running along Z (centres `xs`), merged into one geometry. Top faces' V runs along Z,
// so a grain-along-V texture follows the slat.
export function createSlatsGeometry(xs: readonly number[], width: number, thickness: number, length: number, seed = 5): BufferGeometry {
  const parts = xs.map((x, i) => {
    const box = createMetricBoxGeometry(width, thickness, length);
    const uv = box.getAttribute('uv');
    const du = rand(i, seed) * 3.7;
    const dv = rand(i, seed + 2) * 4.9;
    for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) + du, uv.getY(v) + dv);
    const c = tone(i, seed);
    box.setAttribute('color', new Float32BufferAttribute(new Array<number>(uv.count * 3).fill(c), 3));
    box.translate(x, 0, 0);
    return box;
  });
  const merged = mergeGeometries(parts) ?? new BufferGeometry();
  parts.forEach((part) => part.dispose());
  return merged;
}
