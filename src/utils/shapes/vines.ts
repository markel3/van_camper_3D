import { Box3, CatmullRomCurve3, Matrix4, Quaternion, Vector3 } from 'three';

// Trailing foliage paths (pothos-like vines) shared by the decor props (canvas/props/decor/foliage)
// and their collision shapes: deterministic, so a prop always grows the same plant and its shape
// hugs exactly those stems and leaves. Pure three.js maths, no geometry.

export const VINE_STEM_R_M = 0.0016;
// Leaf blade (createLeafGeometry): 1 unit long along +Y from the petiole, cupped towards +Z
const LEAF_BOX = new Box3(new Vector3(-0.42, -0.03, 0), new Vector3(0.42, 1, 0.07));

// Deterministic PRNG so a prop always grows the same plant
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export interface VineOptions {
  count: number;
  // Rim the vines spill over (centre at the origin)
  rimRadius: number;
  rimY: number;
  // Lowest point the vines may reach (stays inside the module box)
  minY: number;
  // Maximum horizontal spread of the stems from the axis
  maxRadius: number;
  leafSize: number;
  seed: number;
}

export interface VinePaths {
  curves: CatmullRomCurve3[];
  leaves: Matrix4[]; // leaf transforms (position, orientation, size)
}

// Vines spilling over a pot rim and hanging down, leaves alternating along each stem
export function growVines(options: VineOptions): VinePaths {
  const { count, rimRadius, rimY, minY, maxRadius, leafSize, seed } = options;
  const random = seededRandom(seed);
  const curves: CatmullRomCurve3[] = [];
  const leaves: Matrix4[] = [];
  const up = new Vector3(0, 1, 0);
  for (let v = 0; v < count; v++) {
    const angle = (v / count) * Math.PI * 2 + random() * 0.6;
    const dir = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const drop = (rimY - minY) * (0.45 + random() * 0.55);
    const out = Math.min(maxRadius, rimRadius + 0.03 + random() * 0.03);
    const points = [
      dir.clone().multiplyScalar(rimRadius * 0.6).setY(rimY + 0.02),
      dir.clone().multiplyScalar(rimRadius + 0.012).setY(rimY + 0.01),
      dir.clone().multiplyScalar(out).setY(rimY - drop * 0.3),
      dir.clone().multiplyScalar(out * (0.9 + random() * 0.15)).setY(rimY - drop * 0.7),
      dir.clone().multiplyScalar(out * (0.8 + random() * 0.2)).setY(rimY - drop),
    ];
    // A little sideways sway
    points.forEach((p, i) => {
      if (i > 1) p.add(new Vector3(-dir.z, 0, dir.x).multiplyScalar((random() - 0.5) * 0.04));
    });
    const curve = new CatmullRomCurve3(points);
    curves.push(curve);
    const length = curve.getLength();
    const n = Math.max(3, Math.floor(length / (leafSize * 0.75)));
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 0.5);
      const at = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const side = i % 2 === 0 ? 1 : -1;
      // Leaf direction: away from the stem, sideways, drooping, facing outwards
      const sideways = new Vector3().crossVectors(tangent, up).normalize().multiplyScalar(side);
      const leafDir = sideways.clone().multiplyScalar(0.8).add(dir.clone().multiplyScalar(0.5)).addScaledVector(up, -0.25).normalize();
      const quaternion = new Quaternion().setFromUnitVectors(up, leafDir);
      // Spin about the leaf axis so the blade faces outwards, with some randomness
      quaternion.multiply(new Quaternion().setFromAxisAngle(up, angle + (random() - 0.5) * 1.2));
      const scale = leafSize * (0.6 + 0.6 * (1 - t) + random() * 0.25);
      leaves.push(new Matrix4().compose(at, quaternion, new Vector3(scale, scale, scale)));
    }
  }
  return { curves, leaves };
}

// Box hugging the stems and leaves of a vine set
export function vinesBox({ curves, leaves }: VinePaths): Box3 {
  const box = new Box3();
  for (const curve of curves) curve.getPoints(48).forEach((point) => box.expandByPoint(point));
  box.expandByScalar(VINE_STEM_R_M);
  for (const leaf of leaves) box.union(LEAF_BOX.clone().applyMatrix4(leaf));
  return box;
}
