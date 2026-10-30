import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3, type BufferGeometry } from 'three';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { getCabinetFinish, propMaterials } from './propMaterials';
import { finishMaterials } from './finishMaterials';
import { createBevelBox, fitUvToRect } from './propGeometry';
import { Part, useGeometries, type PropProps, type Vec3Tuple } from './propParts';
import { DOOR_OPEN_RAD } from './articulation';
import { CabinetDoor, DrawerStack, FRONT_GAP_M, ShadowBack } from './cabinetParts';
import { TapWater } from '../water/TapWater';
import {
  KITCHEN_DRAWER_HEIGHTS,
  KITCHEN_HOB_T_M,
  KITCHEN_PLINTH_H_M,
  PLINTH_SETBACK_M,
  TAP_R_M,
  kitchenLayout,
} from '../../../utils/shapes/cabinetShapes';

const PLINTH_H_M = KITCHEN_PLINTH_H_M;
const RIM_W_M = 0.012; // granite rim of the inset sink, flush-ish with the worktop
const RIM_T_M = 0.004;
const BOWL_GAP_M = 0.002;
const HOB_T_M = KITCHEN_HOB_T_M;

interface RingBox {
  size: Vec3Tuple;
  position: Vec3Tuple;
}

// Board pieces around a rectangular hole [x0, x1] × [z0, z1], from y0 to y1
function ringAroundHole(w: number, d: number, hole: [number, number, number, number], y0: number, y1: number): RingBox[] {
  const [x0, x1, z0, z1] = hole;
  const spans: [number, number, number, number][] = [
    [-w / 2, x0, -d / 2, d / 2],
    [x1, w / 2, -d / 2, d / 2],
    [x0, x1, -d / 2, z0],
    [x0, x1, z1, d / 2],
  ];
  return spans
    .filter(([ax, bx, az, bz]) => bx - ax > 1e-4 && bz - az > 1e-4)
    .map(([ax, bx, az, bz]) => ({
      size: [bx - ax, y1 - y0, bz - az],
      position: [(ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2],
    }));
}

// Kitchen block (reference look): oak carcass, sage-green lacquered fronts with oak pulls (three
// drawers on the −X half, a door under the sink), solid-oak worktop with a visible 30 mm edge,
// an inset black granite sink, a matte-black gooseneck tap and a two-zone induction hob.
// Narrow blocks (< 0.6 m) drop the drawers and the hob. The front faces +Z; open = drawers out
// and door swung on its +X edge.
export function KitchenProp({ width: w, height: h, depth: d, materialId, category, open = false, waterRunning = false }: PropProps) {
  // Shared with the collision shape (utils/shapes/cabinetShapes.ts)
  const l = kitchenLayout(w, h, d);
  const { worktopTop, worktopBottom, carcassD, carcassZ, frontZ, hasDrawers } = l;
  const bodyBottom = PLINTH_H_M;
  const bodyH = Math.max(0.05, worktopBottom - bodyBottom);
  const splitX = hasDrawers ? 0 : -w / 2; // drawers on [−w/2, splitX], door on [splitX, w/2]
  const doorW = w / 2 - splitX - FRONT_GAP_M;
  const { w: sinkW, d: sinkD, x: sinkX, z: sinkZ } = l.sink;
  const bowlDepth = Math.min(0.17, bodyH * 0.45);
  const { w: hobW, d: hobD } = l.hob;

  const ring = ringAroundHole(
    w,
    d,
    [sinkX - sinkW / 2, sinkX + sinkW / 2, sinkZ - sinkD / 2, sinkZ + sinkD / 2],
    worktopBottom,
    worktopTop,
  );
  // Carcass band around the bowl (behind the fronts): the carcass box itself stops under the bowl,
  // so its top face never shows through the sink
  const bowlBottom = Math.max(bodyBottom + 0.02, worktopTop - bowlDepth - 0.01);
  const band = ringAroundHole(
    w,
    carcassD,
    [sinkX - sinkW / 2, sinkX + sinkW / 2, sinkZ - sinkD / 2 - carcassZ, sinkZ + sinkD / 2 - carcassZ],
    bowlBottom,
    worktopBottom,
  ).map((box): RingBox => ({ size: box.size, position: [box.position[0], box.position[1], box.position[2] + carcassZ] }));
  const ringKey = [...ring, ...band].map((box) => box.size.join(',')).join('|');

  // Gooseneck: column rising behind the sink, arching over towards the bowl centre
  const { x: tapX, z: tapZ, reach, top: tapTop } = l.tap;

  const g = useGeometries(() => {
    const geometries: Record<string, BufferGeometry> = {
      carcass: createMetricBoxGeometry(w, bowlBottom - bodyBottom, carcassD),
      plinth: new BoxGeometry(w - 0.01, PLINTH_H_M, carcassD - PLINTH_SETBACK_M),
      bowl: new BoxGeometry(sinkW - 2 * BOWL_GAP_M, bowlDepth, sinkD - 2 * BOWL_GAP_M),
      rimX: new BoxGeometry(sinkW + 2 * RIM_W_M, RIM_T_M, RIM_W_M),
      rimZ: new BoxGeometry(RIM_W_M, RIM_T_M, sinkD),
      drain: new CylinderGeometry(0.03, 0.03, 0.003, 28),
      tapBase: new CylinderGeometry(TAP_R_M * 1.6, TAP_R_M * 1.8, 0.02, 24),
      tapNeck: new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(0, 0, 0),
          new Vector3(0, tapTop * 0.75, 0),
          new Vector3(0, tapTop, reach * 0.35),
          new Vector3(0, tapTop * 0.9, reach * 0.85),
          new Vector3(0, tapTop * 0.72, reach),
        ]),
        48,
        TAP_R_M * 0.7,
        14,
      ),
      lever: createBevelBox(0.012, 0.012, 0.07, 0.004),
    };
    if (hasDrawers) geometries.hob = fitUvToRect(createBevelBox(hobW, HOB_T_M, hobD, 0.003), hobW, hobD);
    ring.forEach((box, index) => (geometries[`ring${index}`] = createMetricBoxGeometry(...box.size)));
    band.forEach((box, index) => (geometries[`band${index}`] = createMetricBoxGeometry(...box.size)));
    return geometries;
    // `ringKey` stands for `ring`, which is a new array every render
  }, [w, bowlBottom, bodyBottom, carcassD, sinkW, sinkD, bowlDepth, tapTop, reach, hobW, hobD, hasDrawers, ringKey]);

  const finish = getCabinetFinish(materialId, category);
  const black = finishMaterials.matteBlack();
  const rimY = worktopTop + RIM_T_M / 2 - 0.001;

  return (
    <group>
      {g.plinth && <Part geometry={g.plinth} material={propMaterials.gasket()} position={[0, PLINTH_H_M / 2, carcassZ - PLINTH_SETBACK_M / 2]} />}
      {g.carcass && <Part geometry={g.carcass} material={finish.carcass} position={[0, (bodyBottom + bowlBottom) / 2, carcassZ]} />}
      <ShadowBack width={w - 0.01} height={bodyH - 0.004} y={bodyBottom + bodyH / 2} z={frontZ} />
      {hasDrawers && (
        <DrawerStack
          x={-w / 4}
          width={w / 2 - FRONT_GAP_M / 2}
          bottom={bodyBottom + FRONT_GAP_M / 2}
          top={worktopBottom - FRONT_GAP_M}
          heights={KITCHEN_DRAWER_HEIGHTS}
          frontZ={frontZ}
          boxDepth={carcassD - 0.04}
          front={finish.front}
          carcass={finish.carcass}
          pull={finish.accent}
          open={open}
        />
      )}
      <CabinetDoor
        hingeX={w / 2 - FRONT_GAP_M / 2}
        side={-1}
        width={doorW}
        bottom={bodyBottom + FRONT_GAP_M / 2}
        height={worktopBottom - bodyBottom - 1.5 * FRONT_GAP_M}
        frontZ={frontZ}
        // Hinged on the right edge (side −1): a positive turn swings the free edge out of the front
        openAngle={DOOR_OPEN_RAD}
        front={finish.front}
        pull={finish.accent}
        open={open}
      />
      {ring.map((box, index) => {
        const geometry = g[`ring${index}`];
        return geometry && <Part key={index} geometry={geometry} material={finish.top} position={box.position} />;
      })}
      {band.map((box, index) => {
        const geometry = g[`band${index}`];
        return geometry && <Part key={`band${index}`} geometry={geometry} material={finish.carcass} position={box.position} />;
      })}
      {g.bowl && <Part geometry={g.bowl} material={finishMaterials.graniteSink()} position={[sinkX, worktopTop - bowlDepth / 2, sinkZ]} />}
      {g.drain && <Part geometry={g.drain} material={finishMaterials.brushedSteel()} position={[sinkX, worktopTop - bowlDepth + 0.003, sinkZ]} castShadow={false} />}
      {g.rimX && <Part geometry={g.rimX} material={finishMaterials.graniteRim()} position={[sinkX, rimY, sinkZ - sinkD / 2 - RIM_W_M / 2]} />}
      {g.rimX && <Part geometry={g.rimX} material={finishMaterials.graniteRim()} position={[sinkX, rimY, sinkZ + sinkD / 2 + RIM_W_M / 2]} />}
      {g.rimZ && <Part geometry={g.rimZ} material={finishMaterials.graniteRim()} position={[sinkX - sinkW / 2 - RIM_W_M / 2, rimY, sinkZ]} />}
      {g.rimZ && <Part geometry={g.rimZ} material={finishMaterials.graniteRim()} position={[sinkX + sinkW / 2 + RIM_W_M / 2, rimY, sinkZ]} />}
      {/* Matte-black gooseneck tap with a side lever */}
      {g.tapBase && <Part geometry={g.tapBase} material={black} position={[tapX, worktopTop + 0.01, tapZ]} />}
      {g.tapNeck && <Part geometry={g.tapNeck} material={black} position={[tapX, worktopTop, tapZ]} />}
      {g.lever && <Part geometry={g.lever} material={black} position={[tapX + TAP_R_M * 1.6, worktopTop + tapTop * 0.4, tapZ + 0.02]} castShadow={false} />}
      {/* Running water: jet from the spout mouth (end of the gooseneck) into the basin */}
      <TapWater
        running={waterRunning}
        outlet={[tapX, worktopTop + tapTop * 0.72, tapZ + reach]}
        basinY={worktopTop - bowlDepth}
        basin={{ x: sinkX, z: sinkZ, w: sinkW - 2 * BOWL_GAP_M, d: sinkD - 2 * BOWL_GAP_M }}
      />
      {g.hob && (
        <Part geometry={g.hob} material={finishMaterials.blackGlass()} position={[l.hob.x, worktopTop + HOB_T_M / 2, l.hob.z]} />
      )}
    </group>
  );
}
