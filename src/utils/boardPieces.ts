import type { CamperItem, DimensionsMM } from '../types/camper.types';
import { MATERIALS_CATALOG } from '../data/materialsCatalog';
import type { ResizeFace } from './faceResize';

// Free carpentry, board by board (Phase 20): loose boards and battens the user assembles into any
// structure. Their thickness is not a free dimension: it is the real thickness of the chosen board
// (15 / 18 mm…) or the 40 × 40 mm batten section, and the 3D grips never stretch it.
//   board-horizontal  shelf / worktop / slat base: thickness = height (Y); stretch width X, depth Z
//   board-vertical    side / partition / front: thickness = depth (local Z); stretch width X, height Y
//   wood-slat         40 × 40 mm pine batten: length = width (local X), stretched by its two ends

export const BOARD_HORIZONTAL = 'board-horizontal';
export const BOARD_VERTICAL = 'board-vertical';
export const WOOD_SLAT = 'wood-slat';
export const SLAT_SECTION_MM = 40;

const PIECES = new Set([BOARD_HORIZONTAL, BOARD_VERTICAL, WOOD_SLAT]);
export const isBoardPiece = (catalogId: string): boolean => PIECES.has(catalogId);

// Board thickness of a material (mm); 15 mm when unknown
export function boardThicknessMM(materialId: string): number {
  return MATERIALS_CATALOG.find((m) => m.id === materialId)?.thicknessMM ?? 15;
}

// Dimensions with the locked axes forced to the material thickness (or the batten section)
export function lockBoardThickness(catalogId: string, materialId: string, dims: DimensionsMM): DimensionsMM {
  if (catalogId === BOARD_HORIZONTAL) return { ...dims, height: boardThicknessMM(materialId) };
  if (catalogId === BOARD_VERTICAL) return { ...dims, depth: boardThicknessMM(materialId) };
  if (catalogId === WOOD_SLAT) return { ...dims, height: SLAT_SECTION_MM, depth: SLAT_SECTION_MM };
  return dims;
}

// Faces the push/pull grips may move: never the thickness. Other parametric modules: every grip.
export function stretchFaces(catalogId: string): readonly ResizeFace[] {
  if (catalogId === BOARD_HORIZONTAL) return ['+x', '-x', '+z', '-z'];
  if (catalogId === BOARD_VERTICAL) return ['+x', '-x', '+y', '-y'];
  if (catalogId === WOOD_SLAT) return ['+x', '-x'];
  return ['+x', '-x', '+z', '-z', '+y'];
}

// ---- Orientation (Inspector quick buttons) ----
// horizontal: lying flat. vertical-long: standing, its face along the van (runs front to back, Z).
// vertical-trans: standing across the van (runs side to side, X).
export type BoardOrientation = 'horizontal' | 'vertical-long' | 'vertical-trans';

const isOddTurn = (yaw: number): boolean => Math.abs(Math.round(yaw / (Math.PI / 2))) % 2 === 1;

export function boardOrientationOf(item: Pick<CamperItem, 'catalogId' | 'rotation'>): BoardOrientation | null {
  if (item.catalogId === BOARD_HORIZONTAL) return 'horizontal';
  if (item.catalogId === BOARD_VERTICAL) return isOddTurn(item.rotation.y) ? 'vertical-long' : 'vertical-trans';
  return null;
}

type Pose = Pick<CamperItem, 'catalogId' | 'dimensions' | 'rotation' | 'position'>;

// The same board turned over: its two long sides are kept (the largest stays the width), the
// thickness follows the material, and the board keeps its centre in plan and its base height.
export function orientBoard(item: Pose & Pick<CamperItem, 'materialId'>, orientation: BoardOrientation): Pose {
  const t = boardThicknessMM(item.materialId);
  const { width, height, depth } = item.dimensions;
  // The two board sides (not the thickness) in the current pose
  const sides = item.catalogId === BOARD_HORIZONTAL ? [width, depth] : [width, height];
  const long = Math.max(...sides);
  const short = Math.min(...sides);
  if (orientation === 'horizontal') {
    return {
      catalogId: BOARD_HORIZONTAL,
      dimensions: { width: long, height: t, depth: short },
      rotation: { ...item.rotation, y: 0 },
      position: item.position,
    };
  }
  return {
    catalogId: BOARD_VERTICAL,
    dimensions: { width: long, height: short, depth: t },
    rotation: { ...item.rotation, y: orientation === 'vertical-long' ? Math.PI / 2 : 0 },
    position: item.position,
  };
}
