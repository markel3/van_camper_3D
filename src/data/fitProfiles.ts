import type { DimensionsMM } from '../types/camper.types';
import { mmToM } from '../utils/unitConverters';
import { bedHeights } from '../utils/shapes/bedShape';
import { benchLayout } from '../utils/shapes/benchShape';

// How each catalogue module adapts to its surroundings (rules in utils/fitAdaptation.ts).
// - archUsableTopM: the carcass can be notched around a wheel arch. Height (m, above the module
//   base) of the working surface that must stay clear of the arch: bed platform, chest lid, worktop.
// - nestable: a device that can be installed inside another module's open space (the open space
//   itself is part of the module's shape, utils/shapes: ItemShape.openSpace).
// Fridges, shower, toilet and roof modules have no profile: they never adapt.
// - panel: a loose board (boardPieces.ts) cut with a jigsaw around the arch: no working-surface rule
//   and no boxing boards; the notch may take up to MAX_PANEL_NOTCH_SHARE of the board's face.
export interface FitProfile {
  archUsableTopM?: (dims: DimensionsMM) => number;
  nestable?: boolean;
  panel?: boolean;
}

const bedPlatform = (dims: DimensionsMM): number => bedHeights(mmToM(dims.height)).platformTop;
const fullHeight = (dims: DimensionsMM): number => mmToM(dims.height);
const DEVICE: FitProfile = { nestable: true };

export const FIT_PROFILES: Readonly<Record<string, FitProfile>> = {
  'bed-fixed-1900': { archUsableTopM: bedPlatform },
  'bed-rear-garage': { archUsableTopM: bedPlatform },
  'seat-chest-1000': {
    archUsableTopM: (dims) => benchLayout(mmToM(dims.width), mmToM(dims.height), mmToM(dims.depth), true).chestH,
  },
  'locker-side-1000': { archUsableTopM: fullHeight },
  'kitchen-block-1000': { archUsableTopM: fullHeight },
  'drawer-unit-600': { archUsableTopM: fullHeight },
  'board-vertical': { panel: true },
  'battery-lifepo4-100ah': DEVICE,
  'inverter-2000va': DEVICE,
  'water-tank-clean-100l': DEVICE,
  'grey-water-tank-90l': DEVICE,
  'water-pump-boiler-kit': DEVICE,
};

export const fitProfileOf = (catalogId: string): FitProfile | undefined => FIT_PROFILES[catalogId];
