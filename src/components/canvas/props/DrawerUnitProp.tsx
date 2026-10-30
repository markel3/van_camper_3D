import { BoxGeometry } from 'three';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { getCabinetFinish, propMaterials } from './propMaterials';
import { createBevelBox } from './propGeometry';
import { Part, useGeometries, type PropProps } from './propParts';
import { DrawerStack, FRONT_GAP_M, ShadowBack } from './cabinetParts';
import { DRAWER_UNIT_HEIGHTS, PLINTH_SETBACK_M, drawerUnitLayout } from '../../../utils/shapes/cabinetShapes';

// Drawer unit (reference look): oak carcass and solid-oak worktop with a visible edge, a recessed
// black plinth and three sage-green drawer fronts (deeper at the bottom) with oak pulls. Open: the
// drawers run out of the front (+Z) on their runners, showing the drawer boxes.
export function DrawerUnitProp({ width: w, height: h, depth: d, materialId, category, open = false }: PropProps) {
  // Shared with the collision shape (utils/shapes/cabinetShapes.ts)
  const { worktopT, plinthH, bodyH, carcassD, carcassZ, frontZ } = drawerUnitLayout(h, d);

  const g = useGeometries(
    () => ({
      carcass: createMetricBoxGeometry(w, bodyH, carcassD),
      worktop: createBevelBox(w, worktopT, d, 0.003),
      plinth: new BoxGeometry(w - 0.01, plinthH, carcassD - PLINTH_SETBACK_M),
    }),
    [w, bodyH, carcassD, worktopT, d, plinthH],
  );

  const finish = getCabinetFinish(materialId, category);
  return (
    <group>
      <Part geometry={g.plinth} material={propMaterials.gasket()} position={[0, plinthH / 2, carcassZ - PLINTH_SETBACK_M / 2]} />
      <Part geometry={g.carcass} material={finish.carcass} position={[0, plinthH + bodyH / 2, carcassZ]} />
      <ShadowBack width={w - 0.01} height={bodyH - 0.004} y={plinthH + bodyH / 2} z={frontZ} />
      <Part geometry={g.worktop} material={finish.top} position={[0, h - worktopT / 2, 0]} />
      <DrawerStack
        x={0}
        width={w - FRONT_GAP_M}
        bottom={plinthH + FRONT_GAP_M / 2}
        top={h - worktopT - FRONT_GAP_M}
        heights={DRAWER_UNIT_HEIGHTS}
        frontZ={frontZ}
        boxDepth={carcassD - 0.04}
        front={finish.front}
        carcass={finish.carcass}
        pull={finish.accent}
        open={open}
      />
    </group>
  );
}
