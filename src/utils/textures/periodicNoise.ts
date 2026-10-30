// Tileable value noise for procedural textures. Every lattice wraps on an integer period,
// so a field sampled over u, v ∈ [0, 1) repeats without seams.

// Deterministic integer hash → [0, 1). Same seed, same texture on every load.
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);
const wrap = (i: number, period: number): number => ((i % period) + period) % period;

// Value noise in [0, 1) over the unit tile, with `periodX` × `periodY` lattice cells.
// Different periods per axis give stretched noise (wood fibres, brushed metal).
export function periodicNoise(u: number, v: number, periodX: number, periodY: number, seed: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = fade(x - xi);
  const ty = fade(y - yi);
  const x0 = wrap(xi, periodX);
  const x1 = wrap(xi + 1, periodX);
  const y0 = wrap(yi, periodY);
  const y1 = wrap(yi + 1, periodY);
  const top = hash2(x0, y0, seed) + (hash2(x1, y0, seed) - hash2(x0, y0, seed)) * tx;
  const bottom = hash2(x0, y1, seed) + (hash2(x1, y1, seed) - hash2(x0, y1, seed)) * tx;
  return top + (bottom - top) * ty;
}

// Fractal sum of `octaves` layers; periods double each octave so the sum stays tileable.
// Result normalised to [0, 1).
export function periodicFbm(
  u: number,
  v: number,
  periodX: number,
  periodY: number,
  octaves: number,
  seed: number,
): number {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    const scale = 2 ** octave;
    sum += periodicNoise(u, v, periodX * scale, periodY * scale, seed + octave * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
  }
  return sum / total;
}
