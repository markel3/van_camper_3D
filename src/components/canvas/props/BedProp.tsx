import { type BufferGeometry } from 'three';
import { getCabinetFinish } from './propMaterials';
import { finishMaterials } from './finishMaterials';
import { createBevelBox, createCushion, createDrapedCloth } from './propGeometry';
import { Part, useGeometries, type PropProps } from './propParts';
import {
  BED_DUVET_RUMPLE_M,
  BED_POST_M,
  BED_RAIL_H_M,
  BED_SLAT_T_M,
  BED_SLAT_W_M,
  bedLayout,
} from '../../../utils/shapes/bedShape';

// Pillow cushion stretched to exactly `height` (its bulge never quite reaches the nominal size) with
// its highest point at y = 0, so it is seated by its top on the bedding line of the layout
function seatedPillow(width: number, height: number, depth: number): BufferGeometry {
  const pillow = createCushion(width, height, depth, { radius: 0.05, puff: Math.min(0.03, height * 0.33), wrinkle: 0.006, seed: 9 });
  pillow.computeBoundingBox();
  const { min, max } = pillow.boundingBox!;
  pillow.scale(1, height / Math.max(1e-6, max.y - min.y), 1);
  pillow.computeBoundingBox();
  pillow.translate(0, -pillow.boundingBox!.max.y, 0);
  pillow.computeBoundingBox();
  return pillow;
}

// Fixed rear bed (reference look): solid-oak frame with posts and rails, slatted base, a
// cotton-covered mattress, a rumpled linen duvet draped over the sides and foot and two pillows at
// the head. The head is at the −Z end of the longer side (rotated when width > depth).
// Everything is placed from bedLayout (utils/shapes/bedShape.ts), the same layout as the bed's
// collision shape. The space between the posts under the slats is open storage (garage): nothing
// is drawn there, so devices stored in it (battery, tanks) stand free and visible.
export function BedProp({ width: w, height: h, depth: d, materialId, category }: PropProps) {
  const l = bedLayout(w, h, d);
  const { across, along, railTop, platformTop, mattressT, mattressTop, pillow, duvet } = l;
  const P = BED_POST_M;

  const g = useGeometries((): Record<string, BufferGeometry> => ({
    post: createBevelBox(P, railTop, P, 0.004),
    railLong: createBevelBox(P * 0.5, BED_RAIL_H_M, along - 2 * P, 0.003),
    railShort: createBevelBox(across - 2 * P, BED_RAIL_H_M, P * 0.5, 0.003),
    slat: createBevelBox(across - 2 * P, BED_SLAT_T_M, BED_SLAT_W_M, 0.003),
    mattress: createCushion(across - 0.012, mattressT, along - 0.012, { radius: 0.03, puff: 0.006, wrinkle: 0.002, seed: 7 }),
    duvet: createDrapedCloth({
      width: duvet.width,
      length: duvet.length,
      topY: 0,
      sideDrop: duvet.sideDrop,
      endDrop: duvet.endDrop,
      rumple: BED_DUVET_RUMPLE_M,
      seed: 4,
    }),
    pillow: seatedPillow(pillow.w, pillow.h * 0.9, pillow.d),
  }), [across, along, railTop, mattressT, pillow.w, pillow.h, pillow.d, duvet.width, duvet.length, duvet.sideDrop, duvet.endDrop]);

  const finish = getCabinetFinish(materialId, category);
  const oak = finish.accent;
  const xs = [-across / 2 + P / 2, across / 2 - P / 2];

  return (
    <group rotation={[0, l.turned ? Math.PI / 2 : 0, 0]}>
      {l.posts.map(([x, z], index) => (
        <Part key={index} geometry={g.post!} material={oak} position={[x, railTop / 2, z]} />
      ))}
      {/* Perimeter rails at the platform (they hide the slat ends) and along the floor */}
      {[railTop - BED_RAIL_H_M / 2, BED_RAIL_H_M / 2].map((y) => (
        <group key={y}>
          {xs.map((x) => (
            <Part key={x} geometry={g.railLong!} material={oak} position={[x + Math.sign(x) * P * 0.25, y, 0]} />
          ))}
          {[-1, 1].map((s) => (
            <Part key={s} geometry={g.railShort!} material={oak} position={[0, y, s * (along / 2 - P * 0.25)]} />
          ))}
        </group>
      ))}
      {l.slatZs.map((z) => (
        <Part key={z} geometry={g.slat!} material={finish.carcass} position={[0, platformTop - BED_SLAT_T_M / 2, z]} castShadow={false} />
      ))}
      <Part geometry={g.mattress!} material={finishMaterials.mattressCover()} position={[0, platformTop + mattressT / 2, 0]} />
      {/* Duvet from a quarter of the way down to the foot, falling over the sides and the foot */}
      <group position={[0, mattressTop, duvet.z]}>
        <Part geometry={g.duvet!} material={finishMaterials.duvet()} position={[0, 0, 0]} />
      </group>
      {pillow.xs.map((x, i) => (
        <Part key={i} geometry={g.pillow!} material={finishMaterials.linenBeige()} position={[x, pillow.top, pillow.z]} />
      ))}
    </group>
  );
}
