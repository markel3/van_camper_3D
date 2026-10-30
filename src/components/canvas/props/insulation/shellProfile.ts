import { BufferGeometry, Float32BufferAttribute } from 'three';

// Cross-section of the bare cargo shell (inside face of the steel skin) and the sweep builders used
// by the bare shell, its frames and the insulation sheets laid on it.
//
// The ring runs in the X-Y plane of van space: up the passenger wall (+X), over the roof and down the
// driver wall (−X). Its left-hand normal (tangent rotated +90°) always points into the cargo, so an
// "inset" d moves a point d metres from the skin towards the cabin. Everything is swept along Z.
//
// The side profile follows the calibrated van-l3h2.glb inner skin, sampled by ray casts (REFERENCE
// values, 3 mm inside the model's faces to avoid z-fighting): ≈ 45 mm outside the cargo box below
// the belt line, then the tumblehome closes in to the roof corner. The cargo box (collisions)
// is unchanged: only the frames near the roof corner reach into it, as on the real van.

export interface Vec2 {
  x: number;
  y: number;
}

// [height as a fraction of the interior height, offset beyond the cargo wall (m)]
const SIDE_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0.042],
  [0.545, 0.047],
  [0.63, 0.037],
  [0.735, 0.023],
  [0.84, 0.01],
  [0.94, -0.004],
];
// Roof corner, relative to the interior height: [ΔY above cargoH, offset beyond the cargo wall]
const CORNER_PROFILE: readonly (readonly [number, number])[] = [
  [-0.02, -0.023],
  [0.008, -0.045],
  [0.02, -0.075],
  [0.026, -0.11],
];
// Inside face of the roof skin above the official interior height
export const ROOF_SKIN_ABOVE_M = 0.026;
// Skin offset beyond the cargo wall at floor level (procedural body walls start beyond it)
export const SIDE_SKIN_OFFSET_M = 0.047;

export interface ShellRing {
  points: Vec2[];
  // Index ranges (inclusive) of the three panels: passenger wall, roof (with corners), driver wall
  right: [number, number];
  roof: [number, number];
  left: [number, number];
}

export function shellRing(cargoW: number, cargoH: number): ShellRing {
  const inner = cargoW / 2;
  const half: Vec2[] = [
    ...SIDE_PROFILE.map(([f, dx]) => ({ x: inner + dx, y: f * cargoH })),
    ...CORNER_PROFILE.map(([dy, dx]) => ({ x: inner + dx, y: cargoH + dy })),
  ];
  const mirrored = [...half].reverse().map((p) => ({ x: -p.x, y: p.y }));
  const points = [...half, { x: 0, y: cargoH + ROOF_SKIN_ABOVE_M }, ...mirrored];
  const wallEnd = SIDE_PROFILE.length; // first corner point closes the wall panel
  const last = points.length - 1;
  return { points, right: [0, wallEnd], roof: [wallEnd, last - wallEnd], left: [last - wallEnd, last] };
}

export const slicePath = (points: readonly Vec2[], [from, to]: readonly [number, number]): Vec2[] =>
  points.slice(from, to + 1);

// Cumulative arc length at each vertex
export function arcLengths(path: readonly Vec2[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    out.push(out[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return out;
}

// Part of a path between two arc lengths (clamped), with interpolated end points
export function subPath(path: readonly Vec2[], s0: number, s1: number): Vec2[] {
  const s = arcLengths(path);
  const total = s[s.length - 1] ?? 0;
  const from = Math.max(0, Math.min(total, s0));
  const to = Math.max(from, Math.min(total, s1));
  const at = (target: number): Vec2 => {
    for (let i = 1; i < path.length; i++) {
      if (target <= s[i]! || i === path.length - 1) {
        const a = path[i - 1]!;
        const b = path[i]!;
        const span = s[i]! - s[i - 1]! || 1;
        const t = Math.max(0, Math.min(1, (target - s[i - 1]!) / span));
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
    }
    return path[0]!;
  };
  const out = [at(from)];
  for (let i = 0; i < path.length; i++) if (s[i]! > from && s[i]! < to) out.push(path[i]!);
  out.push(at(to));
  return out;
}

// Part of a wall path between two heights (the walls rise monotonically)
export function pathBetweenHeights(path: readonly Vec2[], y0: number, y1: number): Vec2[] {
  const s = arcLengths(path);
  const arcAt = (y: number): number => {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      if (y <= b.y || i === path.length - 1) return s[i - 1]! + (s[i]! - s[i - 1]!) * Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y || 1)));
    }
    return 0;
  };
  return subPath(path, arcAt(y0), arcAt(y1));
}

// Inward unit normal per vertex (averaged at joints)
function vertexNormals(path: readonly Vec2[]): Vec2[] {
  return path.map((_, i) => {
    let nx = 0;
    let ny = 0;
    for (const [a, b] of [
      [i - 1, i],
      [i, i + 1],
    ] as const) {
      const p = path[a];
      const q = path[b];
      if (!p || !q) continue;
      const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      nx += -(q.y - p.y) / length;
      ny += (q.x - p.x) / length;
    }
    const length = Math.hypot(nx, ny) || 1;
    return { x: nx / length, y: ny / length };
  });
}

export const insetPath = (path: readonly Vec2[], inset: number): Vec2[] => {
  const normals = vertexNormals(path);
  return path.map((p, i) => ({ x: p.x + normals[i]!.x * inset, y: p.y + normals[i]!.y * inset }));
};

type V3 = readonly [number, number, number];

// Minimal indexed geometry accumulator with metric UVs
export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];

  get empty(): boolean {
    return this.indices.length === 0;
  }

  // Quad a-b-c-d (in order around the edge) facing `normal`; winding fixed up automatically
  quad(a: V3, b: V3, c: V3, d: V3, uv: readonly [number, number][], normal: V3 | readonly V3[]): void {
    const base = this.positions.length / 3;
    const corners = [a, b, c, d];
    corners.forEach((p, i) => {
      const n = (Array.isArray(normal[0]) ? (normal as readonly V3[])[i] : (normal as V3))!;
      this.positions.push(p[0], p[1], p[2]);
      this.normals.push(n[0], n[1], n[2]);
      const [u, v] = uv[i]!;
      this.uvs.push(u, v);
    });
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const n0 = (Array.isArray(normal[0]) ? (normal as readonly V3[])[0] : (normal as V3))!;
    if (cx * n0[0] + cy * n0[1] + cz * n0[2] >= 0) this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

export interface SweepParts {
  front?: boolean; // face at the larger inset, towards the cabin
  sides?: boolean; // faces at z0 and z1
  ends?: boolean; // faces at both path ends
}

// A layer of the shell swept along Z: the band between insets d0 < d1 of `path`, from z0 to z1.
// Front UVs: u = arc length, v = z − z0 (metres). Sides: u = arc length, v = depth. Ends: u = z, v = depth.
export function thickSweep(
  builder: MeshBuilder,
  path: readonly Vec2[],
  d0: number,
  d1: number,
  z0: number,
  z1: number,
  parts: SweepParts = { front: true, sides: true, ends: true },
): void {
  if (path.length < 2 || z1 - z0 <= 1e-5) return;
  const normals = vertexNormals(path);
  const back = insetPath(path, d0);
  const face = insetPath(path, d1);
  const s = arcLengths(path);
  const depth = d1 - d0;
  for (let i = 1; i < path.length; i++) {
    const a = face[i - 1]!;
    const b = face[i]!;
    const na = normals[i - 1]!;
    const nb = normals[i]!;
    const sa = s[i - 1]!;
    const sb = s[i]!;
    if (parts.front) {
      builder.quad([a.x, a.y, z0], [b.x, b.y, z0], [b.x, b.y, z1], [a.x, a.y, z1],
        [[sa, 0], [sb, 0], [sb, z1 - z0], [sa, z1 - z0]],
        [[na.x, na.y, 0], [nb.x, nb.y, 0], [nb.x, nb.y, 0], [na.x, na.y, 0]]);
    }
    if (parts.sides && depth > 1e-5) {
      const ba = back[i - 1]!;
      const bb = back[i]!;
      for (const [z, nz] of [[z0, -1], [z1, 1]] as const) {
        builder.quad([ba.x, ba.y, z], [bb.x, bb.y, z], [b.x, b.y, z], [a.x, a.y, z],
          [[sa, 0], [sb, 0], [sb, depth], [sa, depth]], [0, 0, nz]);
      }
    }
  }
  if (parts.ends && depth > 1e-5) {
    for (const [i, neighbourIndex] of [[0, 1], [path.length - 1, path.length - 2]] as const) {
      const p = back[i]!;
      const q = face[i]!;
      // Outward along the path at this end
      const tx = path[i]!.x - path[neighbourIndex]!.x;
      const ty = path[i]!.y - path[neighbourIndex]!.y;
      const length = Math.hypot(tx, ty) || 1;
      builder.quad([p.x, p.y, z0], [q.x, q.y, z0], [q.x, q.y, z1], [p.x, p.y, z1],
        [[0, 0], [0, depth], [z1 - z0, depth], [z1 - z0, 0]], [tx / length, ty / length, 0]);
    }
  }
}
