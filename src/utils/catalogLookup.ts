import { ITEMS_CATALOG } from '../data/itemsCatalog';
import type { CatalogItemDef } from '../types/camper.types';

// Catalogue-only facts resolved by catalogId (never stored on CamperItem, so saved projects pick
// up catalogue changes automatically).

const BY_ID = new Map(ITEMS_CATALOG.map((def) => [def.catalogId, def]));

export const findCatalogDef = (catalogId: string): CatalogItemDef | undefined => BY_ID.get(catalogId);

// Doors, lids or drawers the Inspector can open
export const isArticulated = (catalogId: string): boolean => BY_ID.get(catalogId)?.articulated === true;

// Left panel groups (Spanish UI labels), in display order
export const CATALOG_GROUPS = [
  { id: 'furniture', label: 'Estructura y muebles' },
  { id: 'waterBath', label: 'Agua y baño' },
  { id: 'electrical', label: 'Electricidad' },
  { id: 'roof', label: 'Techo' },
] as const;

export type CatalogGroupId = (typeof CATALOG_GROUPS)[number]['id'];

export function catalogGroup(def: CatalogItemDef): CatalogGroupId {
  if (def.mount === 'roof') return 'roof';
  if (def.category === 'electrical') return 'electrical';
  if (def.category === 'water' || def.category === 'bathroom') return 'waterBath';
  return 'furniture';
}
