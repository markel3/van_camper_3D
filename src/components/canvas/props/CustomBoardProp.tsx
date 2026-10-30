import { createBevelBox } from './propGeometry';
import { getCabinetFinish } from './propMaterials';
import { Part, useGeometries, type PropProps } from './propParts';

// Free carpentry pieces (utils/boardPieces.ts). Each is one solid piece filling its box, so its
// collision shape is the box itself (utils/shapes/itemShape.ts) and two boards meet flush at 0 mm.

// Loose board, lying flat (shelf, worktop, slatted base) or standing (side, partition, front): the
// thinnest side is the material thickness. Faces carry the board's photographic texture.
export function CustomBoardProp({ width: w, height: h, depth: d, materialId, category }: PropProps) {
  const g = useGeometries(() => ({ board: createBevelBox(w, h, d, Math.min(0.0015, Math.min(w, h, d) / 4)) }), [w, h, d]);
  const finish = getCabinetFinish(materialId, category);
  return <Part geometry={g.board} material={finish.top} position={[0, h / 2, 0]} />;
}

// 40 × 40 mm planed pine batten (legs, rails, frames), its length along local X, edges eased
export function WoodSlatProp({ width: w, height: h, depth: d, materialId, category }: PropProps) {
  const g = useGeometries(() => ({ slat: createBevelBox(w, h, d, 0.003) }), [w, h, d]);
  const finish = getCabinetFinish(materialId, category);
  return <Part geometry={g.slat} material={finish.carcass} position={[0, h / 2, 0]} />;
}
