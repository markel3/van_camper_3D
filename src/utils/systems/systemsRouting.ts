import type {
  CamperItem,
  SystemKind,
  SystemNetworkId,
  SystemNetworkSummary,
  SystemRoute,
  SystemRoutes,
  VanInteriorFinish,
  VanSpec,
  Vector3Tuple,
} from '../../types/camper.types';
import { mmToM } from '../unitConverters';
import { portPosition, type P3, type PortName } from './systemPorts';

// Automatic routing of the installation networks between the modules in the project
// (Phase 10B). Pure geometry on van-space polylines: orthogonal runs on the floor (water) or
// along the wall/floor and wall/ceiling edges (cables), with vertical risers at the ports.
// Rendering (tubes, bends, fittings) lives in components/canvas/systems.

interface NetworkDef {
  label: string;
  kind: SystemKind;
  color: string;
  sizeLabel: string;
  radiusM: number; // tube radius used by the 3D view
  laneInsetM: number; // distance of its wall lane from the inner wall face
  jogM: number; // Z offset of its transverse runs, so parallel networks do not overlap
  runY: number; // height of the floor runs (water) / floor edge lane (cables)
}

export const NETWORKS: Readonly<Record<SystemNetworkId, NetworkDef>> = {
  coldWater: { label: 'Agua fría', kind: 'water', color: '#0ea5e9', sizeLabel: 'Ø12 mm', radiusM: 0.006, laneInsetM: 0.03, jogM: 0, runY: 0.012 },
  hotWater: { label: 'Agua caliente', kind: 'water', color: '#ef4444', sizeLabel: 'Ø12 mm', radiusM: 0.006, laneInsetM: 0.055, jogM: 0.03, runY: 0.012 },
  greyWater: { label: 'Aguas grises', kind: 'water', color: '#64748b', sizeLabel: 'Ø25 mm', radiusM: 0.0125, laneInsetM: 0.09, jogM: -0.045, runY: 0.017 },
  solar: { label: 'Solar MPPT', kind: 'electrical', color: '#f59e0b', sizeLabel: '6 mm²', radiusM: 0.004, laneInsetM: 0.012, jogM: 0, runY: 0.012 },
  dc12v: { label: '12 V DC', kind: 'electrical', color: '#f97316', sizeLabel: '4–16 mm²', radiusM: 0.004, laneInsetM: 0.024, jogM: 0.02, runY: 0.012 },
  ac230v: { label: '230 V AC', kind: 'electrical', color: '#10b981', sizeLabel: '2,5 mm²', radiusM: 0.004, laneInsetM: 0.036, jogM: -0.02, runY: 0.012 },
};

export const NETWORK_ORDER: readonly SystemNetworkId[] = ['coldWater', 'hotWater', 'greyWater', 'solar', 'dc12v', 'ac230v'];

// Ports at or above this height route along the wall/ceiling edge
const HIGH_PORT_Y_M = 1.2;
const CEILING_EDGE_OFFSET_M = 0.015;
// Water ends this close to each other and to the centre line connect straight across the floor
const DIRECT_SPAN_M = 0.5;
const CENTRE_ZONE_M = 0.6;
// Synthetic consumer: the ceiling LED strips (InteriorLiningProp), fed at their front end
export const LED_STRIPS_TARGET = 'led-strips';
const LED_X_FACTOR = 0.42;

const toVector = ([x, y, z]: P3): Vector3Tuple => ({ x, y, z });

const distance = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const polylineLength = (points: readonly P3[]): number =>
  points.slice(1).reduce((sum, point, index) => sum + distance(points[index] as P3, point), 0);

// Drops repeated and collinear corners, so every remaining corner is a real bend
function simplify(points: P3[]): P3[] {
  const unique = points.filter((point, index) => index === 0 || distance(point, points[index - 1] as P3) > 1e-6);
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true;
    const a = unique[index - 1] as P3;
    const b = unique[index + 1] as P3;
    const u = [point[0] - a[0], point[1] - a[1], point[2] - a[2]];
    const v = [b[0] - point[0], b[1] - point[1], b[2] - point[2]];
    const cross = Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!);
    return cross > 1e-9;
  });
}

interface RouteContext {
  inner: number; // half interior width
  ceilingEdgeY: number;
}

// Orthogonal path from port A to port B for one network
export function routePath(a: P3, b: P3, def: NetworkDef, ctx: RouteContext): P3[] {
  const [ax, ay, az] = a;
  const [bx, by, bz] = b;
  const zA = az + def.jogM;
  const zB = bz + def.jogM;
  const low = def.runY;
  const direct =
    def.kind === 'water' &&
    Math.abs(ax - bx) < DIRECT_SPAN_M &&
    Math.abs(ax) < CENTRE_ZONE_M &&
    Math.abs(bx) < CENTRE_ZONE_M;
  if (direct) return simplify([a, [ax, low, az], [ax, low, zA], [ax, low, zB], [bx, low, zB], [bx, low, bz], b]);

  const side = Math.sign(ax + bx) || 1;
  const lane = side * (ctx.inner - def.laneInsetM);
  const levelA = def.kind === 'electrical' && ay >= HIGH_PORT_Y_M ? ctx.ceilingEdgeY : low;
  const levelB = def.kind === 'electrical' && by >= HIGH_PORT_Y_M ? ctx.ceilingEdgeY : low;
  return simplify([
    a,
    [ax, levelA, az],
    [ax, levelA, zA],
    [lane, levelA, zA],
    [lane, levelB, zA],
    [lane, levelB, zB],
    [bx, levelB, zB],
    [bx, levelB, bz],
    b,
  ]);
}

interface Endpoint {
  id: string;
  label: string;
  point: P3;
}

const SHORT_NAMES: Readonly<Record<string, string>> = {
  'water-tank-clean-100l': 'Depósito',
  'water-pump-boiler-kit': 'Kit hidráulico',
  'kitchen-block-1000': 'Cocina',
  'shower-cabin-800': 'Ducha',
  'grey-water-tank-90l': 'Aguas grises',
  'battery-lifepo4-100ah': 'Batería',
  'fridge-65l-12v': 'Nevera',
  'inverter-2000va': 'Inversor',
  'lagun-table': 'Mesa Lagun',
  'solar-panel-100w': 'Placa solar',
  'skylight-400': 'Claraboya',
};

function endpoints(items: readonly CamperItem[], catalogId: string, port: PortName, name?: string): Endpoint[] {
  return items.flatMap((item) => {
    if (item.catalogId !== catalogId) return [];
    const point = portPosition(item, port);
    return point ? [{ id: item.id, label: name ?? SHORT_NAMES[catalogId] ?? item.name, point }] : [];
  });
}

export function computeSystemRoutes(van: VanSpec, items: readonly CamperItem[], finish: VanInteriorFinish): SystemRoutes {
  const inner = mmToM(van.interiorWidthMM) / 2;
  const cargoH = mmToM(van.interiorHeightMM);
  const ctx: RouteContext = { inner, ceilingEdgeY: cargoH - CEILING_EDGE_OFFSET_M };
  const routes: SystemRoute[] = [];
  const corners = new Map<number, P3[]>(); // route index → tuple polyline, until export

  // Each target is fed by the nearest source of its kind
  const connect = (network: SystemNetworkId, sources: Endpoint[], targets: Endpoint[]) => {
    for (const target of targets) {
      const source = [...sources].sort((p, q) => distance(p.point, target.point) - distance(q.point, target.point))[0];
      if (!source || source.id === target.id) continue;
      const points = routePath(source.point, target.point, NETWORKS[network], ctx);
      corners.set(routes.length, points);
      routes.push({
        id: `${network}:${source.id}->${target.id}`,
        network,
        fromItemId: source.id,
        toItemId: target.id,
        label: `${source.label} → ${target.label}`,
        points: points.map(toVector),
        lengthM: polylineLength(points),
      });
    }
  };
  const at = (catalogId: string, port: PortName) => endpoints(items, catalogId, port);

  // Water: tank → pump; pump/boiler → taps; drains → grey tank
  connect('coldWater', at('water-tank-clean-100l', 'waterOut'), at('water-pump-boiler-kit', 'pumpIn'));
  const taps = (port: PortName) => [
    ...at('kitchen-block-1000', port),
    ...at('shower-cabin-800', port),
  ];
  connect('coldWater', at('water-pump-boiler-kit', 'coldOut'), taps('coldIn'));
  connect('hotWater', at('water-pump-boiler-kit', 'hotOut'), taps('hotIn'));
  connect('greyWater', at('grey-water-tank-90l', 'greyIn'), taps('drainOut'));

  // Electrical: solar → battery; 12 V consumers; battery → inverter → 230 V sockets
  const battery = at('battery-lifepo4-100ah', 'dcOut');
  connect('solar', at('solar-panel-100w', 'solarOut'), battery);
  const leds: Endpoint[] = finish.ledStrips
    ? [{ id: LED_STRIPS_TARGET, label: 'Tiras LED', point: [-inner * LED_X_FACTOR, cargoH, 0.06] }]
    : [];
  connect('dc12v', battery, [
    ...at('fridge-65l-12v', 'dcIn'),
    ...at('water-pump-boiler-kit', 'dcIn'),
    ...items.flatMap((item) => (item.catalogId === 'skylight-400' ? endpoints([item], 'skylight-400', 'dcIn').map(underRoof(cargoH)) : [])),
    ...leds,
  ]);
  connect('ac230v', battery, at('inverter-2000va', 'dcIn'));
  connect('ac230v', at('inverter-2000va', 'acOut'), [...at('kitchen-block-1000', 'acIn'), ...at('lagun-table', 'acIn')]);

  // Solar: from the panel's junction box, through a roof gland, down to the ceiling
  routes.forEach((route, index) => {
    const points = corners.get(index);
    const first = points?.[0];
    if (route.network !== 'solar' || !points || !first || first[1] <= cargoH) return;
    const through = simplify([first, [first[0], ctx.ceilingEdgeY, first[2]], ...points.slice(1)]);
    route.points = through.map(toVector);
    route.lengthM = polylineLength(through);
  });

  const networks: SystemNetworkSummary[] = NETWORK_ORDER.map((network) => {
    const own = routes.filter((route) => route.network === network);
    const def = NETWORKS[network];
    return {
      network,
      kind: def.kind,
      label: def.label,
      color: def.color,
      sizeLabel: def.sizeLabel,
      totalLengthM: own.reduce((sum, route) => sum + route.lengthM, 0),
      routeCount: own.length,
    };
  });
  const total = (kind: SystemKind) =>
    networks.filter((summary) => summary.kind === kind).reduce((sum, summary) => sum + summary.totalLengthM, 0);
  return { routes, networks, waterTotalM: total('water'), electricalTotalM: total('electrical') };
}

// Roof modules are fed from inside: their port is moved to the ceiling right under them
const underRoof = (cargoH: number) => (endpoint: Endpoint): Endpoint => ({
  ...endpoint,
  point: [endpoint.point[0], cargoH, endpoint.point[2]],
});
