import { BoxGeometry, ExtrudeGeometry, Shape, type BufferGeometry } from 'three';
import { finishMaterials } from '../finishMaterials';
import { Part, useGeometries, type PropProps } from '../propParts';
import { SURF_STRAP_W_M, surfboardLayout } from '../../../../utils/shapes/decorShapes';

const STRAP_W_M = SURF_STRAP_W_M;

// Plan outline of a shortboard: pointed nose at +Z, widest just ahead of centre, squash tail
function boardOutline(width: number, length: number): Shape {
  const hw = width / 2;
  const hl = length / 2;
  const shape = new Shape();
  shape.moveTo(0, hl);
  shape.bezierCurveTo(hw * 0.55, hl * 0.92, hw * 1.02, hl * 0.35, hw, -hl * 0.05);
  shape.bezierCurveTo(hw * 0.98, -hl * 0.55, hw * 0.62, -hl * 0.95, hw * 0.3, -hl);
  shape.lineTo(-hw * 0.3, -hl);
  shape.bezierCurveTo(-hw * 0.62, -hl * 0.95, -hw * 0.98, -hl * 0.55, -hw, -hl * 0.05);
  shape.bezierCurveTo(-hw * 1.02, hl * 0.35, -hw * 0.55, hl * 0.92, 0, hl);
  return shape;
}

// Fin template (side view): base along X, tip raked back
function finOutline(length: number, height: number): Shape {
  const shape = new Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.quadraticCurveTo(length * 0.1, height * 0.4, -length * 0.35, height);
  shape.quadraticCurveTo(-length * 0.4, height * 0.5, -length / 2, 0);
  return shape;
}

// Surfboard (tabla de surf) carried flat under the ceiling: extruded shortboard outline with
// rounded rails, glossy white deck with a teal rail band and wooden stringer, three fins pointing
// down, held by two black straps clipped to the ceiling. Nose at +Z.
export function SurfboardProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/decorShapes.ts); the board sits just under the straps
  const { thick, finH, boardY, finZ } = surfboardLayout(h, d);

  const g = useGeometries((): Record<string, BufferGeometry> => {
    const bevel = thick * 0.42;
    const board = new ExtrudeGeometry(boardOutline(w - 2 * bevel, d - 2 * bevel), {
      depth: thick - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 40,
    });
    // Extrusion runs along +Z: lay it flat (outline X/Y → world X/Z, thickness → Y) and centre it
    board.translate(0, 0, -(thick - 2 * bevel) / 2);
    board.rotateX(Math.PI / 2);
    board.computeVertexNormals();
    const rail = board.clone().scale(1.003, 0.35, 1.003);
    const fin = new ExtrudeGeometry(finOutline(0.11, finH), { depth: 0.006, bevelEnabled: false, curveSegments: 10 });
    fin.translate(0, 0, -0.003);
    fin.rotateY(Math.PI / 2);
    fin.rotateX(Math.PI); // hang down
    return {
      board,
      rail,
      fin,
      stringer: new BoxGeometry(0.004, 0.0012, d * 0.94),
      // Straps run across the board (X)
      strap: new BoxGeometry(w, 0.012, STRAP_W_M),
    };
  }, [w, d, thick, finH]);

  const deckY = boardY + thick / 2;
  return (
    <group>
      <Part geometry={g.board!} material={finishMaterials.resinWhite()} position={[0, boardY, 0]} />
      <Part geometry={g.rail!} material={finishMaterials.resinTeal()} position={[0, boardY, 0]} castShadow={false} />
      <Part geometry={g.stringer!} material={finishMaterials.oak()} position={[0, deckY + 0.0004, 0]} castShadow={false} />
      {[
        [0, finZ],
        [-w * 0.3, finZ + 0.1],
        [w * 0.3, finZ + 0.1],
      ].map(([x, z]) => (
        <Part key={x} geometry={g.fin!} material={finishMaterials.matteBlack()} position={[x!, boardY - thick / 2 + 0.004, z!]} />
      ))}
      {/* Straps over the deck, clipped to the ceiling */}
      {[-d * 0.25, d * 0.25].map((z) => (
        <Part key={z} geometry={g.strap!} material={finishMaterials.matteBlack()} position={[0, h - 0.006, z]} castShadow={false} />
      ))}
    </group>
  );
}
