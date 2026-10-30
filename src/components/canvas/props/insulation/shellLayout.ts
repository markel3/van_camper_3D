import type { VanLayout } from '../../../../utils/vanLayout';
import { shellRing, slicePath, type ShellRing, type Vec2 } from './shellProfile';

// Frame layout of the bare cargo shell (large L3 panel van, REFERENCE values scaled with the
// cargo length): ring frames (side pillar + roof bow) along Z, a belt rail on each wall, the
// sliding door opening on the passenger side, and the rear door frame.

const REFERENCE_LENGTH_M = 3.705;
// Ring frame centres from the bulkhead (m, for the reference length)
const FRAME_Z_M = [0.05, 0.7, 1.42, 2.08, 2.72, 3.3, 3.665] as const;
export const SLIDING_DOOR_Z_M: readonly [number, number] = [0.12, 1.4];

export const PILLAR_W_M = 0.075; // side pillar / roof bow flange width (Z)
export const DOOR_PILLAR_W_M = 0.1; // pillars framing the sliding door and rear doors
export const PILLAR_DEPTH_M = 0.04; // pillar depth from the skin
export const BOW_DEPTH_M = 0.032; // roof bow depth from the skin
export const RAIL_DEPTH_M = 0.026; // belt rail depth
export const BELT_RAIL_Y = [0.5, 0.56] as const; // as fractions of the interior height
export const HOLE_PITCH_M = 0.24; // lightening holes along the frames
export const SHELL_FLOOR_Y_M = 0.0015; // bare floor sheet just above the cargo floor plane

export interface ShellFrame {
  z: number;
  width: number;
  // The passenger pillar is missing inside the sliding door opening
  right: boolean;
}

export interface ShellLayout {
  ring: ShellRing;
  right: Vec2[];
  roof: Vec2[];
  left: Vec2[];
  frames: ShellFrame[];
  cargoL: number;
}

export function shellLayout(layout: VanLayout): ShellLayout {
  const ring = shellRing(layout.cargoW, layout.cargoH);
  const k = layout.cargoL / REFERENCE_LENGTH_M;
  const [doorFront, doorRear] = SLIDING_DOOR_Z_M;
  const frames = FRAME_Z_M.map((z, i): ShellFrame => {
    const zz = i === FRAME_Z_M.length - 1 ? layout.cargoL - (REFERENCE_LENGTH_M - z) : z * k;
    const edge = i === 0 || i === FRAME_Z_M.length - 1 || Math.abs(zz - doorRear) < 0.1;
    return {
      z: zz,
      width: edge ? DOOR_PILLAR_W_M : PILLAR_W_M,
      right: !(zz > doorFront + 0.1 && zz < doorRear - 0.1),
    };
  });
  return {
    ring,
    right: slicePath(ring.points, ring.right),
    roof: slicePath(ring.points, ring.roof),
    left: slicePath(ring.points, ring.left),
    frames,
    cargoL: layout.cargoL,
  };
}

// Open spans between consecutive frames (insulation bays), for a wall side or the roof
export function frameBays(shell: ShellLayout, side: 'right' | 'left' | 'roof', gap = 0.004): [number, number][] {
  const frames = shell.frames.filter((frame) => side !== 'right' || frame.right);
  const bays: [number, number][] = [];
  let start = 0;
  for (const frame of frames) {
    const end = frame.z - frame.width / 2 - gap;
    if (end - start > 0.05) bays.push([start, end]);
    start = frame.z + frame.width / 2 + gap;
  }
  if (shell.cargoL - start > 0.05) bays.push([start, shell.cargoL]);
  return bays;
}
