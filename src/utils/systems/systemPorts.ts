import type { CamperItem } from '../../types/camper.types';
import { mmToM } from '../unitConverters';

// Connection points (racores / bornes) of each catalogue module, in the module's local frame:
// metres from the base centre, X across the width, Y up, Z towards the front (+Z). They follow
// the procedural props, so pipes and cables meet visible fittings. Pure data: no Three.js.

// Plain [x, y, z] point in metres (routing works on tuples; routes are exported as Vector3Tuple)
export type P3 = [number, number, number];

export type PortName =
  | 'waterOut'
  | 'pumpIn'
  | 'coldOut'
  | 'hotOut'
  | 'coldIn'
  | 'hotIn'
  | 'drainOut'
  | 'greyIn'
  | 'dcOut'
  | 'dcIn'
  | 'acOut'
  | 'acIn'
  | 'solarOut';

type PortTable = Partial<Record<PortName, (w: number, h: number, d: number) => P3>>;

// Kitchen sink centre X, as in KitchenProp
const kitchenSinkX = (w: number) => w / 2 - Math.min(0.42, w * 0.42) / 2 - Math.min(0.06, w * 0.08);
// Hydraulic kit layout, as in HydraulicKitProp
const kitBoilerX = (w: number) => -w / 2 + 0.02 + (w * 0.66) / 2;
const kitPumpX = (w: number) => w / 2 - 0.06;

const PORTS: Readonly<Record<string, PortTable>> = {
  'water-tank-clean-100l': { waterOut: (w) => [w / 2 - 0.01, 0.04, 0] },
  'water-pump-boiler-kit': {
    pumpIn: (w, _h, d) => [kitPumpX(w), 0.04, d / 2 - 0.01],
    coldOut: (w, h, d) => [kitPumpX(w), h - 0.01, -d * 0.12],
    hotOut: (w, h) => [kitBoilerX(w) - (w * 0.66) / 4, h - 0.01, 0.05],
    dcIn: (w, _h, d) => [kitPumpX(w) + 0.03, 0.05, d / 2 - 0.01],
  },
  'kitchen-block-1000': {
    coldIn: (w, _h, d) => [kitchenSinkX(w) - 0.04, 0.12, -d / 2 + 0.04],
    hotIn: (w, _h, d) => [kitchenSinkX(w) + 0.04, 0.12, -d / 2 + 0.04],
    drainOut: (w, _h, d) => [kitchenSinkX(w), 0.1, -d / 2 + 0.12],
    acIn: (w, h, d) => [-w / 2 + 0.12, h * 0.72, -d / 2 + 0.01],
  },
  'shower-cabin-800': {
    coldIn: (w, _h, d) => [(w - 0.04) * 0.22 - 0.035, 0.06, -d / 2 + 0.03],
    hotIn: (w, _h, d) => [(w - 0.04) * 0.22 + 0.035, 0.06, -d / 2 + 0.03],
    drainOut: (w, _h, d) => [(w - 0.04) * 0.2, 0.02, -d / 2 + 0.02 + (d - 0.04) / 2 + (d - 0.04) * 0.15],
  },
  'grey-water-tank-90l': { greyIn: (w, h) => [-w * 0.3, h - 0.01, 0] },
  'battery-lifepo4-100ah': { dcOut: (w, h, d) => [w * 0.34, h - 0.005, -d * 0.1] },
  'fridge-65l-12v': { dcIn: (w, h, d) => [w * 0.3, h * 0.2, -d / 2 + 0.01] },
  'inverter-2000va': {
    dcIn: (w, h, d) => [-w / 2 + 0.01, h * 0.5, d * 0.15],
    acOut: (w, h) => [w / 2 - 0.01, h * 0.45, 0],
  },
  'lagun-table': { acIn: (w, _h, d) => [-w / 2 + 0.09, 0.25, -d / 2 + 0.02] },
  'solar-panel-100w': { solarOut: (_w, _h, d) => [0, 0.005, -d * 0.3] },
  'skylight-400': { dcIn: (w) => [w * 0.3, 0.005, 0] },
};

export const hasPort = (catalogId: string, port: PortName): boolean => PORTS[catalogId]?.[port] !== undefined;

// Port position in van space (metres), or null when the module has no such port
export function portPosition(item: CamperItem, port: PortName): P3 | null {
  const local = PORTS[item.catalogId]?.[port];
  if (!local) return null;
  const [x, y, z] = local(mmToM(item.dimensions.width), mmToM(item.dimensions.height), mmToM(item.dimensions.depth));
  // Three.js rotation about Y: x' = x cos + z sin, z' = −x sin + z cos
  const cos = Math.cos(item.rotation.y);
  const sin = Math.sin(item.rotation.y);
  return [item.position.x + x * cos + z * sin, item.position.y + y, item.position.z - x * sin + z * cos];
}
