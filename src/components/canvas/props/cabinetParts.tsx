import { BoxGeometry, type BufferGeometry, type Material } from 'three';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { createBevelBox } from './propGeometry';
import { propMaterials } from './propMaterials';
import { Part, useGeometries } from './propParts';
import { Hinge, Slide } from './articulation';
import { CABINET_FRONT_T_M, PULL_D_M, PULL_H_M, PULL_L_M } from '../../../utils/shapes/benchShape';
import { FRONT_GAP_M as SHARED_FRONT_GAP_M, doorPull, drawerPullY, drawerRows } from '../../../utils/shapes/cabinetShapes';

// Shared cabinet-making parts for the kitchen, drawer unit, overhead cabinet and benches:
// full-overlay fronts with eased edges and shadow gaps, solid-oak pulls and drawer boxes.

export const FRONT_T_M = CABINET_FRONT_T_M; // lacquered MDF front (shared with the fit rules)
export const FRONT_GAP_M = SHARED_FRONT_GAP_M; // gap between fronts: reads as a thin dark line
const DRAWER_BOARD_M = 0.012;

// Solid-oak bar pull, long side along X (drawers) or Y (doors)
export function OakPull({
  material,
  position,
  vertical = false,
  length = PULL_L_M,
}: {
  material: Material;
  position: [number, number, number];
  vertical?: boolean;
  length?: number;
}) {
  const g = useGeometries(
    () => ({
      pull: vertical
        ? createBevelBox(PULL_H_M, length, PULL_D_M, 0.004)
        : createBevelBox(length, PULL_H_M, PULL_D_M, 0.004),
    }),
    [vertical, length],
  );
  return <Part geometry={g.pull} material={material} position={[position[0], position[1], position[2] + PULL_D_M / 2]} />;
}

interface DrawerStackProps {
  x: number; // centre of the column
  width: number; // column width (fronts are narrower by the gaps)
  bottom: number; // Y of the lowest front's bottom edge
  top: number; // Y of the highest front's top edge
  // Relative heights, top drawer first (e.g. [1, 1, 1.4] for a deeper bottom drawer)
  heights: readonly number[];
  frontZ: number; // carcass front plane: the fronts sit in front of it
  boxDepth: number;
  front: Material;
  carcass: Material;
  pull: Material;
  open: boolean;
}

// Column of drawers: fronts with oak pulls; drawer boxes (open top) slide out with them on +Z.
export function DrawerStack({ x, width, bottom, top, heights, frontZ, boxDepth, front, carcass, pull, open }: DrawerStackProps) {
  const frontW = width - FRONT_GAP_M;
  const boxW = frontW - 0.05;
  const travel = boxDepth * 0.75;
  // Shared with the collision shapes (utils/shapes/cabinetShapes.ts)
  const rows = drawerRows(bottom, top, heights);
  const key = rows.map((row) => row.frontH.toFixed(4)).join('|');
  const g = useGeometries(() => {
    const out: Record<string, BufferGeometry> = {
      bottom: createMetricBoxGeometry(boxW, DRAWER_BOARD_M, boxDepth),
    };
    rows.forEach((row, index) => {
      const boxH = Math.max(0.04, row.frontH * 0.7);
      out[`front${index}`] = createBevelBox(frontW, row.frontH, FRONT_T_M, 0.0025);
      out[`side${index}`] = createMetricBoxGeometry(DRAWER_BOARD_M, boxH, boxDepth);
      out[`back${index}`] = createMetricBoxGeometry(boxW, boxH, DRAWER_BOARD_M);
    });
    return out;
    // `key` stands for `rows`
  }, [frontW, boxW, boxDepth, key]);

  return (
    <group>
      {rows.map((row, index) => {
        const boxH = Math.max(0.04, row.frontH * 0.7);
        const geometry = g[`front${index}`];
        const side = g[`side${index}`];
        const back = g[`back${index}`];
        return (
          <Slide key={index} position={[x, row.y, frontZ]} openTravel={travel} open={open}>
            {geometry && <Part geometry={geometry} material={front} position={[0, 0, FRONT_T_M / 2]} />}
            <OakPull material={pull} position={[0, drawerPullY(row) - row.y, FRONT_T_M]} />
            <group position={[0, -row.frontH / 2 + 0.015, -boxDepth / 2]}>
              {g.bottom && <Part geometry={g.bottom} material={carcass} position={[0, DRAWER_BOARD_M / 2, 0]} castShadow={false} />}
              {side && <Part geometry={side} material={carcass} position={[-boxW / 2 + DRAWER_BOARD_M / 2, boxH / 2, 0]} castShadow={false} />}
              {side && <Part geometry={side} material={carcass} position={[boxW / 2 - DRAWER_BOARD_M / 2, boxH / 2, 0]} castShadow={false} />}
              {back && <Part geometry={back} material={carcass} position={[0, boxH / 2, -boxDepth / 2 + DRAWER_BOARD_M / 2]} castShadow={false} />}
            </group>
          </Slide>
        );
      })}
    </group>
  );
}

interface DoorProps {
  // Hinge edge: the door spans from x0 towards x0 + side·width
  hingeX: number;
  side: 1 | -1;
  width: number;
  bottom: number;
  height: number;
  frontZ: number;
  openAngle: number;
  front: Material;
  pull: Material;
  open: boolean;
}

// Full-overlay door with a vertical oak pull near its free edge, hinged on a vertical edge
export function CabinetDoor({ hingeX, side, width, bottom, height, frontZ, openAngle, front, pull, open }: DoorProps) {
  const g = useGeometries(() => ({ door: createBevelBox(width, height, FRONT_T_M, 0.0025) }), [width, height]);
  const handle = doorPull(hingeX, side, width, bottom, height);
  return (
    <Hinge position={[hingeX, 0, frontZ]} axis="y" openAngle={openAngle} open={open}>
      <Part geometry={g.door} material={front} position={[side * (width / 2), bottom + height / 2, FRONT_T_M / 2]} />
      <OakPull material={pull} vertical length={handle.length} position={[handle.x - hingeX, handle.y, FRONT_T_M]} />
    </Hinge>
  );
}

// Dark plane just in front of the carcass, behind the fronts: the gaps between fronts read as
// shadow lines, and an open front shows a dark interior instead of the carcass face.
export function ShadowBack({ x = 0, width, height, y, z }: { x?: number; width: number; height: number; y: number; z: number }) {
  const g = useGeometries(() => ({ plane: new BoxGeometry(width, height, 0.002) }), [width, height]);
  return <Part geometry={g.plane} material={propMaterials.gasket()} position={[x, y, z + 0.001]} castShadow={false} />;
}
