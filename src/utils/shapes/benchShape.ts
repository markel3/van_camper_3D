import type { Box3 } from 'three';
import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape, ShapePart } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import { part, span } from './shapeBox';

// Chests and benches (StorageBenchProp: locker, seat-chest). One layout drives the prop and the
// collision shape. The carcass is a hollow shell standing on the van floor (sides, back, a black
// kick board and a face frame around the door), so its inside is open storage. Metres, front +Z.

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const CABINET_FRONT_T_M = 0.019; // lacquered MDF front
// Depth of the oak bar pulls (cabinetParts OakPull): fronts are set back by it so pulls stay inside the module
export const PULL_D_M = 0.022;
export const PULL_H_M = 0.018;
export const PULL_L_M = 0.12;

// An oak bar pull standing proud of a front whose face is at `face` (+Z): its centre at (x, y)
export const pullBox = (x: number, y: number, face: number, length: number, vertical = false): Box3 => {
  const [hx, hy] = vertical ? [PULL_H_M / 2, length / 2] : [length / 2, PULL_H_M / 2];
  return span(x - hx, x + hx, y - hy, y + hy, face, face + PULL_D_M);
};
export const BENCH_BOARD_M = 0.018; // lid and carcass boards
export const BENCH_BACKBOARD_T_M = 0.018;
export const BENCH_LID_GAP_M = 0.003; // shadow gap between the lid and the fixed strip
export const BENCH_MARGIN_M = 0.014; // face frame visible around the door
const SEAT_H_M = 0.46; // seat (cushion top) height of the seat-chest
const CUSHION_T_M = 0.1;
const BACK_T_M = 0.1; // backrest cushion thickness
export const BACKREST_TILT_RAD = 0.05;

export interface BenchLayout {
  seatTop: number;
  cushionT: number;
  chestH: number; // top of the lid
  carcassH: number; // top of the carcass, under the lid
  backD: number; // backrest depth (0 without cushions)
  chestD: number;
  chestZ: number; // centre of the chest along Z
  backZ: number; // back face of the chest
  faceZ: number; // carcass front plane: the door sits in front of it
  carcassD: number;
  plinthH: number; // kick board under the door
  stripD: number; // fixed strip behind the lid
  lidD: number;
  doorW: number;
  doorH: number;
  doorY: number; // door centre
  backH: number; // backrest cushion height
}

// `cushions`: seat-chest variant with a seat cushion and a backrest against the back
export function benchLayout(w: number, h: number, d: number, cushions: boolean): BenchLayout {
  const seatTop = cushions ? Math.min(SEAT_H_M, h * 0.55) : h;
  const cushionT = cushions ? Math.min(CUSHION_T_M, seatTop * 0.3) : 0;
  const chestH = seatTop - cushionT;
  const carcassH = chestH - BENCH_BOARD_M;
  const backD = cushions ? BENCH_BACKBOARD_T_M + Math.min(BACK_T_M, d * 0.2) : 0;
  const chestD = d - backD;
  const chestZ = d / 2 - chestD / 2;
  const backZ = chestZ - chestD / 2;
  const faceZ = d / 2 - PULL_D_M - CABINET_FRONT_T_M;
  const plinthH = clamp(chestH * 0.12, 0.03, 0.07);
  const stripD = clamp(chestD * 0.15, 0.05, 0.09);
  const doorH = Math.max(0.05, carcassH - plinthH - 2 * BENCH_MARGIN_M);
  return {
    seatTop,
    cushionT,
    chestH,
    carcassH,
    backD,
    chestD,
    chestZ,
    backZ,
    faceZ,
    carcassD: faceZ - backZ,
    plinthH,
    stripD,
    lidD: chestD - stripD - BENCH_LID_GAP_M,
    doorW: w - 2 * BENCH_MARGIN_M,
    doorH,
    doorY: plinthH + BENCH_MARGIN_M + doorH / 2,
    backH: h - seatTop + cushionT * 0.5,
  };
}

export const benchPullLength = (doorW: number): number => Math.min(0.16, doorW * 0.3);

export const benchShape = (cushions: boolean) => (dims: DimensionsMM): ItemShape => {
  const w = mmToM(dims.width);
  const h = mmToM(dims.height);
  const d = mmToM(dims.depth);
  const l = benchLayout(w, h, d, cushions);
  const b = BENCH_BOARD_M;
  const inner = w / 2 - b;
  const parts: ShapePart[] = [
    part('side-left', span(-w / 2, -inner, 0, l.carcassH, l.backZ, l.faceZ)),
    part('side-right', span(inner, w / 2, 0, l.carcassH, l.backZ, l.faceZ)),
    part('back', span(-inner, inner, 0, l.carcassH, l.backZ, l.backZ + b)),
    part('kick', span(-inner, inner, 0, l.plinthH + BENCH_MARGIN_M, l.faceZ - b, l.faceZ)),
    part('frame-top', span(-inner, inner, l.carcassH - BENCH_MARGIN_M, l.carcassH, l.faceZ - b, l.faceZ)),
    // Door and its pull (the pull depth is the set-back of the front)
    part('door', span(-l.doorW / 2, l.doorW / 2, l.doorY - l.doorH / 2, l.doorY + l.doorH / 2, l.faceZ, l.faceZ + CABINET_FRONT_T_M)),
    part('pull', pullBox(0, l.doorY + l.doorH / 2 - 0.04, l.faceZ + CABINET_FRONT_T_M, benchPullLength(l.doorW))),
    // Fixed strip and lid (the lid reaches the front edge, over the door)
    part('top', span(-w / 2, w / 2, l.carcassH, l.chestH, l.backZ, d / 2)),
  ];
  if (cushions) {
    const back = -d / 2;
    parts.push(part('seat', span(-w / 2 + 0.005, w / 2 - 0.005, l.chestH, l.seatTop, d / 2 - l.lidD + 0.0025, d / 2 - 0.0025)));
    parts.push(part('backboard', span(-w / 2, w / 2, l.chestH, h, back, back + BENCH_BACKBOARD_T_M)));
    // Backrest cushion leaning back on the board, its foot on the seat line
    const lean = l.backH * Math.sin(BACKREST_TILT_RAD);
    parts.push(
      part('backrest', span(-w / 2 + 0.005, w / 2 - 0.005, l.seatTop - l.cushionT * 0.5, h, back + BENCH_BACKBOARD_T_M, back + l.backD + lean)),
    );
  }
  return {
    parts,
    openSpace: span(-inner, inner, 0, l.carcassH, l.backZ + b, l.faceZ - b),
  };
};
