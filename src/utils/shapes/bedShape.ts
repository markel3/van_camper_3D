import type { Box3 } from 'three';
import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape, ShapePart } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import { part, span, turnBox } from './shapeBox';

// Beds (BedProp): one layout drives both the 3D prop and the collision shape, so what collides is
// exactly what is drawn. Metres, bed frame: X across the bed, Z along it (head at −Z), pivot at the
// centre of the base. A bed wider than deep is drawn turned a quarter (`turned`).
// The space between the posts, under the slats, is open storage (garage): nothing is drawn there.

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const BED_POST_M = 0.045; // oak posts and rails
export const BED_SLAT_T_M = 0.018;
export const BED_RAIL_H_M = 0.06;
export const BED_SLAT_W_M = 0.07;
const SLAT_PITCH_M = 0.11;
const BAY_M = 0.55; // bay width between intermediate posts
const PILLOW_MAX_H_M = 0.13;
const PILLOW_D_M = 0.42;
const PILLOW_GAP_M = 0.03;
export const BED_DUVET_INSET_M = 0.045; // the drape bends inside the bed outline
export const BED_DUVET_RUMPLE_M = 0.016;
const DUVET_BEND_M = 0.04; // bend radius of createDrapedCloth
const DUVET_SHARE = 0.74; // share of the length covered by the duvet, from the foot

export interface BedHeights {
  mattressT: number;
  beddingH: number; // pillows above the mattress
  platformTop: number; // top of the slats
}

export function bedHeights(h: number): BedHeights {
  const mattressT = Math.min(clamp(h * 0.3, 0.1, 0.16), h * 0.35);
  const beddingH = Math.min(PILLOW_MAX_H_M * 0.85, h * 0.2);
  const platformTop = Math.max(0.06, h - beddingH - mattressT);
  return { mattressT, beddingH, platformTop };
}

export interface BedLayout extends BedHeights {
  across: number; // bed width
  along: number; // bed length
  turned: boolean;
  railTop: number; // top of the posts and upper rails
  posts: [number, number][]; // (x, z) of every post
  slatZs: number[]; // slat centres
  mattressTop: number;
  // `top`: the pillows' highest point (the prop seats its cushion geometry on it)
  pillow: { w: number; h: number; d: number; xs: number[]; top: number; z: number };
  duvet: { width: number; length: number; sideDrop: number; endDrop: number; z: number };
}

export function bedLayout(w: number, h: number, d: number): BedLayout {
  const across = Math.min(w, d);
  const along = Math.max(w, d);
  const heights = bedHeights(h);
  const { mattressT, beddingH, platformTop } = heights;
  const railTop = Math.min(platformTop + 0.02, platformTop + mattressT * 0.25);
  const bays = Math.max(1, Math.round(along / BAY_M));
  const posts: [number, number][] = [];
  for (let i = 0; i <= bays; i++) {
    const z = -along / 2 + BED_POST_M / 2 + ((along - BED_POST_M) * i) / bays;
    for (const x of [-across / 2 + BED_POST_M / 2, across / 2 - BED_POST_M / 2]) posts.push([x, z]);
  }
  const slatCount = Math.max(2, Math.floor((along - 2 * BED_POST_M) / SLAT_PITCH_M));
  const slatZs = Array.from({ length: slatCount }, (_, i) => -along / 2 + BED_POST_M + SLAT_PITCH_M * (i + 0.5));
  const mattressTop = platformTop + mattressT;
  // Pillows reach exactly the top of the bedding
  const pillowH = beddingH / 0.85;
  const count = across >= 1.0 ? 2 : 1;
  const pillowW = Math.min(0.6, (across - 0.08) / count - 0.02);
  const xs = Array.from({ length: count }, (_, i) => (count === 1 ? 0 : (i - 0.5) * (pillowW + PILLOW_GAP_M)));
  const length = along * DUVET_SHARE;
  return {
    ...heights,
    across,
    along,
    turned: w > d,
    railTop,
    posts,
    slatZs,
    mattressTop,
    pillow: { w: pillowW, h: pillowH, d: PILLOW_D_M, xs, top: mattressTop + beddingH, z: -along / 2 + 0.26 },
    duvet: {
      width: across - 2 * BED_DUVET_INSET_M,
      length,
      sideDrop: mattressT * 0.75,
      endDrop: mattressT * 0.7,
      // The foot bend stays inside the bed outline, like the sides
      z: along / 2 - length / 2 - BED_DUVET_INSET_M,
    },
  };
}

// Solid parts in the bed frame (before the `turned` quarter turn)
function bedFrameParts(l: BedLayout): ShapePart[] {
  const { across, along, railTop, platformTop, mattressTop, pillow, duvet } = l;
  const p = BED_POST_M;
  const innerX = across / 2 - p;
  const innerZ = along / 2 - p;
  const parts: ShapePart[] = l.posts.map(([x, z], i) => part(`post-${i}`, span(x - p / 2, x + p / 2, 0, railTop, z - p / 2, z + p / 2)));
  // Rails run in the outer half of the post band, at the platform and along the floor
  for (const [level, y0] of [['top', railTop - BED_RAIL_H_M], ['bottom', 0]] as const) {
    for (const s of [-1, 1]) {
      parts.push(part(`rail-${level}-side${s}`, span(s * (across / 2 - p / 2), s * (across / 2), y0, y0 + BED_RAIL_H_M, -innerZ, innerZ)));
      parts.push(part(`rail-${level}-end${s}`, span(-innerX, innerX, y0, y0 + BED_RAIL_H_M, s * (along / 2 - p / 2), s * (along / 2))));
    }
  }
  const firstSlat = l.slatZs[0]! - BED_SLAT_W_M / 2;
  const lastSlat = l.slatZs[l.slatZs.length - 1]! + BED_SLAT_W_M / 2;
  parts.push(part('slats', span(-innerX, innerX, platformTop - BED_SLAT_T_M, platformTop, firstSlat, lastSlat)));
  parts.push(part('mattress', span(-across / 2 + 0.006, across / 2 - 0.006, platformTop, mattressTop, -along / 2 + 0.006, along / 2 - 0.006)));
  // Duvet: rumpled top over the foot end, hanging down the sides and the foot
  const halfDrape = duvet.width / 2 + DUVET_BEND_M;
  const drapeBottom = mattressTop - duvet.sideDrop + DUVET_BEND_M * (Math.PI / 2 - 1);
  parts.push(
    part('duvet', span(-halfDrape, halfDrape, drapeBottom, mattressTop + 1.6 * BED_DUVET_RUMPLE_M, duvet.z - duvet.length / 2, duvet.z + duvet.length / 2 + DUVET_BEND_M)),
  );
  pillow.xs.forEach((x, i) =>
    parts.push(part(`pillow-${i}`, span(x - pillow.w / 2, x + pillow.w / 2, pillow.top - pillow.h * 0.9, pillow.top, pillow.z - pillow.d / 2, pillow.z + pillow.d / 2))),
  );
  return parts;
}

export function bedShape(dims: DimensionsMM): ItemShape {
  const l = bedLayout(mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth));
  const turn = l.turned ? Math.PI / 2 : 0;
  const openSpace: Box3 = span(
    -l.across / 2 + BED_POST_M,
    l.across / 2 - BED_POST_M,
    0,
    l.platformTop - BED_SLAT_T_M,
    -l.along / 2 + BED_POST_M,
    l.along / 2 - BED_POST_M,
  );
  return {
    parts: bedFrameParts(l).map(({ id, box }) => part(id, turnBox(box, turn))),
    openSpace: turnBox(openSpace, turn),
  };
}
