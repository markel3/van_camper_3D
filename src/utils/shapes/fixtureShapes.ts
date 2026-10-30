import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import { PULL_D_M } from './benchShape';
import { part, span } from './shapeBox';

// Toilet, shower cabin, Lagun table and roof modules: layouts shared by their props and collision
// shapes. Metres, pivot at the base centre, front +Z.

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const metres = (dims: DimensionsMM) => [mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth)] as const;

// ---- Portable toilet (ToiletProp): waste tank, fresh-water body and lid, front latch ----
export function toiletShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const tankH = h * 0.44;
  const bodyH = h * 0.47;
  return {
    parts: [
      part('tank', span(-w / 2, w / 2, 0, tankH, -d / 2, d / 2 - 0.012)),
      part('latch', span(-w * 0.15, w * 0.15, tankH * 0.36, tankH * 0.54, d / 2 - 0.012, d / 2)),
      part('body', span(-w * 0.485, w * 0.485, tankH, tankH + bodyH, -d / 2, d * 0.44)),
      part('lid', span(-w * 0.45, w * 0.45, tankH + bodyH, h, -d * 0.41, d * 0.41)),
    ],
  };
}

// ---- Shower + WC cabin (ShowerCabinProp) ----
export const SHOWER_WALL_T_M = 0.02;
export const SHOWER_FRAME_W_M = 0.035; // door frame jambs and header
export const SHOWER_DOOR_T_M = 0.02;
export const SHOWER_PIPE_R_M = 0.011;
const SHOWER_HEAD_R_M = 0.085;

export function showerLayout(w: number, h: number, d: number) {
  // The door's pull stands proud of the front: the cabin is set back by its depth
  const cabinD = d - PULL_D_M;
  const backZ = -d / 2;
  const doorZ = backZ + cabinD - SHOWER_DOOR_T_M; // hinge plane (back of the door frame)
  const trayH = clamp(h * 0.035, 0.04, 0.08);
  const innerW = w - 2 * SHOWER_WALL_T_M;
  const innerD = cabinD - SHOWER_WALL_T_M - SHOWER_DOOR_T_M;
  const headerH = clamp(h * 0.05, 0.06, 0.12);
  const riserBottom = Math.min(0.95, h * 0.5);
  const toiletW = Math.min(0.38, innerW * 0.5);
  const toiletD = Math.min(0.46, innerD * 0.68);
  return {
    cabinD,
    doorZ,
    trayH,
    innerW,
    innerD,
    innerZ: backZ + SHOWER_WALL_T_M + innerD / 2,
    headerH,
    doorW: w - 2 * SHOWER_FRAME_W_M,
    doorH: h - trayH - headerH,
    riserX: innerW * 0.22,
    riserZ: backZ + SHOWER_WALL_T_M + SHOWER_PIPE_R_M + 0.02,
    riserBottom,
    riserTop: Math.min(h - headerH - 0.08, riserBottom + 0.9),
    armL: Math.min(0.18, innerD * 0.35),
    toilet: {
      w: toiletW,
      d: toiletD,
      h: Math.min(0.42, h * 0.24),
      x: -innerW / 2 + toiletW / 2 + 0.02,
      z: backZ + SHOWER_WALL_T_M + toiletD / 2 + 0.02,
    },
  };
}

export function showerShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = showerLayout(w, h, d);
  const back = -d / 2;
  const wall = SHOWER_WALL_T_M;
  const { toilet } = l;
  return {
    parts: [
      part('tray', span(-w / 2, w / 2, 0, l.trayH, back, l.doorZ)),
      part('back', span(-w / 2, w / 2, l.trayH, h, back, back + wall)),
      part('side-left', span(-w / 2, -w / 2 + wall, l.trayH, h, back, l.doorZ)),
      part('side-right', span(w / 2 - wall, w / 2, l.trayH, h, back, l.doorZ)),
      part('roof', span(-w / 2, w / 2, h - wall, h, back, l.doorZ + SHOWER_DOOR_T_M)),
      // Door frame and door, with the door's oak pull standing proud of it
      part('front', span(-w / 2, w / 2, l.trayH, h, l.doorZ, l.doorZ + SHOWER_DOOR_T_M)),
      part('pull', span(l.doorW / 2 - 0.05 - 0.01, l.doorW / 2 - 0.05 + 0.01, l.trayH + l.doorH * 0.5 - 0.1, l.trayH + l.doorH * 0.5 + 0.1, l.doorZ + SHOWER_DOOR_T_M * 0.8, l.doorZ + SHOWER_DOOR_T_M * 0.8 + PULL_D_M)),
      part('toilet', span(toilet.x - toilet.w / 2, toilet.x + toilet.w / 2, l.trayH, l.trayH + toilet.h * 0.98, toilet.z - toilet.d / 2, toilet.z + toilet.d / 2)),
      part('riser', span(l.riserX - 0.06, l.riserX + 0.06, l.riserBottom, l.riserTop + SHOWER_PIPE_R_M, l.riserZ - 0.015, l.riserZ + 0.035)),
      part('shower-head', span(l.riserX - SHOWER_HEAD_R_M, l.riserX + SHOWER_HEAD_R_M, l.riserTop - 0.0325, l.riserTop + SHOWER_PIPE_R_M, l.riserZ - SHOWER_PIPE_R_M, l.riserZ + l.armL + SHOWER_HEAD_R_M)),
    ],
  };
}

// ---- Lagun swivel table (LagunTableProp): open under the top, apart from its column ----
export const TABLE_BASE_R_M = 0.09;
export const TABLE_COLUMN_R_M = 0.03;
export const TABLE_KNUCKLE_R_M = 0.032;
export const TABLE_PLATE_T_M = 0.008;
const KNUCKLE_H_M = 0.05;

export function lagunLayout(w: number, h: number, d: number) {
  const topT = clamp(h * 0.035, 0.02, 0.03);
  return {
    topT,
    armY: h - topT - 0.03,
    columnX: -w / 2 + TABLE_BASE_R_M,
    armL: Math.min(w * 0.5, 0.38),
    bracketW: Math.min(0.3, w * 0.4),
    bracketD: Math.min(0.2, d * 0.5),
  };
}

export function lagunShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = lagunLayout(w, h, d);
  const k = TABLE_KNUCKLE_R_M;
  const bx = l.columnX + l.armL;
  return {
    parts: [
      part('base', span(-w / 2, -w / 2 + 2 * TABLE_BASE_R_M, 0, TABLE_PLATE_T_M, -TABLE_BASE_R_M, TABLE_BASE_R_M)),
      part('column', span(l.columnX - TABLE_COLUMN_R_M, l.columnX + TABLE_COLUMN_R_M, TABLE_PLATE_T_M, l.armY - KNUCKLE_H_M / 2, -TABLE_COLUMN_R_M, TABLE_COLUMN_R_M)),
      part('arm', span(l.columnX - k, bx + k, l.armY - KNUCKLE_H_M / 2, l.armY + KNUCKLE_H_M / 2, -k, k)),
      part('bracket', span(bx - l.bracketW / 2, bx + l.bracketW / 2, h - l.topT - 0.012, h - l.topT, -l.bracketD / 2, l.bracketD / 2)),
      part('top', span(-w / 2, w / 2, h - l.topT, h, -d / 2, d / 2)),
    ],
  };
}

// ---- Roof modules ----
// Solar panel (SolarPanelProp): aluminium frame around a recessed glass-covered wafer, open below
export function solarLayout(w: number, h: number, d: number) {
  const frame = Math.min(0.03, w * 0.08, d * 0.08);
  const recess = Math.min(0.004, h * 0.15);
  return { frame, waferT: Math.max(h * 0.3, 0.002), waferTop: h - recess };
}

export const solarShape = (dims: DimensionsMM): ItemShape => {
  const [w, h, d] = metres(dims);
  const { frame, waferT, waferTop } = solarLayout(w, h, d);
  const innerX = w / 2 - frame;
  const innerZ = d / 2 - frame;
  return {
    parts: [
      part('frame-front', span(-w / 2, w / 2, 0, h, innerZ, d / 2)),
      part('frame-back', span(-w / 2, w / 2, 0, h, -d / 2, -innerZ)),
      part('frame-left', span(-w / 2, -innerX, 0, h, -innerZ, innerZ)),
      part('frame-right', span(innerX, w / 2, 0, h, -innerZ, innerZ)),
      part('wafer', span(-innerX, innerX, waferTop - waferT, waferTop + 0.001, -innerZ, innerZ)),
    ],
  };
};

export const SKYLIGHT_FLANGE_MAX_M = 0.008;
export const SKYLIGHT_FRAME_INSET = 0.86; // frame footprint vs. flange
export const SKYLIGHT_DOME_INSET = 0.72; // dome footprint vs. flange

export function skylightLayout(h: number) {
  const flangeT = Math.min(SKYLIGHT_FLANGE_MAX_M, h * 0.12);
  const frameH = (h - flangeT) * 0.35;
  // The dome starts halfway into the frame so its base edge is hidden
  return { flangeT, frameH, domeH: h - flangeT - frameH * 0.5 };
}

export function skylightShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = skylightLayout(h);
  const frame = SKYLIGHT_FRAME_INSET / 2;
  const dome = SKYLIGHT_DOME_INSET / 2;
  return {
    parts: [
      part('flange', span(-w / 2, w / 2, 0, l.flangeT, -d / 2, d / 2)),
      part('frame', span(-w * frame, w * frame, l.flangeT, l.flangeT + l.frameH, -d * frame, d * frame)),
      part('dome', span(-w * dome, w * dome, h - l.domeH, h, -d * dome, d * dome)),
    ],
  };
}
