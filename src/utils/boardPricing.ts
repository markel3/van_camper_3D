import type { DimensionsMM, MaterialDef } from '../types/camper.types';
import type { MassAndCost } from './parametricMath';
import { mmToM } from './unitConverters';
import { BOARD_HORIZONTAL, BOARD_VERTICAL, SLAT_SECTION_MM, WOOD_SLAT } from './boardPieces';

// Loose board pieces (Phase 20) are priced as one sheet or one batten, not as a six-face box:
//   board:  area = sheet side × sheet side (m²); mass = area × thickness × density; price = area × €/m²
//           horizontal sheet = width × depth; vertical sheet = width × height
//   slat:   volume = length × 0.04 × 0.04 m³; mass = volume × density; price = length × €/m
// Reference price of planed 40 × 40 mm pine batten, € per linear metre (approximate Spanish market).
export const SLAT_PRICE_EUR_PER_M = 2.4;

const round1 = (value: number): number => Math.round(value * 10) / 10;
const round2 = (value: number): number => Math.round(value * 100) / 100;

// Mass and cost of a loose board piece at the given size and material. Null for other catalogue ids.
export function boardMassAndCost(catalogId: string, dims: DimensionsMM, material: MaterialDef): MassAndCost | null {
  if (catalogId === WOOD_SLAT) {
    const length = mmToM(dims.width);
    const section = mmToM(SLAT_SECTION_MM);
    return {
      weightKg: round1(length * section * section * material.densityKgM3),
      priceEur: round2(length * SLAT_PRICE_EUR_PER_M),
    };
  }
  if (catalogId !== BOARD_HORIZONTAL && catalogId !== BOARD_VERTICAL) return null;
  const sideB = catalogId === BOARD_HORIZONTAL ? dims.depth : dims.height;
  const area = mmToM(dims.width) * mmToM(sideB);
  const thickness = mmToM(material.thicknessMM);
  return {
    weightKg: round1(area * thickness * material.densityKgM3),
    priceEur: round2(area * material.priceEurM2),
  };
}
