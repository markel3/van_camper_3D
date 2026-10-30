import type { Box3 } from 'three';
import type { CamperItem, DimensionsMM } from '../../types/camper.types';
import type { ItemShape } from '../../types/shape.types';
import { ITEMS_CATALOG } from '../../data/itemsCatalog';
import { mmToM } from '../unitConverters';
import { bedShape } from './bedShape';
import { benchShape } from './benchShape';
import { drawerUnitShape, fridgeShape, kitchenShape, overheadShape } from './cabinetShapes';
import { DECOR_SHAPES } from './decorShapes';
import { batteryShape, hydraulicKitShape, inverterShape, tankShape } from './deviceShapes';
import { lagunShape, showerShape, skylightShape, solarShape, toiletShape } from './fixtureShapes';
import { localToVanBox, part, span } from './shapeBox';

// Compound collision shape of every catalogue module: the solid parts its 3D prop draws
// (WORKFLOWS.md, Flow 3). Unknown ids (old files) and .glb-only modules are drawn as their full
// box, so their shape is that box. Shapes are cached per catalogue id and dimensions.

// `boardMM`: nominal board thickness of the module's material (DIY carpentry keeps it real while resizing)
export type ShapeBuilder = (dims: DimensionsMM, boardMM?: number) => ItemShape;

const SHAPES: Readonly<Record<string, ShapeBuilder>> = {
  'bed-fixed-1900': bedShape,
  'bed-rear-garage': bedShape,
  'seat-chest-1000': benchShape(true),
  'locker-side-1000': benchShape(false),
  'kitchen-block-1000': kitchenShape,
  'drawer-unit-600': drawerUnitShape,
  'overhead-cabinet-1000': overheadShape,
  'fridge-65l-12v': fridgeShape,
  'fridge-85l': fridgeShape,
  'fridge-100l': fridgeShape,
  'battery-lifepo4-100ah': batteryShape,
  'water-tank-clean-100l': tankShape,
  'grey-water-tank-90l': tankShape,
  'inverter-2000va': inverterShape,
  'water-pump-boiler-kit': hydraulicKitShape,
  'toilet-portable': toiletShape,
  'shower-cabin-800': showerShape,
  'lagun-table': lagunShape,
  'solar-panel-100w': solarShape,
  'skylight-400': skylightShape,
  // Free carpentry (boardPieces.ts): a board or batten is one solid piece
  'board-horizontal': (dims) => envelopeShape(dims, 'board'),
  'board-vertical': (dims) => envelopeShape(dims, 'board'),
  'wood-slat': (dims) => envelopeShape(dims, 'slat'),
  ...DECOR_SHAPES,
};

// The whole module box as a single part
export function envelopeShape(dims: DimensionsMM, id = 'box'): ItemShape {
  const w = mmToM(dims.width);
  const d = mmToM(dims.depth);
  return { parts: [part(id, span(-w / 2, w / 2, 0, mmToM(dims.height), -d / 2, d / 2))] };
}

// Modules drawn by a catalogue .glb (FurnitureModel fills the module box with it)
const MODEL_DRAWN = new Set(ITEMS_CATALOG.filter((def) => def.modelUrl).map((def) => def.catalogId));

const shapeOf = (catalogId: string) => (MODEL_DRAWN.has(catalogId) ? undefined : SHAPES[catalogId]);

const CACHE_LIMIT = 512;
const cache = new Map<string, ItemShape>();

// Local shape (module frame) of a catalogue module with the given dimensions
export function localShape(catalogId: string, dims: DimensionsMM, boardMM?: number): ItemShape {
  const key = `${catalogId}|${dims.width}|${dims.height}|${dims.depth}|${boardMM ?? ''}`;
  let shape = cache.get(key);
  if (!shape) {
    const build = shapeOf(catalogId);
    shape = build ? build(dims, boardMM) : envelopeShape(dims);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, shape);
  }
  return shape;
}

export type ShapedItem = Pick<CamperItem, 'catalogId' | 'position' | 'rotation' | 'dimensions'>;

// The module's solid parts in van space (quarter turns honoured, like itemBox)
export const itemParts = (item: ShapedItem): Box3[] =>
  localShape(item.catalogId, item.dimensions).parts.map(({ box }) => localToVanBox(item, box));

// The module's open storage space in van space, or null when it has none
export function itemOpenSpace(item: ShapedItem): Box3 | null {
  const space = localShape(item.catalogId, item.dimensions).openSpace;
  return space ? localToVanBox(item, space) : null;
}
