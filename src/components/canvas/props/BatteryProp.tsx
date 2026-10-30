import { BoxGeometry, CylinderGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, useGeometries, type PropProps } from './propParts';
import { BATTERY_BOOT_R_M, BATTERY_FRONT_DETAIL_M, batteryLayout } from '../../../utils/shapes/deviceShapes';

const TERMINAL_RADIUS_M = 0.009;
const BOOT_RADIUS_M = BATTERY_BOOT_R_M;
const FRONT_DETAIL_M = BATTERY_FRONT_DETAIL_M; // LCD and grips stand proud of the case, inside the box depth

// LiFePO4 battery: anthracite case, darker lid, red (+) and black (−) terminals with metal posts,
// two carry grips on the lid ends and a backlit LCD on the front. Fixed colours: the module's
// sheet material does not apply to a bought product. The front faces +Z.
export function BatteryProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/deviceShapes.ts)
  const { termH, lidH, caseH, caseD, termX, termZ, gripW } = batteryLayout(w, h, d);
  const faceZ = d / 2 - FRONT_DETAIL_M; // front face of the case
  const bootH = termH * 0.55;
  const postH = termH - bootH;
  const lcdW = Math.min(0.09, w * 0.3);
  const lcdH = Math.min(0.045, caseH * 0.25);

  const geometries = useGeometries(
    () => ({
      case: new BoxGeometry(w, caseH, caseD),
      lid: new BoxGeometry(w - 0.004, lidH, caseD - 0.004),
      boot: new CylinderGeometry(BOOT_RADIUS_M, BOOT_RADIUS_M * 1.15, bootH, 20),
      post: new CylinderGeometry(TERMINAL_RADIUS_M, TERMINAL_RADIUS_M, postH, 16),
      grip: new BoxGeometry(gripW, termH * 0.6, caseD * 0.45),
      lcdBezel: new BoxGeometry(lcdW + 0.012, lcdH + 0.012, FRONT_DETAIL_M * 0.5),
      lcd: new BoxGeometry(lcdW, lcdH, FRONT_DETAIL_M * 0.5),
    }),
    [w, caseH, caseD, lidH, bootH, postH, gripW, termH, lcdW, lcdH],
  );

  const lidTop = caseH + lidH;
  const caseZ = -FRONT_DETAIL_M / 2;
  const lcdY = caseH * 0.62;
  return (
    <group>
      <Part geometry={geometries.case} material={propMaterials.batteryCase()} position={[0, caseH / 2, caseZ]} />
      <Part geometry={geometries.lid} material={propMaterials.batteryLid()} position={[0, caseH + lidH / 2, caseZ]} />
      {/* Terminals: coloured boots with the metal posts on top (+ red on +X, − black on −X) */}
      {([1, -1] as const).map((side) => (
        <group key={side} position={[side * termX, lidTop, termZ]}>
          <Part
            geometry={geometries.boot}
            material={side === 1 ? propMaterials.terminalRed() : propMaterials.terminalBlack()}
            position={[0, bootH / 2, 0]}
          />
          <Part geometry={geometries.post} material={propMaterials.stainless()} position={[0, bootH + postH / 2, 0]} />
        </group>
      ))}
      {/* Carry grips at both lid ends */}
      {([1, -1] as const).map((side) => (
        <Part
          key={side}
          geometry={geometries.grip}
          material={propMaterials.darkPlastic()}
          position={[side * (w / 2 - gripW / 2 - 0.004), lidTop + termH * 0.3, caseZ + caseD * 0.15]}
        />
      ))}
      <Part
        geometry={geometries.lcdBezel}
        material={propMaterials.batteryLid()}
        position={[0, lcdY, faceZ + FRONT_DETAIL_M * 0.25]}
        castShadow={false}
      />
      <Part
        geometry={geometries.lcd}
        material={propMaterials.lcd()}
        position={[0, lcdY, faceZ + FRONT_DETAIL_M * 0.75]}
        castShadow={false}
      />
    </group>
  );
}
