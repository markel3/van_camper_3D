import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape, ShapePart } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import { part, span } from './shapeBox';

// Bought-in devices (battery, tanks, inverter, water kit): layouts shared by their props and their
// collision shapes. Metres, pivot at the base centre, front +Z. Labels, LEDs and studs that stand
// less than 5 mm proud are absorbed in the body.

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const metres = (dims: DimensionsMM) => [mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth)] as const;

// ---- LiFePO4 battery (BatteryProp) ----
export const BATTERY_FRONT_DETAIL_M = 0.004; // LCD and bezel stand proud of the case
export const BATTERY_BOOT_R_M = 0.014;

export function batteryLayout(w: number, h: number, d: number) {
  const termH = clamp(h * 0.09, 0.008, 0.022); // boot + post above the lid
  const lidH = clamp(h * 0.12, 0.012, 0.03);
  const caseH = h - termH - lidH;
  const caseD = d - BATTERY_FRONT_DETAIL_M;
  return {
    termH,
    lidH,
    caseH,
    caseD,
    caseZ: -BATTERY_FRONT_DETAIL_M / 2,
    lidTop: caseH + lidH,
    termX: w / 2 - Math.max(0.03, w * 0.16),
    termZ: -caseD * 0.1,
    gripW: Math.min(0.04, w * 0.12),
  };
}

export function batteryShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = batteryLayout(w, h, d);
  const boot = BATTERY_BOOT_R_M * 1.15;
  const gripZ = l.caseZ + l.caseD * 0.15;
  const parts: ShapePart[] = [part('case', span(-w / 2, w / 2, 0, l.lidTop, -d / 2, d / 2 - BATTERY_FRONT_DETAIL_M))];
  for (const s of [-1, 1]) {
    parts.push(part(`terminal${s}`, span(s * l.termX - boot, s * l.termX + boot, l.lidTop, h, l.termZ - boot, l.termZ + boot)));
    const gx = s * (w / 2 - l.gripW / 2 - 0.004);
    parts.push(part(`grip${s}`, span(gx - l.gripW / 2, gx + l.gripW / 2, l.lidTop, l.lidTop + l.termH * 0.6, gripZ - l.caseD * 0.225, gripZ + l.caseD * 0.225)));
  }
  return { parts };
}

// ---- Fresh and grey water tanks (WaterTankProp) ----
export const TANK_RIB_DEPTH_M = 0.006;

export function tankLayout(w: number, h: number, d: number) {
  const capH = clamp(h * 0.09, 0.012, 0.035);
  return { capH, shellH: h - capH, capR: clamp(Math.min(w, d) * 0.14, 0.02, 0.06), capX: w * 0.25 };
}

export function tankShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = tankLayout(w, h, d);
  const collar = l.capR * 1.3;
  return {
    parts: [
      part('shell', span(-w / 2, w / 2, 0, l.shellH, -d / 2, d / 2)),
      part('cap', span(l.capX - collar, l.capX + collar, l.shellH, h, -collar, collar)),
    ],
  };
}

// ---- Inverter (InverterProp): case, end caps and fins fill the whole box ----
export const inverterShape = (dims: DimensionsMM): ItemShape => {
  const [w, h, d] = metres(dims);
  return { parts: [part('case', span(-w / 2, w / 2, 0, h, -d / 2, d / 2))] };
};

// ---- Water pump + boiler kit (HydraulicKitProp) ----
export const KIT_PLATE_T_M = 0.015;
export const KIT_PIPE_R_M = 0.009;

export function hydraulicKitLayout(w: number, h: number, d: number) {
  const boilerR = Math.min(d * 0.43, (h - KIT_PLATE_T_M - 0.07) / 2);
  const boilerL = w * 0.66;
  const boilerX = -w / 2 + 0.02 + boilerL / 2;
  const boilerY = KIT_PLATE_T_M + 0.02 + boilerR;
  const motorR = Math.min(0.045, d * 0.13);
  const motorL = Math.min(0.14, d * 0.4);
  const headD = Math.min(0.1, d * 0.28);
  return {
    boilerR,
    boilerL,
    boilerX,
    boilerY,
    boilerTop: boilerY + boilerR,
    pipeTop: h - KIT_PIPE_R_M,
    pumpX: w / 2 - 0.06,
    motorR,
    motorL,
    headD,
    // Pump head centre: the motor runs forward from the head and stops 10 mm inside the front
    pumpZ: d / 2 - 0.01 - motorL - headD / 2,
    hotX: boilerX - boilerL * 0.25,
    coldX: boilerX + boilerL * 0.25,
  };
}

export function hydraulicKitShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = hydraulicKitLayout(w, h, d);
  const r = KIT_PIPE_R_M;
  const headW = l.motorR * 1.1;
  const pumpTop = KIT_PLATE_T_M + l.motorR * 2.2;
  return {
    parts: [
      part('plate', span(-w / 2, w / 2, 0, KIT_PLATE_T_M, -d / 2, d / 2)),
      // Boiler on its saddles, with the end cap on the −X end
      part('boiler', span(l.boilerX - l.boilerL / 2 - 0.01, l.boilerX + l.boilerL / 2, KIT_PLATE_T_M, l.boilerTop, -l.boilerR, l.boilerR)),
      part('pump', span(l.pumpX - headW, l.pumpX + headW, KIT_PLATE_T_M, pumpTop, l.pumpZ - l.headD / 2, l.pumpZ + l.headD / 2 + l.motorL)),
      part('hot-pipe', span(l.hotX - r, l.hotX + r, l.boilerTop, h, -r, 0.05)),
      part('cold-pipe', span(l.coldX - r, l.coldX + r, l.boilerTop, h, -r, r)),
      part('pump-pipe', span(l.pumpX - r, l.pumpX + r, pumpTop, h, l.pumpZ - r, l.pumpZ + r)),
      part('link-pipe', span(l.pumpX - r, l.pumpX + r, l.pipeTop - r, h, Math.min(l.pumpZ, 0) - r, Math.max(l.pumpZ, 0) + r)),
      part('feed-pipe', span(Math.min(l.coldX, l.pumpX) - r, Math.max(l.coldX, l.pumpX) + r, l.pipeTop - r, h, -r, r)),
    ],
  };
}
