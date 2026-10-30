import { BoxGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getSurfaceMaterial, propMaterials } from './propMaterials';
import { finishMaterials } from './finishMaterials';
import { createBevelBox } from './propGeometry';
import { Part, useGeometries, type PropProps } from './propParts';
import { DOOR_OPEN_RAD, Hinge } from './articulation';
import { FRIDGE_DOOR_MARGIN_M, fridgeLayout } from '../../../utils/shapes/cabinetShapes';

const DOOR_MARGIN_M = FRIDGE_DOOR_MARGIN_M;
const SLOT_PITCH_M = 0.012;

// Compressor fridge (reference look): anthracite steel cabinet, brushed-steel door with an eased
// edge, black gasket line, a full-height recessed black handle on the free edge, a small control
// panel and the slotted compressor vent under the door. Fridges in a board material (integrated)
// get a panel door in that board instead. The front faces +Z; the door is hinged on its −X edge.
export function FridgeProp({ width: w, height: h, depth: d, materialId, category, open = false }: PropProps) {
  // Shared with the collision shape (utils/shapes/cabinetShapes.ts)
  const { front, bodyD, faceZ, grilleH, doorBottom, doorH, doorW } = fridgeLayout(w, h, d);
  const gasketT = front * 0.12;
  const doorT = front * 0.55;
  const slots = Math.max(3, Math.floor((w * 0.7) / SLOT_PITCH_M));

  const g = useGeometries(
    (): Record<string, BufferGeometry> => ({
      body: createBevelBox(w, h, bodyD, 0.008),
      gasket: new BoxGeometry(doorW, doorH, gasketT),
      liner: new BoxGeometry(doorW - 0.05, doorH - 0.05, gasketT),
      door: createBevelBox(doorW, doorH, doorT, 0.006),
      handle: createBevelBox(0.018, doorH * 0.6, front - doorT - gasketT, 0.004),
      panel: createBevelBox(Math.min(0.12, doorW * 0.3), 0.03, 0.006, 0.002),
      grille: new BoxGeometry(w * 0.72, grilleH * 0.55, 0.004),
      // Vent slats merged into one mesh
      slots: mergeGeometries(
        Array.from({ length: slots }, (_, i) =>
          new BoxGeometry(0.004, grilleH * 0.5, 0.004).translate(-w * 0.36 + (w * 0.72 * (i + 0.5)) / slots, 0, 0),
        ),
      ),
    }),
    [w, h, bodyD, gasketT, doorW, doorH, doorT, front, grilleH, slots],
  );

  const bought = materialId === 'metal-inox';
  const body = bought ? finishMaterials.darkSteel() : getSurfaceMaterial(materialId, category);
  const door = bought ? finishMaterials.brushedSteel() : body;
  const black = finishMaterials.matteBlack();
  const grilleY = grilleH / 2 + 0.004;
  return (
    <group>
      <Part geometry={g.body!} material={body} position={[0, h / 2, -front / 2]} />
      {/* Compressor vent: dark recess with vertical slats */}
      <Part geometry={g.grille!} material={propMaterials.gasket()} position={[0, grilleY, faceZ + 0.002]} castShadow={false} />
      <Part geometry={g.slots!} material={body} position={[0, grilleY, faceZ + 0.004]} castShadow={false} />
      <Part geometry={g.gasket!} material={propMaterials.gasket()} position={[0, doorBottom + doorH / 2, faceZ + gasketT / 2]} />
      <Part geometry={g.liner!} material={propMaterials.whiteAbs()} position={[0, doorBottom + doorH / 2, faceZ + gasketT / 2 + 0.0005]} castShadow={false} />
      <Hinge position={[-w / 2 + DOOR_MARGIN_M, 0, faceZ + gasketT]} axis="y" openAngle={-DOOR_OPEN_RAD} open={open}>
        <Part geometry={g.door!} material={door} position={[doorW / 2, doorBottom + doorH / 2, doorT / 2]} />
        <Part
          geometry={g.handle!}
          material={black}
          position={[doorW - 0.03, doorBottom + doorH / 2, doorT + (front - doorT - gasketT) / 2]}
        />
        <Part
          geometry={g.panel!}
          material={propMaterials.lcd()}
          position={[doorW / 2, doorBottom + doorH - 0.04, doorT + 0.003]}
          castShadow={false}
        />
      </Hinge>
    </group>
  );
}
