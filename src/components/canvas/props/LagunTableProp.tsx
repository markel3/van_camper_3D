import { BoxGeometry, CylinderGeometry } from 'three';
import { getSurfaceMaterial, propMaterials } from './propMaterials';
import { Part, useGeometries, type PropProps } from './propParts';
import { createBevelBox } from './propGeometry';
import {
  TABLE_BASE_R_M,
  TABLE_COLUMN_R_M,
  TABLE_KNUCKLE_R_M,
  TABLE_PLATE_T_M,
  lagunLayout,
} from '../../../utils/shapes/fixtureShapes';

const COLUMN_RADIUS_M = TABLE_COLUMN_R_M;
const BASE_RADIUS_M = TABLE_BASE_R_M;
const KNUCKLE_RADIUS_M = TABLE_KNUCKLE_R_M;

// Lagun-style swivel table: anodised aluminium column at the −X end on a floor plate, an
// articulated arm (two knuckles) under the top and a wooden tabletop with rounded edges in the
// module's material. Placed from lagunLayout (utils/shapes/fixtureShapes.ts), the same layout as
// the collision shape: the space under the top stays free apart from the column and its arm.
export function LagunTableProp({ width: w, height: h, depth: d, materialId, category }: PropProps) {
  const { topT, armY, columnX, armL, bracketW, bracketD } = lagunLayout(w, h, d);
  const plateT = TABLE_PLATE_T_M;

  const g = useGeometries(
    () => ({
      plate: new CylinderGeometry(BASE_RADIUS_M, BASE_RADIUS_M, plateT, 40),
      column: new CylinderGeometry(COLUMN_RADIUS_M, COLUMN_RADIUS_M, armY - plateT, 28),
      knuckle: new CylinderGeometry(KNUCKLE_RADIUS_M, KNUCKLE_RADIUS_M, 0.05, 28),
      arm: new BoxGeometry(armL, 0.03, 0.05),
      bracket: new BoxGeometry(bracketW, 0.012, bracketD),
      // Solid top with well-eased edges and metric UVs (photographic oak grain)
      top: createBevelBox(w, topT, d, 0.008),
    }),
    [plateT, armY, armL, w, d, topT, bracketW, bracketD],
  );

  const alu = propMaterials.anodisedFrame();
  const top = getSurfaceMaterial(materialId, category);
  return (
    <group>
      <Part geometry={g.plate} material={alu} position={[columnX, plateT / 2, 0]} />
      <Part geometry={g.column} material={alu} position={[columnX, plateT + (armY - plateT) / 2, 0]} />
      {/* Articulated arm: knuckle on the column, link, knuckle under the tabletop bracket */}
      <Part geometry={g.knuckle} material={propMaterials.pumpGrey()} position={[columnX, armY, 0]} />
      <Part geometry={g.arm} material={alu} position={[columnX + armL / 2, armY, 0]} />
      <Part geometry={g.knuckle} material={propMaterials.pumpGrey()} position={[columnX + armL, armY, 0]} />
      <Part geometry={g.bracket} material={alu} position={[columnX + armL, h - topT - 0.006, 0]} />
      <Part geometry={g.top} material={top} position={[0, h - topT / 2, 0]} />
    </group>
  );
}
