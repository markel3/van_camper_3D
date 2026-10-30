import { CylinderGeometry, LatheGeometry, Vector2, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { finishMaterials } from '../finishMaterials';
import { getTextileFinish } from '../propMaterials';
import { createBevelBox, createCushion } from '../propGeometry';
import { Part, useGeometries, type PropProps } from '../propParts';
import { DECOR_MODELS, FittedModel } from './DecorModel';
import { CUSHION_PUFF, cushionsLayout } from '../../../../utils/shapes/decorShapes';

// Simple pot used as the fallback of the potted plant while its model loads
function PotFallback({ width: w, height: h }: { width: number; height: number }) {
  const r = Math.min(w, 0.2) * 0.42;
  const g = useGeometries(
    () => ({
      pot: new LatheGeometry([new Vector2(0.001, 0), new Vector2(r * 0.8, 0), new Vector2(r, h * 0.55), new Vector2(r * 0.9, h * 0.55)], 24),
    }),
    [r, h],
  );
  return <Part geometry={g.pot} material={finishMaterials.ceramicWhite()} position={[0, 0, 0]} />;
}

// Potted plant (planta en maceta): CC0 Poly Haven model fitted into the module box
export function PottedPlantProp({ width: w, height: h, depth: d }: PropProps) {
  return (
    <FittedModel url={DECOR_MODELS.pottedPlant} size={[w, h, d]} fallback={<PotFallback width={w} height={h} />} />
  );
}

// Row of books (CC0 model); fallback: plain coloured blocks
export function BooksProp({ width: w, height: h, depth: d }: PropProps) {
  const g = useGeometries(() => ({ block: createBevelBox(w * 0.9, h * 0.95, d * 0.9, 0.004) }), [w, h, d]);
  const fallback = <Part geometry={g.block} material={finishMaterials.linenBeige()} position={[0, (h * 0.95) / 2, 0]} />;
  return <FittedModel url={DECOR_MODELS.books} size={[w, h, d]} fallback={fallback} />;
}

// Two linen cushions leaning back (cojines de lino): one beige, one grey-beige, a little turned
export function LinenCushionsProp({ width: w, height: h, depth: d, materialId }: PropProps) {
  const fabric = getTextileFinish(materialId);
  // Shared with the collision shape (utils/shapes/decorShapes.ts)
  const { size, thick, lean, lift, z, pieces } = cushionsLayout(w, h, d);
  const g = useGeometries(
    () => ({
      a: createCushion(size, thick, size, { radius: 0.045, puff: thick * CUSHION_PUFF, wrinkle: 0.006, seed: 21 }),
      b: createCushion(size * 0.92, thick, size * 0.92, { radius: 0.045, puff: thick * CUSHION_PUFF, wrinkle: 0.006, seed: 34 }),
    }),
    [size, thick],
  );
  // Each cushion stands on its edge (cushion Y → world Z), leaning back ~16°
  return (
    <group>
      <group position={[pieces[0]!.x, lift, z]} rotation={pieces[0]!.rotation}>
        <group rotation={[lean, 0, 0]}>
          <Part geometry={g.a!} material={fabric ?? finishMaterials.linenBeige()} position={[0, 0, size / 2]} />
        </group>
      </group>
      <group position={[pieces[1]!.x, lift, z]} rotation={pieces[1]!.rotation}>
        <group rotation={[lean, 0, 0]}>
          <Part geometry={g.b!} material={fabric ?? finishMaterials.linenGrey()} position={[0, 0, (size * 0.92) / 2]} />
        </group>
      </group>
    </group>
  );
}

const FRINGE_PITCH_M = 0.012;

// Woven jute rug (alfombra de yute) with a darker bound border and short fringes at both ends
export function JuteRugProp({ width: w, height: h, depth: d }: PropProps) {
  const fringeL = Math.min(0.04, w * 0.05);
  const t = Math.max(0.004, h * 0.8);
  const g = useGeometries((): Record<string, BufferGeometry> => {
    const strands: BufferGeometry[] = [];
    const count = Math.max(2, Math.floor((d - 0.02) / FRINGE_PITCH_M));
    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const z = -d / 2 + 0.01 + (i + 0.5) * ((d - 0.02) / count);
        strands.push(
          new CylinderGeometry(0.0018, 0.0018, fringeL, 4).rotateZ(Math.PI / 2).translate(side * (w / 2 - fringeL / 2), 0.0018, z),
        );
      }
    }
    const fringes = mergeGeometries(strands) ?? strands[0]!;
    strands.forEach((strand) => strand !== fringes && strand.dispose());
    return { rug: createBevelBox(w - 2 * fringeL, t, d, 0.003), fringes };
  }, [w, d, t, fringeL]);
  return (
    <group>
      <Part geometry={g.rug!} material={finishMaterials.jute()} position={[0, t / 2, 0]} castShadow={false} />
      <Part geometry={g.fringes!} material={finishMaterials.rope()} position={[0, 0, 0]} castShadow={false} />
    </group>
  );
}
