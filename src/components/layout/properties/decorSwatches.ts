import type { CamperItem } from '../../../types/camper.types';
import { findMaterial } from '../../../data/materialsCatalog';
import { isTextileMaterial, materialsAllowedFor } from '../../../utils/itemPricing';

export interface PbrSwatch {
  label: string;
  color: string;
  // Catalogue id applied to parametric furniture (null: not offered for boards)
  board: string | null;
  // Catalogue id applied to textile decor (null: not offered for textiles)
  textile: string | null;
}

export const SWATCHES: readonly PbrSwatch[] = [
  { label: 'Roble', color: 'linear-gradient(135deg,#d6a670,#b07c45)', board: 'roble-18mm', textile: null },
  { label: 'Lino Beige', color: 'linear-gradient(135deg,#ddd3c3,#c5b9a5)', board: null, textile: 'lino-natural' },
  { label: 'Verde Salvia', color: 'linear-gradient(135deg,#8fa58b,#6f876c)', board: 'roble-salvia', textile: 'lino-salvia' },
  { label: 'Negro Mate', color: 'linear-gradient(135deg,#2a2d31,#141619)', board: 'negro-mate', textile: 'lino-negro' },
];

// Catalogue id the swatch applies to this item, or undefined when it does not apply
export function swatchMaterialFor(swatch: PbrSwatch, item: CamperItem | undefined): string | undefined {
  if (!item) return undefined;
  const id = item.parametric ? swatch.board : isTextileMaterial(item.materialId) ? swatch.textile : null;
  return id && findMaterial(id) && materialsAllowedFor(item).includes(id) ? id : undefined;
}
