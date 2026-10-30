import { RoundedBox } from '@react-three/drei';
import { BoxGeometry, CylinderGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, safeRadius, useGeometries, type PropProps } from './propParts';
import { DOOR_OPEN_RAD, Hinge } from './articulation';
import { finishMaterials } from './finishMaterials';
import { createBevelBox } from './propGeometry';
import { OakPull } from './cabinetParts';
import { ShowerWater } from '../water/ShowerWater';
import {
  SHOWER_DOOR_T_M,
  SHOWER_FRAME_W_M,
  SHOWER_PIPE_R_M,
  SHOWER_WALL_T_M,
  showerLayout,
} from '../../../utils/shapes/fixtureShapes';

const WALL_T_M = SHOWER_WALL_T_M;
const FRAME_W_M = SHOWER_FRAME_W_M; // door frame jambs and header
const DOOR_T_M = SHOWER_DOOR_T_M;
const PIPE_RADIUS_M = SHOWER_PIPE_R_M;

// Shower + WC cabin: white ABS shell with a glossy waterproof liner, shower tray with drain,
// chrome riser with mixer and head, a compact cassette toilet on the tray and a framed front door
// (+Z) hinged on its −X jamb. The roof panel keeps the cabin closed from above. The cabin is set
// back by the depth of the door pull so the pull stays inside the module (fixtureShapes.ts, shared
// with the collision shape).
// Shower head face: radius of the perforated disc and the head's underside below the arm
const NOZZLE_R_M = 0.055;
const HEAD_FACE_DROP_M = 0.034;

export function ShowerCabinProp({ width: w, height: h, depth: d, open = false, waterRunning = false }: PropProps) {
  const l = showerLayout(w, h, d);
  const { cabinD, trayH, innerW, innerD, innerZ, headerH, doorW, doorH, riserX, riserBottom, riserTop, armL } = l;
  const { w: toiletW, d: toiletD, h: toiletH } = l.toilet;

  const g = useGeometries(
    () => ({
      tray: new BoxGeometry(w, trayH, cabinD - DOOR_T_M),
      drain: new CylinderGeometry(0.035, 0.035, 0.003, 28),
      back: new BoxGeometry(w, h - trayH, WALL_T_M),
      side: new BoxGeometry(WALL_T_M, h - trayH, cabinD - DOOR_T_M),
      roof: new BoxGeometry(w, WALL_T_M, cabinD),
      liner: new BoxGeometry(innerW, h - trayH - WALL_T_M, 0.002),
      door: createBevelBox(doorW, doorH, DOOR_T_M * 0.8, 0.003),
      jambOak: createBevelBox(FRAME_W_M, h - trayH, DOOR_T_M, 0.003),
      headerOak: createBevelBox(w, headerH, DOOR_T_M, 0.003),
      riser: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, riserTop - riserBottom, 16),
      arm: new CylinderGeometry(PIPE_RADIUS_M * 0.8, PIPE_RADIUS_M * 0.8, armL, 12).rotateX(Math.PI / 2),
      head: new CylinderGeometry(0.085, 0.07, 0.025, 32),
      mixer: new BoxGeometry(0.12, 0.08, 0.05),
    }),
    [w, cabinD, h, trayH, innerW, innerD, headerH, doorW, doorH, riserBottom, riserTop, armL],
  );

  const shell = propMaterials.whiteAbs();
  const liner = propMaterials.showerLiner();
  const chrome = propMaterials.chrome();
  // Furniture-matching front: oak frame, sage door with an oak pull, matte-black shower fittings
  const fitting = finishMaterials.matteBlack();
  const oak = finishMaterials.oak();
  const wallY = trayH + (h - trayH) / 2;
  const backZ = -d / 2 + WALL_T_M / 2;
  const sideZ = -d / 2 + (cabinD - DOOR_T_M) / 2;
  const frontZ = l.doorZ + DOOR_T_M / 2;
  const { x: toiletX, z: toiletZ } = l.toilet;
  return (
    <group>
      <Part geometry={g.tray} material={shell} position={[0, trayH / 2, sideZ]} />
      <Part geometry={g.drain} material={chrome} position={[innerW * 0.2, trayH + 0.0015, innerZ + innerD * 0.15]} castShadow={false} />
      <Part geometry={g.back} material={shell} position={[0, wallY, backZ]} />
      <Part geometry={g.liner} material={liner} position={[0, trayH + (h - trayH - WALL_T_M) / 2, -d / 2 + WALL_T_M + 0.001]} castShadow={false} />
      {([-1, 1] as const).map((side) => (
        <Part key={side} geometry={g.side} material={shell} position={[side * (w / 2 - WALL_T_M / 2), wallY, sideZ]} />
      ))}
      <Part geometry={g.roof} material={shell} position={[0, h - WALL_T_M / 2, -d / 2 + cabinD / 2]} />

      {/* Shower: riser with mixer, forward arm and head */}
      <group position={[riserX, 0, l.riserZ]}>
        <Part geometry={g.riser} material={fitting} position={[0, (riserBottom + riserTop) / 2, 0]} />
        <Part geometry={g.mixer} material={fitting} position={[0, riserBottom + 0.04, 0.01]} />
        <Part geometry={g.arm} material={fitting} position={[0, riserTop, armL / 2]} />
        <Part geometry={g.head} material={fitting} position={[0, riserTop - 0.02, armL]} />
      </group>

      {/* Running shower: rain from the head onto the tray and the toilet lid */}
      <ShowerWater
        running={waterRunning}
        nozzle={{ x: riserX, y: riserTop - HEAD_FACE_DROP_M, z: l.riserZ + armL, r: NOZZLE_R_M }}
        tray={{ minX: -innerW / 2, maxX: innerW / 2, minZ: -d / 2 + WALL_T_M, maxZ: l.doorZ, y: trayH }}
        obstacle={{
          minX: toiletX - toiletW / 2,
          maxX: toiletX + toiletW / 2,
          minZ: toiletZ - toiletD / 2,
          maxZ: toiletZ + toiletD / 2,
          top: trayH + toiletH,
        }}
      />

      {/* Compact cassette toilet standing on the tray */}
      <group position={[toiletX, trayH, toiletZ]}>
        <RoundedBox
          args={[toiletW, toiletH * 0.88, toiletD]}
          radius={safeRadius(0.05, toiletW, toiletH, toiletD)}
          smoothness={3}
          material={shell}
          position={[0, (toiletH * 0.88) / 2, 0]}
          castShadow
          receiveShadow
        />
        <RoundedBox
          args={[toiletW * 0.94, toiletH * 0.1, toiletD * 0.86]}
          radius={safeRadius(0.04, toiletW, toiletH * 0.1, toiletD)}
          smoothness={3}
          material={propMaterials.labelPanel()}
          position={[0, toiletH * 0.93, toiletD * 0.05]}
          castShadow
        />
      </group>

      {/* Door frame (jambs + header) and the hinged door */}
      {([-1, 1] as const).map((side) => (
        <Part key={side} geometry={g.jambOak} material={oak} position={[side * (w / 2 - FRAME_W_M / 2), wallY, frontZ]} />
      ))}
      <Part geometry={g.headerOak} material={oak} position={[0, h - headerH / 2, frontZ]} />
      <Hinge position={[-doorW / 2, 0, l.doorZ]} axis="y" openAngle={-DOOR_OPEN_RAD} open={open}>
        <Part geometry={g.door} material={finishMaterials.sage()} position={[doorW / 2, trayH + doorH / 2, DOOR_T_M * 0.4]} />
        <OakPull material={oak} vertical length={0.2} position={[doorW - 0.05, trayH + doorH * 0.5, DOOR_T_M * 0.8]} />
      </Hinge>
    </group>
  );
}
