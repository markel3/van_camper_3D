import { BoxGeometry, CylinderGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, useGeometries, type PropProps } from './propParts';
import { KIT_PIPE_R_M, KIT_PLATE_T_M, hydraulicKitLayout } from '../../../utils/shapes/deviceShapes';

const PLATE_T_M = KIT_PLATE_T_M;
const PIPE_RADIUS_M = KIT_PIPE_R_M;

// Water kit on a base plate: 10 L boiler (white horizontal cylinder on saddles) with the hot (red)
// and cold (blue) connections rising from its top, and a 12 V pressure pump (black motor + grey
// head) at the +X end, fed and connected with blue lines.
export function HydraulicKitProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/deviceShapes.ts)
  const { boilerR, boilerL, boilerX, boilerY, boilerTop, pipeTop, pumpX, motorR, motorL, headD, pumpZ, hotX, coldX } =
    hydraulicKitLayout(w, h, d);
  const riserL = pipeTop - boilerTop;

  const g = useGeometries(
    () => ({
      plate: new BoxGeometry(w, PLATE_T_M, d),
      boiler: new CylinderGeometry(boilerR, boilerR, boilerL, 40).rotateZ(Math.PI / 2),
      cap: new CylinderGeometry(boilerR * 0.98, boilerR * 0.98, 0.012, 40).rotateZ(Math.PI / 2),
      saddle: new BoxGeometry(0.04, 0.03, boilerR * 1.6),
      riser: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, riserL, 14),
      stub: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, 0.05, 14).rotateX(Math.PI / 2),
      motor: new CylinderGeometry(motorR, motorR, motorL, 28).rotateX(Math.PI / 2),
      head: new BoxGeometry(motorR * 2.2, motorR * 2.2, headD),
      pumpRiser: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, pipeTop - PLATE_T_M - motorR * 2.2, 14),
      feed: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, Math.abs(pumpX - (boilerX + boilerL * 0.25)), 14).rotateZ(Math.PI / 2),
      link: new CylinderGeometry(PIPE_RADIUS_M, PIPE_RADIUS_M, Math.abs(pumpZ), 14).rotateX(Math.PI / 2),
    }),
    [w, d, boilerR, boilerL, riserL, motorR, motorL, headD, pipeTop, pumpX, boilerX, pumpZ],
  );

  return (
    <group>
      <Part geometry={g.plate} material={propMaterials.gasket()} position={[0, PLATE_T_M / 2, 0]} />
      {/* Boiler on two saddles */}
      {[-0.32, 0.32].map((f) => (
        <Part key={f} geometry={g.saddle} material={propMaterials.pumpGrey()} position={[boilerX + f * boilerL, PLATE_T_M + 0.015, 0]} />
      ))}
      <Part geometry={g.boiler} material={propMaterials.whiteAbs()} position={[boilerX, boilerY, 0]} />
      <Part geometry={g.cap} material={propMaterials.labelPanel()} position={[boilerX - boilerL / 2 - 0.004, boilerY, 0]} />
      {/* Hot (red) and cold (blue) connections */}
      <Part geometry={g.riser} material={propMaterials.pipeRed()} position={[hotX, boilerTop + riserL / 2, 0]} />
      <Part geometry={g.stub} material={propMaterials.pipeRed()} position={[hotX, pipeTop, 0.025]} />
      <Part geometry={g.riser} material={propMaterials.pipeBlue()} position={[coldX, boilerTop + riserL / 2, 0]} />
      {/* Pump: motor along Z, head behind it, outlet rising and feeding the boiler's cold inlet */}
      <Part geometry={g.motor} material={propMaterials.terminalBlack()} position={[pumpX, PLATE_T_M + motorR, pumpZ + headD / 2 + motorL / 2]} />
      <Part geometry={g.head} material={propMaterials.pumpGrey()} position={[pumpX, PLATE_T_M + motorR * 1.1, pumpZ]} />
      <Part
        geometry={g.pumpRiser}
        material={propMaterials.pipeBlue()}
        position={[pumpX, PLATE_T_M + motorR * 2.2 + (pipeTop - PLATE_T_M - motorR * 2.2) / 2, pumpZ]}
      />
      {/* Over the top: back from the pump riser, then across to the boiler's cold inlet */}
      <Part geometry={g.link} material={propMaterials.pipeBlue()} position={[pumpX, pipeTop, pumpZ / 2]} castShadow={false} />
      <Part geometry={g.feed} material={propMaterials.pipeBlue()} position={[(pumpX + coldX) / 2, pipeTop, 0]} castShadow={false} />
    </group>
  );
}
