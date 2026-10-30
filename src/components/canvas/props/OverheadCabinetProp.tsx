import { useEffect } from 'react';
import { BoxGeometry } from 'three';
import { useProjectStore } from '../../../store/useProjectStore';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { getCabinetFinish, propMaterials } from './propMaterials';
import { createBevelBox } from './propGeometry';
import { Part, useGeometries, type PropProps } from './propParts';
import { DOOR_OPEN_RAD, Hinge } from './articulation';
import { FRONT_T_M, OakPull, ShadowBack } from './cabinetParts';
import { OVERHEAD_LED_H_M, overheadLayout } from '../../../utils/shapes/cabinetShapes';
import { finishMaterials } from './finishMaterials';
import { useLightingMood } from '../render/lightingMood';

const LED_H_M = OVERHEAD_LED_H_M; // the bottom panel is raised by this much to house the strip

// Overhead cabinet (altillo): oak carcass with a visible bottom board, a row of top-hung sage
// flaps (one per ~0.5 m) with oak pulls along their lower edge, and a warm LED strip under the
// front edge driven by the Interior menu toggle and the LED intensity / night controls.
export function OverheadCabinetProp({ width: w, height: h, depth: d, materialId, category, open = false }: PropProps) {
  const ledOn = useProjectStore((state) => state.interiorFinish.ledStrips);
  // Fronts set back by the pull depth, so the pulls stay inside the module (cabinetShapes.ts)
  const { carcassD, carcassZ, frontZ, carcassH, bottomT: BOTTOM_T_M, count, pitch, flapW, flapH, flapTop } = overheadLayout(w, h, d);

  const g = useGeometries(
    () => ({
      carcass: createMetricBoxGeometry(w, carcassH - BOTTOM_T_M, carcassD),
      bottom: createBevelBox(w, BOTTOM_T_M, d, 0.002),
      flap: createBevelBox(flapW, flapH, FRONT_T_M, 0.0025),
      led: new BoxGeometry(w - 0.06, LED_H_M * 0.6, 0.014),
    }),
    [w, carcassH, carcassD, d, flapW, flapH],
  );

  const finish = getCabinetFinish(materialId, category);
  const { ledEmissiveIntensity } = useLightingMood();
  // Shared material: every cabinet sets the same value, so the last writer wins harmlessly
  useEffect(() => {
    finishMaterials.ledStrip().emissiveIntensity = ledEmissiveIntensity;
  }, [ledEmissiveIntensity]);
  const bodyY = LED_H_M + BOTTOM_T_M + (carcassH - BOTTOM_T_M) / 2;
  return (
    <group>
      <Part geometry={g.carcass} material={finish.carcass} position={[0, bodyY, carcassZ]} />
      {/* Oak bottom board runs under the flaps: its edge is the visible lip of the reference */}
      <Part geometry={g.bottom} material={finish.accent} position={[0, LED_H_M + BOTTOM_T_M / 2, 0]} />
      <ShadowBack width={w - 0.01} height={flapH} y={flapTop - flapH / 2} z={frontZ} />
      <Part
        geometry={g.led}
        material={ledOn ? finishMaterials.ledStrip() : propMaterials.ledOff()}
        position={[0, LED_H_M * 0.3, frontZ - 0.03]}
        castShadow={false}
      />
      {Array.from({ length: count }, (_, index) => {
        const x = -w / 2 + pitch * (index + 0.5);
        return (
          // Top-hung flap: it lifts up and out (+Z) when open
          <Hinge key={index} position={[x, flapTop, frontZ]} axis="x" openAngle={-DOOR_OPEN_RAD * 0.95} open={open}>
            <Part geometry={g.flap} material={finish.front} position={[0, -flapH / 2, FRONT_T_M / 2]} />
            <OakPull material={finish.accent} length={Math.min(0.16, flapW * 0.35)} position={[0, -flapH + 0.035, FRONT_T_M]} />
          </Hinge>
        );
      })}
    </group>
  );
}
