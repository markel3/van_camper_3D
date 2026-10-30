// 1 Three.js unit = 1 metre; the UI works in millimetres (ARCHITECTURE.md §3).
export const mmToM = (mm: number): number => mm / 1000;
export const mToMm = (m: number): number => m * 1000;

// Rounds a metric coordinate to the nearest grid step. Works in whole millimetres
// so the result never carries floating-point residue (e.g. 0.30000000000000004).
export const snapToGridM = (m: number, stepMM: number): number =>
  mmToM(Math.round(mToMm(m) / stepMM) * stepMM);
