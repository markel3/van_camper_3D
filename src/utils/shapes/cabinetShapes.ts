import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import type { ShapePart } from '../../types/shape.types';
import { CABINET_FRONT_T_M, PULL_D_M, pullBox } from './benchShape';
import { part, span } from './shapeBox';

// Kitchen block, drawer unit, overhead cabinet and fridges: layouts shared by the props
// (components/canvas/props) and their collision shapes. Metres, pivot at the base centre, front +Z.
// Fronts, pulls and handles are absorbed in the body part they belong to.

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const metres = (dims: DimensionsMM) => [mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth)] as const;

// Worktop nose over the fronts of kitchen and drawer unit: the pulls fit under it
export const WORKTOP_OVERHANG_M = PULL_D_M;
export const PLINTH_SETBACK_M = 0.05;
export const FRONT_GAP_M = 0.003; // gap between fronts: reads as a thin dark line

// ---- Drawer columns (cabinetParts DrawerStack) and door pulls (CabinetDoor) ----
export interface DrawerRow {
  frontH: number;
  y: number; // centre of the front
}

// Rows of a drawer column between `bottom` and `top`; relative heights, top drawer first
export function drawerRows(bottom: number, top: number, heights: readonly number[]): DrawerRow[] {
  const total = heights.reduce((sum, value) => sum + value, 0);
  let cursor = top;
  return heights.map((value) => {
    const pitch = ((top - bottom) * value) / total;
    const y = cursor - pitch / 2;
    cursor -= pitch;
    return { frontH: pitch - FRONT_GAP_M, y };
  });
}

export const drawerPullY = (row: DrawerRow): number => row.y + row.frontH / 2 - Math.min(0.045, row.frontH * 0.25);

// Door pull: vertical, near the free edge and the top of the door
export function doorPull(hingeX: number, side: 1 | -1, width: number, bottom: number, height: number) {
  const length = Math.min(0.14, height * 0.35);
  return { x: hingeX + side * (width - 0.04), y: bottom + height - length / 2 - 0.05, length };
}

const drawerPullParts = (prefix: string, x: number, rows: readonly DrawerRow[], face: number): ShapePart[] =>
  rows.map((row, i) => part(`${prefix}-${i}`, pullBox(x, drawerPullY(row), face, 0.12)));

// ---- Kitchen block (KitchenProp) ----
export const KITCHEN_WORKTOP_T_M = 0.03;
export const KITCHEN_PLINTH_H_M = 0.08;
export const KITCHEN_HOB_T_M = 0.006;
export const TAP_R_M = 0.014;

export interface KitchenLayout {
  tapH: number;
  worktopTop: number;
  worktopBottom: number;
  carcassD: number;
  carcassZ: number;
  frontZ: number; // carcass front plane
  hasDrawers: boolean;
  hob: { w: number; d: number; x: number; z: number };
  sink: { w: number; d: number; x: number; z: number };
  tap: { x: number; z: number; reach: number; top: number }; // top: neck height above the worktop
}

export const KITCHEN_DRAWER_HEIGHTS = [1, 1.15, 1.45] as const;

export function kitchenLayout(w: number, h: number, d: number): KitchenLayout {
  const tapH = Math.min(clamp(h * 0.2, 0.06, 0.26), h * 0.3);
  const worktopTop = h - tapH;
  const carcassD = d - WORKTOP_OVERHANG_M - CABINET_FRONT_T_M;
  const hasDrawers = w >= 0.6;
  const sinkW = Math.min(0.4, (w / 2) * 0.82, hasDrawers ? w * 0.42 : w * 0.7);
  const sinkD = Math.min(0.36, d * 0.6);
  const sinkX = hasDrawers ? w / 4 : 0;
  const sinkZ = WORKTOP_OVERHANG_M / 2;
  return {
    tapH,
    worktopTop,
    worktopBottom: worktopTop - KITCHEN_WORKTOP_T_M,
    carcassD,
    carcassZ: -d / 2 + carcassD / 2,
    frontZ: -d / 2 + carcassD,
    hasDrawers,
    hob: { w: Math.min(0.29, w / 2 - 0.08), d: Math.min(0.5, d - 0.08), x: -w / 4, z: WORKTOP_OVERHANG_M / 2 },
    sink: { w: sinkW, d: sinkD, x: sinkX, z: sinkZ },
    // Gooseneck: column rising behind the sink, arching over towards the bowl centre
    tap: {
      x: sinkX + Math.min(0.12, sinkW * 0.3),
      z: Math.max(sinkZ - sinkD / 2 - 0.04, -d / 2 + 0.03),
      reach: Math.min(0.2, sinkD * 0.55),
      top: tapH * 0.92,
    },
  };
}

export function kitchenShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = kitchenLayout(w, h, d);
  const { tap } = l;
  const r = TAP_R_M;
  const face = l.frontZ + CABINET_FRONT_T_M;
  const bottom = KITCHEN_PLINTH_H_M + FRONT_GAP_M / 2;
  const splitX = l.hasDrawers ? 0 : -w / 2;
  const door = doorPull(w / 2 - FRONT_GAP_M / 2, -1, w / 2 - splitX - FRONT_GAP_M, bottom, l.worktopBottom - KITCHEN_PLINTH_H_M - 1.5 * FRONT_GAP_M);
  const parts = [
    part('plinth', span(-w / 2 + 0.005, w / 2 - 0.005, 0, KITCHEN_PLINTH_H_M, -d / 2, l.frontZ - PLINTH_SETBACK_M)),
    part('body', span(-w / 2, w / 2, KITCHEN_PLINTH_H_M, l.worktopBottom, -d / 2, face)),
    part('door-pull', pullBox(door.x, door.y, face, door.length, true)),
    ...(l.hasDrawers ? drawerPullParts('drawer-pull', -w / 4, drawerRows(bottom, l.worktopBottom - FRONT_GAP_M, KITCHEN_DRAWER_HEIGHTS), face) : []),
    part('worktop', span(-w / 2, w / 2, l.worktopBottom, l.worktopTop, -d / 2, d / 2)),
    // Column with its base and side lever, then the spout arching forward
    part('tap', span(tap.x - r * 1.8, tap.x + r * 2.1, l.worktopTop, l.worktopTop + tap.top + r * 0.7, tap.z - r * 1.8, tap.z + 0.055)),
    part('spout', span(tap.x - r, tap.x + r, l.worktopTop + tap.top * 0.72 - r, l.worktopTop + tap.top + r * 0.7, tap.z, tap.z + tap.reach + r)),
  ];
  if (l.hasDrawers) {
    const { hob } = l;
    parts.push(part('hob', span(hob.x - hob.w / 2, hob.x + hob.w / 2, l.worktopTop, l.worktopTop + KITCHEN_HOB_T_M, hob.z - hob.d / 2, hob.z + hob.d / 2)));
  }
  return { parts };
}

// ---- Drawer unit (DrawerUnitProp) ----
export interface DrawerUnitLayout {
  worktopT: number;
  plinthH: number;
  bodyH: number;
  carcassD: number;
  carcassZ: number;
  frontZ: number;
}

export const DRAWER_UNIT_HEIGHTS = [1, 1.2, 1.5] as const;

export function drawerUnitLayout(h: number, d: number): DrawerUnitLayout {
  const worktopT = clamp(h * 0.035, 0.02, 0.03);
  const plinthH = clamp(h * 0.09, 0.04, 0.09);
  const carcassD = d - WORKTOP_OVERHANG_M - CABINET_FRONT_T_M;
  return {
    worktopT,
    plinthH,
    bodyH: Math.max(0.05, h - worktopT - plinthH),
    carcassD,
    carcassZ: -d / 2 + carcassD / 2,
    frontZ: -d / 2 + carcassD,
  };
}

export function drawerUnitShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = drawerUnitLayout(h, d);
  const face = l.frontZ + CABINET_FRONT_T_M;
  const rows = drawerRows(l.plinthH + FRONT_GAP_M / 2, h - l.worktopT - FRONT_GAP_M, DRAWER_UNIT_HEIGHTS);
  return {
    parts: [
      part('plinth', span(-w / 2 + 0.005, w / 2 - 0.005, 0, l.plinthH, -d / 2, l.frontZ - PLINTH_SETBACK_M)),
      part('body', span(-w / 2, w / 2, l.plinthH, h - l.worktopT, -d / 2, face)),
      ...drawerPullParts('drawer-pull', 0, rows, face),
      part('worktop', span(-w / 2, w / 2, h - l.worktopT, h, -d / 2, d / 2)),
    ],
  };
}

// ---- Overhead cabinet (OverheadCabinetProp) ----
export const OVERHEAD_LED_H_M = 0.008; // the bottom board is raised by this much to house the strip

const OVERHEAD_BOTTOM_T_M = 0.018;
const MAX_FLAP_W_M = 0.55; // one flap per ~half metre, like the reference altillos

export function overheadLayout(w: number, h: number, d: number) {
  const carcassD = d - CABINET_FRONT_T_M - PULL_D_M;
  const carcassH = h - OVERHEAD_LED_H_M;
  const count = Math.max(1, Math.round(w / MAX_FLAP_W_M));
  const pitch = w / count;
  return {
    carcassD,
    carcassZ: -d / 2 + carcassD / 2,
    frontZ: -d / 2 + carcassD,
    carcassH,
    bottomT: OVERHEAD_BOTTOM_T_M,
    count,
    pitch,
    flapW: pitch - FRONT_GAP_M,
    flapH: carcassH - OVERHEAD_BOTTOM_T_M - FRONT_GAP_M,
    flapTop: h - FRONT_GAP_M / 2,
  };
}

// Carcass with its flaps; the bottom board runs under the pulls to the front edge. The LED strip
// under the bottom board (8 mm) is absorbed below the body.
export const overheadShape = (dims: DimensionsMM): ItemShape => {
  const [w, h, d] = metres(dims);
  const l = overheadLayout(w, h, d);
  const face = l.frontZ + CABINET_FRONT_T_M;
  const pulls = Array.from({ length: l.count }, (_, i) =>
    part(`pull-${i}`, pullBox(-w / 2 + l.pitch * (i + 0.5), l.flapTop - l.flapH + 0.035, face, Math.min(0.16, l.flapW * 0.35))),
  );
  return {
    parts: [
      part('body', span(-w / 2, w / 2, OVERHEAD_LED_H_M, h, -d / 2, face)),
      part('bottom', span(-w / 2, w / 2, OVERHEAD_LED_H_M, OVERHEAD_LED_H_M + l.bottomT, face, d / 2)),
      ...pulls,
    ],
  };
};

// ---- Fridges (FridgeProp) ----
const FRIDGE_FRONT_MAX_M = 0.045; // gasket + door + handle
export const FRIDGE_DOOR_MARGIN_M = 0.006;
const FRIDGE_GRILLE_H_M = 0.07;

export function fridgeLayout(w: number, h: number, d: number) {
  const front = Math.min(FRIDGE_FRONT_MAX_M, d * 0.2);
  const grilleH = Math.min(FRIDGE_GRILLE_H_M, h * 0.14);
  const doorBottom = grilleH + FRIDGE_DOOR_MARGIN_M;
  return {
    front,
    bodyD: d - front,
    faceZ: d / 2 - front,
    grilleH,
    doorBottom,
    doorH: Math.max(0.05, h - doorBottom - FRIDGE_DOOR_MARGIN_M),
    doorW: w - 2 * FRIDGE_DOOR_MARGIN_M,
  };
}

export function fridgeShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = fridgeLayout(w, h, d);
  return {
    parts: [
      part('body', span(-w / 2, w / 2, 0, h, -d / 2, l.faceZ)),
      part('door', span(-l.doorW / 2, l.doorW / 2, l.doorBottom, l.doorBottom + l.doorH, l.faceZ, d / 2)),
    ],
  };
}
