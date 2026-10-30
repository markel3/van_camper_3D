import { ITEMS_CATALOG } from '../data/itemsCatalog';

// Catalogue products mounted on the exterior roof (CatalogItemDef.mount). Keyed by catalogId,
// so project files need no extra field and old files pick the rule up automatically.
const ROOF_MOUNTED = new Set(ITEMS_CATALOG.filter((def) => def.mount === 'roof').map((def) => def.catalogId));

export const isRoofMounted = (catalogId: string): boolean => ROOF_MOUNTED.has(catalogId);
