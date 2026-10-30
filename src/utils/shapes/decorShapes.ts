import type { Box3 } from 'three';
import type { DimensionsMM } from '../../types/camper.types';
import type { ItemShape, ShapePart } from '../../types/shape.types';
import { mmToM } from '../unitConverters';
import { part, placedAabb, sized, span, type Vec3 } from './shapeBox';
import { growVines, vinesBox, type VineOptions } from './vines';

// Decoration (components/canvas/props/decor): a few boxes hugging each visible piece. Organic
// pieces (foliage, cushions, cable swags) are approximated. Decor only collides with the cargo
// bounds (collisionMath.ts), so these shapes mostly keep its envelope honest.

const metres = (dims: DimensionsMM) => [mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth)] as const;

// Bounding sizes (m) of the CC0 models in public/models/decor (base on y = 0, centred in X/Z).
// FittedModel scales them uniformly into their target box, so the drawn size is size × s.
export const DECOR_MODEL_SIZES = {
  pottedPlant: [0.1679, 0.2675, 0.1848],
  trailingPlant: [0.1675, 0.3002, 0.1466],
  cuttingBoard: [0.4499, 0.0413, 0.2467],
  books: [0.2536, 0.2374, 0.1631],
} as const satisfies Record<string, Vec3>;

// Drawn box of a model fitted into `target` with its base at `base` (FittedModel)
export function fittedModelBox(model: Vec3, target: Vec3, base: Vec3 = [0, 0, 0]): Box3 {
  const s = Math.min(target[0] / model[0], target[1] / model[1], target[2] / model[2]);
  return sized([base[0], base[1] + (model[1] * s) / 2, base[2]], [model[0] * s, model[1] * s, model[2] * s]);
}

const modelShape = (model: Vec3) => (dims: DimensionsMM): ItemShape => ({
  parts: [part('model', fittedModelBox(model, metres(dims)))],
});

// ---- Linen cushions: two cushions on their edge leaning back, a little turned ----
const CUSHION_LEAN_RAD = 0.28;
export const CUSHION_PUFF = 0.28; // createCushion puff, share of the thickness
const CUSHION_EDGE = 1 - 2 * CUSHION_PUFF + 0.08;

export function cushionsLayout(w: number, h: number, d: number) {
  const thick = Math.min(0.13, d * 0.45);
  const lean = -Math.PI / 2 - CUSHION_LEAN_RAD;
  // Each cushion: its group (position, turn), then the lean about X, then the cushion box
  const pieces = [
    { scale: 1, x: -w / 4 + 0.01, rotation: [0, 0.08, 0] as Vec3 },
    { scale: 0.92, x: w / 4 - 0.01, rotation: [0, -0.1, 0.04] as Vec3 },
  ];
  const boxOf = (size: number, piece: (typeof pieces)[number], lift: number, z: number) =>
    placedAabb(
      // The cushion is `thick` only at its puffed centre: its edges (which set the extent of a
      // leaning cushion) are CUSHION_EDGE share of it
      sized([0, 0, (size * piece.scale) / 2], [size * piece.scale, thick * CUSHION_EDGE, size * piece.scale]),
      { position: [piece.x, lift, z], rotation: piece.rotation },
      { rotation: [lean, 0, 0] },
    );
  const union = (size: number) => pieces.map((piece) => boxOf(size, piece, 0, 0)).reduce((acc, box) => acc.union(box));
  // As large as fits: the leaning pair must stay under the module height
  let size = Math.min(h * 0.98, w / 2 - 0.02);
  const tall = union(size);
  if (tall.max.y - tall.min.y > h) size *= (h - 0.002) / (tall.max.y - tall.min.y);
  // Seated on the base and centred in depth, so the pair stays inside the module box
  const raw = union(size);
  const lift = -raw.min.y;
  const z = -(raw.min.z + raw.max.z) / 2;
  return { size, thick, lean, lift, z, pieces, boxes: pieces.map((piece) => boxOf(size, piece, lift, z)) };
}

function cushionsShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const { boxes } = cushionsLayout(w, h, d);
  return { parts: boxes.map((box, i) => part(`cushion-${i}`, box)) };
}

// ---- Coffee set: serving board, gooseneck kettle, French press and two mugs ----
export const COFFEE_TRAY_T_M = 0.03;
export const MUG_R_M = 0.042;
export const MUG_H_M = 0.095;

// Kettle (spout +X, handle −X, lid knob) and mug (handle +X) boxes in their own frames
const kettleBox = (r: number, hgt: number): Box3 => span(-r * 1.55 - 0.008, r * 2 + 0.006, 0, Math.max(hgt + 0.03, hgt * 1.08 + 0.006), -r, r);
const MUG_BOX = span(-MUG_R_M, MUG_R_M + 0.034, 0, MUG_H_M, -MUG_R_M, MUG_R_M);
const COFFEE_EDGE_M = 0.004; // pieces keep this clear of the board edge

export function coffeeLayout(w: number, h: number, d: number) {
  const kettleR = Math.min(0.075, w * 0.17);
  const kettleH = Math.min(0.15, h * 0.5);
  const pressR = Math.min(0.048, w * 0.1);
  const turn = -0.35;
  // The turned kettle sits against the −X edge, the mugs against the +X / +Z edges
  const kettle = placedAabb(kettleBox(kettleR, kettleH), { rotation: [0, turn, 0] });
  const kettleX = -w / 2 + COFFEE_EDGE_M - kettle.min.x;
  const kettleZ = Math.min(Math.max(-d * 0.05, -d / 2 + COFFEE_EDGE_M - kettle.min.z), d / 2 - COFFEE_EDGE_M - kettle.max.z);
  const mugs = [
    { dx: 0, dz: 0.02, turn: 0.6 },
    { dx: MUG_R_M * 2.4, dz: 0.035, turn: 2.4 },
  ].map(({ dx, dz, turn: mugTurn }) => {
    const box = placedAabb(MUG_BOX, { rotation: [0, mugTurn, 0] });
    const x = w / 2 - COFFEE_EDGE_M - box.max.x - dx;
    const z = Math.min(d / 2 - MUG_R_M - dz, d / 2 - COFFEE_EDGE_M - box.max.z);
    return { x, z, turn: mugTurn };
  });
  return {
    kettleR,
    kettleH,
    pressR,
    pressH: Math.min(0.2, h * 0.65),
    kettle: { x: kettleX, z: kettleZ, turn },
    press: { x: kettleX + kettleR * 2.4 + pressR, z: -d * 0.18 },
    mugs,
  };
}

// Pieces of the kettle (body, spout, handle) and of a mug (body, handle) in their own frames
const kettlePieces = (r: number, hgt: number): Box3[] => [
  span(-r, r, 0, hgt + 0.03, -r, r),
  span(r * 0.8, r * 2 + 0.006, hgt * 0.15, hgt * 1.08 + 0.006, -0.006, 0.006),
  span(-r * 1.55 - 0.008, -r * 0.8, hgt * 0.25 - 0.008, hgt + 0.008, -0.008, 0.008),
];
const MUG_PIECES = [span(-MUG_R_M, MUG_R_M, 0, MUG_H_M, -MUG_R_M, MUG_R_M), span(MUG_R_M, MUG_R_M + 0.034, MUG_H_M / 2 - 0.03, MUG_H_M / 2 + 0.03, -0.006, 0.006)];

function coffeeShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = coffeeLayout(w, h, d);
  const top = COFFEE_TRAY_T_M;
  const pr = l.pressR * 1.06;
  const kettle = { position: [l.kettle.x, top, l.kettle.z] as Vec3, rotation: [0, l.kettle.turn, 0] as Vec3 };
  const names = ['kettle', 'spout', 'kettle-handle'];
  return {
    parts: [
      part('board', fittedModelBox(DECOR_MODEL_SIZES.cuttingBoard, [w, top, d])),
      // Lathe bodies are round: turning them does not change their box
      ...kettlePieces(l.kettleR, l.kettleH).map((piece, i) => part(names[i]!, placedAabb(piece, i === 0 ? { position: kettle.position } : kettle))),
      // French press up to its plunger knob
      part('press', span(l.press.x - pr, l.press.x + pr, top, top + l.pressH * 1.17 + 0.006, l.press.z - pr, l.press.z + pr)),
      ...l.mugs.flatMap((m, i) =>
        MUG_PIECES.map((piece, j) => part(`mug-${i}-${j}`, placedAabb(piece, { position: [m.x, top, m.z], rotation: [0, j === 0 ? 0 : m.turn, 0] }))),
      ),
    ],
  };
}

// ---- Hanging plant: hanger, planter in its net, leafy crown and trailing vines ----
const VINE_LEAF_M = 0.035;

export function hangingPlantLayout(w: number, h: number, d: number) {
  const potR = Math.min(0.085, Math.min(w, d) * 0.3);
  const potH = potR * 1.5;
  const potTop = h * 0.5;
  const potBottom = potTop - potH;
  // The stems are pulled in until the leaves stay inside the module box (deterministic growth)
  const half = Math.min(w, d) / 2;
  const vines: VineOptions = { count: 7, rimRadius: potR, rimY: potTop, minY: 0.01, maxRadius: half, leafSize: VINE_LEAF_M, seed: 11 };
  for (let i = 0; i < 12; i++) {
    const box = vinesBox(growVines(vines));
    if (Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) <= half) break;
    vines.maxRadius -= 0.01;
  }
  return { potR, potH, potTop, potBottom, knotY: h - 0.03, gatherY: potBottom - 0.025, ringR: 0.022 + 0.0035, vines };
}

function hangingPlantShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = hangingPlantLayout(w, h, d);
  const net = l.potR * 1.02 + 0.007;
  const crown = l.potR * 2.6;
  return {
    parts: [
      part('hanger', span(-net, net, l.potTop - 0.02, h, -net, net)),
      part('planter', span(-net, net, l.gatherY - 0.03, l.potTop + 0.004, -net, net)),
      part('crown', fittedModelBox(DECOR_MODEL_SIZES.trailingPlant, [crown, 0.2, crown], [0, l.potTop - 0.015, 0])),
      part('vines', vinesBox(growVines(l.vines))),
    ],
  };
}

// ---- Warm LED string: cable swags clipped under the ceiling, bulbs hanging from it ----
export const LED_BULB_R_M = 0.009;
const LED_SWAG_M = 0.75;
const LED_SLICES = 8; // boxes per swag
export const LED_CLIP_R_M = 0.008;

export function ledStringLayout(w: number, h: number) {
  const swags = Math.max(1, Math.round(w / LED_SWAG_M));
  return { swags, sag: Math.min(h - 0.03, 0.06 + (w / swags) * 0.12), topY: h - 0.008 };
}

function ledStringShape(dims: DimensionsMM): ItemShape {
  const [w, h] = metres(dims);
  const l = ledStringLayout(w, h);
  const swagW = w / l.swags;
  const parts: ShapePart[] = [];
  const reachZ = 0.006 + LED_BULB_R_M;
  for (let s = 0; s < l.swags; s++) {
    for (let i = 0; i < LED_SLICES; i++) {
      // Within a swag the cable is y = top − sag·(1 − t²), t ∈ [−1, 1]; the slice's lowest point is nearest t = 0
      const t0 = -1 + (2 * i) / LED_SLICES;
      const t1 = t0 + 2 / LED_SLICES;
      const lowest = t0 <= 0 && t1 >= 0 ? 0 : Math.min(t0 * t0, t1 * t1);
      const bottom = l.topY - l.sag * (1 - lowest) - LED_BULB_R_M * 2.55;
      const x0 = -w / 2 + s * swagW + ((t0 + 1) / 2) * swagW;
      // The cable's highest point in the slice (the clips at the swag ends reach the ceiling)
      const highest = t0 === -1 || t1 === 1 ? h : l.topY - l.sag * (1 - Math.max(t0 * t0, t1 * t1)) + 0.006;
      parts.push(part(`swag-${s}-${i}`, span(x0, x0 + swagW / LED_SLICES, Math.max(0, bottom), Math.min(h, highest), -reachZ, reachZ)));
    }
  }
  return { parts };
}

// ---- Surfboard carried flat under the ceiling on two straps, fins down ----
export const SURF_STRAP_W_M = 0.035;

export function surfboardLayout(h: number, d: number) {
  const thick = Math.min(0.065, h * 0.5);
  return { thick, finH: Math.min(0.11, h - thick - 0.012), boardY: h - 0.012 - thick / 2, finZ: -d / 2 + 0.12 };
}

function surfboardShape(dims: DimensionsMM): ItemShape {
  const [w, h, d] = metres(dims);
  const l = surfboardLayout(h, d);
  const bottom = l.boardY - l.thick / 2;
  const fin = (id: string, x: number, z: number) => part(id, span(x - 0.004, x + 0.004, bottom + 0.004 - l.finH, bottom, z - 0.055, z + 0.055));
  return {
    parts: [
      part('board', span(-w / 2, w / 2, bottom, l.boardY + l.thick / 2, -d / 2, d / 2)),
      fin('fin-centre', 0, l.finZ),
      fin('fin-left', -w * 0.3, l.finZ + 0.1),
      fin('fin-right', w * 0.3, l.finZ + 0.1),
      ...[-d * 0.25, d * 0.25].map((z, i) => part(`strap-${i}`, span(-w / 2, w / 2, h - 0.012, h, z - SURF_STRAP_W_M / 2, z + SURF_STRAP_W_M / 2))),
    ],
  };
}

// ---- Jute rug: one flat slab with its fringes ----
const rugShape = (dims: DimensionsMM): ItemShape => {
  const [w, h, d] = metres(dims);
  return { parts: [part('rug', span(-w / 2, w / 2, 0, Math.max(0.004, h * 0.8), -d / 2, d / 2))] };
};

export const DECOR_SHAPES: Readonly<Record<string, (dims: DimensionsMM) => ItemShape>> = {
  'decor-hanging-plant': hangingPlantShape,
  'decor-potted-plant': modelShape(DECOR_MODEL_SIZES.pottedPlant),
  'decor-linen-cushions': cushionsShape,
  'decor-led-string': ledStringShape,
  'decor-coffee-set': coffeeShape,
  'decor-jute-rug': rugShape,
  'decor-surfboard': surfboardShape,
  'decor-books': modelShape(DECOR_MODEL_SIZES.books),
};
