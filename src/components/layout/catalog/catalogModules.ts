import { AppWindow, Armchair, Box, Cable, Hammer, Layers3, Sprout, type LucideIcon } from 'lucide-react';
import { isDiy } from '../../../data/diyCatalog';
import { ITEMS_CATALOG } from '../../../data/itemsCatalog';
import type { CatalogItemDef, WorkflowPhase } from '../../../types/camper.types';

// Left rail «Módulos»: each module filters the catalogue (or shows its own panel) with a card layout
export type CatalogModuleId = 'structure' | 'furniture' | 'systems' | 'insulation' | 'windows' | 'decor' | 'diy';

export interface CatalogModule {
  id: CatalogModuleId;
  label: string;
  // Two-line label of the narrow rail
  railLabel: string;
  icon: LucideIcon;
  // 'grid' = two-column thumbnail cards, 'list' = thumbnail + weight/price rows (Instalaciones)
  layout: 'grid' | 'list';
}

export const CATALOG_MODULES: readonly CatalogModule[] = [
  { id: 'diy', label: 'Carpintería (tableros)', railLabel: 'Carpintería', icon: Hammer, layout: 'grid' },
  { id: 'structure', label: 'Estructura', railLabel: 'Estructura', icon: Box, layout: 'grid' },
  { id: 'furniture', label: 'Mobiliario', railLabel: 'Mobiliario', icon: Armchair, layout: 'grid' },
  { id: 'systems', label: 'Instalaciones', railLabel: 'Instalaciones', icon: Cable, layout: 'list' },
  { id: 'insulation', label: 'Aislamiento', railLabel: 'Aislamiento', icon: Layers3, layout: 'grid' },
  { id: 'windows', label: 'Ventanas', railLabel: 'Ventanas', icon: AppWindow, layout: 'grid' },
  { id: 'decor', label: 'Decoración y Plantas', railLabel: 'Decoración y Plantas', icon: Sprout, layout: 'grid' },
];

// The module the catalogue jumps to when the workflow phase changes
export const MODULE_FOR_PHASE: Record<WorkflowPhase, CatalogModuleId> = {
  model: 'structure',
  insulation: 'insulation',
  systems: 'systems',
  furniture: 'furniture',
  decor: 'decor',
};

const isSolar = (def: CatalogItemDef) => (def.electricalSpecs?.solarWatts ?? 0) > 0;

// Which catalogue products each module lists (structure and insulation have their own panels)
export function moduleOf(def: CatalogItemDef): CatalogModuleId {
  if (isDiy(def.catalogId)) return 'diy';
  if (def.category === 'decor') return 'decor';
  if (def.category === 'openings') return isSolar(def) ? 'systems' : 'windows';
  if (def.category === 'electrical' || def.category === 'water' || def.category === 'bathroom') return 'systems';
  return 'furniture';
}

export function catalogEntries(module: CatalogModuleId, query: string): CatalogItemDef[] {
  const needle = query.trim().toLowerCase();
  return ITEMS_CATALOG.filter(
    (def) => (needle ? def.name.toLowerCase().includes(needle) : moduleOf(def) === module),
  );
}
