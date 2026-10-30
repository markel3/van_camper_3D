import type { CamperItem, MaterialDef } from '../types/camper.types';
import { ITEMS_CATALOG } from '../data/itemsCatalog';
import { MATERIALS_CATALOG, findMaterial } from '../data/materialsCatalog';
import { estimateMassAndCost, type MassAndCost } from './parametricMath';
import { boardMassAndCost } from './boardPricing';
import { isBoardPiece, WOOD_SLAT } from './boardPieces';

// Materials a parametric board module can be built from (metals and plastics belong to bought-in equipment)
const BOARD_KINDS: ReadonlySet<MaterialDef['kind']> = new Set(['plywood', 'solidWood', 'laminate']);

export const BOARD_MATERIALS: readonly MaterialDef[] = MATERIALS_CATALOG.filter((m) => BOARD_KINDS.has(m.kind));

// Battens (wood-slat) are solid wood only
const SOLID_WOOD_IDS: readonly string[] = MATERIALS_CATALOG.filter((m) => m.kind === 'solidWood').map((m) => m.id);

export const isBoardMaterial = (materialId: string): boolean =>
  BOARD_MATERIALS.some((material) => material.id === materialId);

// Textiles (plastic kind in the catalogue, outside the board list): cushions and soft furnishings
export const TEXTILE_MATERIAL_IDS: readonly string[] = ['lino-natural', 'lino-salvia', 'lino-negro'];

export const isTextileMaterial = (materialId: string): boolean => TEXTILE_MATERIAL_IDS.includes(materialId);

// Materials the selected module may switch to: boards for parametric furniture, solid wood for
// battens, textiles for textile decor, nothing for locked or bought-in equipment.
export function materialsAllowedFor(
  item: Pick<CamperItem, 'parametric' | 'locked' | 'materialId'> & { catalogId?: string },
): readonly string[] {
  if (item.locked) return [];
  if (item.catalogId === WOOD_SLAT) return SOLID_WOOD_IDS;
  if (item.parametric) return BOARD_MATERIALS.map((material) => material.id);
  return isTextileMaterial(item.materialId) ? TEXTILE_MATERIAL_IDS : [];
}

// Mass and cost of a module at its current size and material, from its catalog baseline.
// Returns null when the catalog entry or a material is unknown (e.g. an old or hand-edited file),
// in which case the caller keeps the stored values. Loose board pieces are priced per sheet/batten.
export function repriceItem(item: Pick<CamperItem, 'catalogId' | 'dimensions' | 'materialId'>): MassAndCost | null {
  const material = findMaterial(item.materialId);
  if (isBoardPiece(item.catalogId)) {
    return material ? boardMassAndCost(item.catalogId, item.dimensions, material) : null;
  }
  const base = ITEMS_CATALOG.find((def) => def.catalogId === item.catalogId);
  const baseMaterial = base && findMaterial(base.materialId);
  if (!base || !baseMaterial || !material) return null;
  return estimateMassAndCost(base, baseMaterial, item.dimensions, material);
}
