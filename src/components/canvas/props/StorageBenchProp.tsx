import { BoxGeometry, MeshStandardMaterial, type BufferGeometry } from 'three';
import {
  BACKREST_TILT_RAD,
  BENCH_BACKBOARD_T_M,
  BENCH_BOARD_M,
  BENCH_LID_GAP_M,
  BENCH_MARGIN_M,
  benchLayout,
  benchPullLength,
} from '../../../utils/shapes/benchShape';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { getCabinetFinish, propMaterials } from './propMaterials';
import { finishMaterials } from './finishMaterials';
import { createBevelBox, createCushion } from './propGeometry';
import { Part, useGeometries, type PropProps } from './propParts';
import { DOOR_OPEN_RAD, Hinge } from './articulation';
import { FRONT_GAP_M, FRONT_T_M, OakPull } from './cabinetParts';

const BOARD_M = BENCH_BOARD_M;

// Cutaway front of a chest hosting devices: a faint smoked panel in place of the opaque door, so the
// battery or tank inside reads clearly while the door's outline stays
let cutawayFront: MeshStandardMaterial | undefined;
const cutawayMaterial = (): MeshStandardMaterial =>
  (cutawayFront ??= new MeshStandardMaterial({ color: '#e7dccb', roughness: 0.35, transparent: true, opacity: 0.16, depthWrite: false }));

interface StorageBenchProps extends PropProps {
  // Seat-chest (asiento arcón): upholstered seat on the lid and a backrest against the back
  cushions?: boolean;
}

// Storage chest / bench in the module's board finish: a hollow carcass standing on the van floor
// (side and back boards, a black kick board and a face frame), a hinged lid behind a fixed rear
// strip and a front door with an oak pull. The seat-chest variant adds a grey-beige linen seat
// cushion on the lid and a backrest cushion on an oak backboard (the module height is the backrest
// top). The front faces +Z. Open: the lid (with its cushion) tilts up on its rear hinges and the
// door swings out on its −X edge, showing the empty inside.
// Every piece is placed from benchLayout (utils/shapes/benchShape.ts), the same layout as the
// collision shape, whose open space is the inside of the carcass.
// Hosting devices (fitAdaptation.ts): the door becomes a faint cutaway panel, so what is stored
// inside stays visible.
export function StorageBenchProp({ width: w, height: h, depth: d, materialId, category, open = false, cushions = false, hosting = false }: StorageBenchProps) {
  const l = benchLayout(w, h, d, cushions);
  const { seatTop, cushionT, chestH, carcassH, backD, backZ, faceZ, carcassD, plinthH, stripD, lidD, doorW, doorH, doorY, backH } = l;
  const innerW = w - 2 * BOARD_M;

  const g = useGeometries(() => {
    const out: Record<string, BufferGeometry> = {
      sidePanel: createMetricBoxGeometry(BOARD_M, carcassH, carcassD),
      backPanel: createMetricBoxGeometry(innerW, carcassH, BOARD_M),
      kick: new BoxGeometry(innerW, plinthH, BOARD_M),
      rail: createMetricBoxGeometry(innerW, BENCH_MARGIN_M, BOARD_M),
      strip: createBevelBox(w, BOARD_M, stripD, 0.002),
      lid: createBevelBox(w, BOARD_M, lidD, 0.002),
      doorGap: new BoxGeometry(doorW + 2 * FRONT_GAP_M, doorH + 2 * FRONT_GAP_M, 0.002),
      door: createBevelBox(doorW, doorH, FRONT_T_M, 0.0025),
    };
    if (cushions) {
      out.seat = createCushion(w - 0.01, cushionT, lidD - 0.005, { radius: 0.035, puff: cushionT * 0.1, wrinkle: 0.004, seed: 2 });
      out.back = createCushion(w - 0.01, backH, backD - BENCH_BACKBOARD_T_M, { radius: 0.04, puff: 0.006, wrinkle: 0.004, seed: 5 });
      out.backboard = createBevelBox(w, h - chestH, BENCH_BACKBOARD_T_M, 0.002);
    }
    return out;
  }, [w, innerW, carcassH, carcassD, plinthH, stripD, lidD, doorW, doorH, cushions, cushionT, backH, backD, h, chestH]);

  const finish = getCabinetFinish(materialId, category);
  const linen = finishMaterials.linenGrey();
  const carcassZ = (backZ + faceZ) / 2;
  const frameZ = faceZ - BOARD_M / 2;
  return (
    <group>
      {/* Hollow carcass on the floor: sides, back, kick board and the face frame around the door */}
      {[-1, 1].map((s) => (
        <Part key={s} geometry={g.sidePanel!} material={finish.carcass} position={[s * (w / 2 - BOARD_M / 2), carcassH / 2, carcassZ]} />
      ))}
      <Part geometry={g.backPanel!} material={finish.carcass} position={[0, carcassH / 2, backZ + BOARD_M / 2]} />
      <Part geometry={g.kick!} material={propMaterials.gasket()} position={[0, plinthH / 2, frameZ]} />
      <Part geometry={g.rail!} material={finish.carcass} position={[0, plinthH + BENCH_MARGIN_M / 2, frameZ]} />
      <Part geometry={g.rail!} material={finish.carcass} position={[0, carcassH - BENCH_MARGIN_M / 2, frameZ]} />
      {/* Top: fixed rear strip, shadow gap, hinged lid (+ seat cushion) */}
      <Part geometry={g.strip!} material={finish.top} position={[0, carcassH + BOARD_M / 2, backZ + stripD / 2]} />
      <Hinge position={[0, carcassH, backZ + stripD + BENCH_LID_GAP_M]} axis="x" openAngle={-DOOR_OPEN_RAD * 0.9} open={open}>
        <Part geometry={g.lid!} material={finish.top} position={[0, BOARD_M / 2, lidD / 2]} />
        {g.seat && <Part geometry={g.seat} material={linen} position={[0, BOARD_M + cushionT / 2, lidD / 2]} />}
      </Hinge>
      {/* Fixed front panel with its shadow gap and an oak pull (the pull depth is the front's set-back).
          A chest opens through its lid only. */}
      {!hosting && <Part geometry={g.doorGap!} material={propMaterials.gasket()} position={[0, doorY, faceZ + 0.001]} castShadow={false} />}
      <group position={[-doorW / 2, 0, faceZ]}>
        <Part geometry={g.door!} material={hosting ? cutawayMaterial() : finish.front} position={[doorW / 2, doorY, FRONT_T_M / 2]} castShadow={!hosting} />
        <OakPull material={finish.accent} length={benchPullLength(doorW)} position={[doorW / 2, doorY + doorH / 2 - 0.04, FRONT_T_M]} />
      </group>
      {g.backboard && <Part geometry={g.backboard} material={finish.carcass} position={[0, chestH + (h - chestH) / 2, -d / 2 + BENCH_BACKBOARD_T_M / 2]} />}
      {g.back && (
        // Backrest leaning back slightly against the board, its foot on the seat line
        <group
          position={[0, seatTop - cushionT * 0.5, -d / 2 + BENCH_BACKBOARD_T_M + (backD - BENCH_BACKBOARD_T_M) / 2 + backH * Math.sin(BACKREST_TILT_RAD)]}
          rotation={[-BACKREST_TILT_RAD, 0, 0]}
        >
          <Part geometry={g.back} material={linen} position={[0, backH / 2, 0]} />
        </group>
      )}
    </group>
  );
}

// Seat-chest (asiento arcón) of the reference: the bench with its linen cushions
export function SeatChestProp(props: PropProps) {
  return <StorageBenchProp {...props} cushions />;
}
