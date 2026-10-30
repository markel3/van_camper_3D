import { BufferGeometry, Float32BufferAttribute, PlaneGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Geometry helpers for the furniture props. All of them return metric UVs (1 unit = 1 m), so the
// photographic PBR sets keep their real-world scale on any module size.

// Box-projected metric UVs: each vertex takes the two coordinates of the plane facing its normal.
// Same convention as createMetricBoxGeometry: ±X faces → (z, y), ±Y faces → (x, z), ±Z faces → (x, y).
export function applyBoxProjectedUv(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const nx = Math.abs(normal.getX(i));
    const ny = Math.abs(normal.getY(i));
    const nz = Math.abs(normal.getZ(i));
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    if (nx >= ny && nx >= nz) uv.set([z, y], i * 2);
    else if (ny >= nz) uv.set([x, z], i * 2);
    else uv.set([x, y], i * 2);
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geometry;
}

// Remaps box-projected UVs of a part centred on the origin so its top face spans UV 0-1
// (a printed texture covering the whole part, e.g. the induction hob glass). V = 1 at the back (−Z).
export function fitUvToRect(geometry: BufferGeometry, width: number, depth: number): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / width + 0.5, 0.5 - uv.getY(i) / depth);
  uv.needsUpdate = true;
  return geometry;
}

// Board with eased (bevelled) edges: the soft highlight on the arrises is what separates a real
// panel from a CG box. The radius is clamped to the thinnest side.
export function createBevelBox(width: number, height: number, depth: number, radius = 0.002): BufferGeometry {
  const r = Math.max(0.0003, Math.min(radius, Math.min(width, height, depth) / 2 - 0.0002));
  return applyBoxProjectedUv(new RoundedBoxGeometry(width, height, depth, 2, r));
}

// Deterministic hash noise in [−1, 1] (no external dependency, stable across renders)
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// Smooth value noise in [−1, 1]
export function smoothNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

export interface CushionOptions {
  radius?: number; // corner roundness, m
  puff?: number; // extra bulge of the big faces at their centre, m
  wrinkle?: number; // amplitude of the fabric creases, m
  seed?: number;
}

// Upholstered cushion: rounded box whose large faces bulge (filling pressing the cover) and whose
// cover carries soft creases. The geometry stays inside width × height × depth (+ puff on Y).
export function createCushion(width: number, height: number, depth: number, options: CushionOptions = {}): BufferGeometry {
  const { radius = Math.min(height * 0.45, 0.04), puff = height * 0.12, wrinkle = 0.003, seed = 1 } = options;
  const core = Math.max(0.004, height - 2 * puff);
  const r = Math.max(0.0015, Math.min(radius, Math.min(width, core, depth) / 2 - 0.0005));
  const geometry = new RoundedBoxGeometry(width, core, depth, 5, r);
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const p = new Vector3();
  const hw = width / 2;
  const hd = depth / 2;
  const hh = core / 2;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    // Bulge: max at the centre of the top/bottom faces, zero along the piping
    const ex = Math.max(0, 1 - (p.x / hw) ** 2);
    const ez = Math.max(0, 1 - (p.z / hd) ** 2);
    const lift = Math.sqrt(ex * ez) * puff * Math.min(1, Math.abs(p.y) / hh);
    p.y += Math.sign(p.y) * lift;
    // Creases: low-frequency folds along the original normal, stronger near the piping
    const edge = 1 - Math.sqrt(ex * ez);
    const n = smoothNoise(p.x * 18 + seed, p.y * 18, p.z * 18 - seed);
    const k = wrinkle * (0.4 + edge) * n;
    p.x += normal.getX(i) * k;
    p.y += normal.getY(i) * k;
    p.z += normal.getZ(i) * k;
    position.setXYZ(i, p.x, p.y, p.z);
  }
  // Weld the face seams so the shading stays continuous over the rounded edges
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, 1e-5);
  geometry.dispose();
  welded.computeVertexNormals();
  return applyBoxProjectedUv(welded);
}

export interface DrapeOptions {
  // Flat top area covered by the cloth (X × Z) and its height
  width: number;
  length: number;
  topY: number;
  // How far the cloth falls over the −X/+X sides and the +Z end
  sideDrop: number;
  endDrop: number;
  // Fold amplitude, m
  rumple: number;
  seed?: number;
}

// Duvet / throw: a dense plane laid on the top area, wrapped down the two sides and the foot end,
// with large soft folds and finer creases. UVs are metric along the cloth (unfolded length).
export function createDrapedCloth(options: DrapeOptions): BufferGeometry {
  const { width, length, topY, sideDrop, endDrop, rumple, seed = 3 } = options;
  const ext = new PlaneGeometry(width + 2 * sideDrop, length + endDrop, 72, 96);
  ext.rotateX(-Math.PI / 2); // lie flat: plane X → X, plane Y → −Z
  const position = ext.getAttribute('position');
  const uv = ext.getAttribute('uv');
  const hw = width / 2;
  for (let i = 0; i < position.count; i++) {
    const ux = position.getX(i);
    // Plane spans z ∈ [−(L+e)/2, (L+e)/2]; map to cloth coordinate s ∈ [0, L+e] from the head
    const s = position.getZ(i) + (length + endDrop) / 2;
    let x = ux;
    let y = topY;
    let z = -length / 2 + s;
    // Wrap past the side edges (rounded over a small bend radius)
    const over = Math.abs(ux) - hw;
    if (over > 0) {
      const bend = 0.04;
      const a = Math.min(over / bend, Math.PI / 2);
      const rest = Math.max(0, over - bend * (Math.PI / 2));
      x = Math.sign(ux) * (hw + Math.sin(a) * bend);
      y = topY - (1 - Math.cos(a)) * bend - rest;
    }
    // Wrap past the foot end
    const beyond = s - length;
    if (beyond > 0) {
      const bend = 0.04;
      const a = Math.min(beyond / bend, Math.PI / 2);
      const rest = Math.max(0, beyond - bend * (Math.PI / 2));
      z = length / 2 + Math.sin(a) * bend;
      y -= (1 - Math.cos(a)) * bend + rest;
    }
    // Folds: big lazy waves plus fine creases, damped where the cloth hangs
    const hang = over > 0 || beyond > 0 ? 0.35 : 1;
    const fold =
      smoothNoise(ux * 3.2 + seed, s * 2.4, seed) * 0.6 +
      smoothNoise(ux * 7.5, s * 6.5 + seed, 2 * seed) * 0.3 +
      smoothNoise(ux * 19, s * 17, 3 * seed) * 0.1;
    y += Math.max(-0.4, fold) * rumple * hang + rumple * 0.6 * hang;
    position.setXYZ(i, x, y, z);
    uv.setXY(i, ux + hw + sideDrop, s);
  }
  ext.computeVertexNormals();
  return ext;
}
