import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { INSULATION_MATERIALS } from '../../../data/insulationCatalog';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import type { CatalogItemDef } from '../../../types/camper.types';
import { isBoardPiece, lockBoardThickness, WOOD_SLAT } from '../../../utils/boardPieces';
import { createItemFromCatalog } from '../../../utils/itemFactory';
import { PanelTab } from '../../ui/Panel';
import { CATALOG_MODULES, MODULE_FOR_PHASE, catalogEntries, type CatalogModuleId } from './catalogModules';
import { CatalogCard, CatalogRow } from './CatalogCards';
import { InsulationCatalog } from './InsulationCatalog';
import { DiyWoodPicker } from './DiyWoodPicker';
import { StructurePanel } from './StructurePanel';

// Left dock: narrow «Módulos» icon rail + catalogue panel (dropdown, search, cards)
export function LeftSidebar() {
  const phase = useViewStore((state) => state.workflowPhase);
  const [moduleId, setModuleId] = useState<CatalogModuleId>(MODULE_FOR_PHASE[phase]);
  const [query, setQuery] = useState('');
  const addItem = useProjectStore((state) => state.addItem);

  // Follow the workflow stepper: each phase opens its catalogue module
  useEffect(() => setModuleId(MODULE_FOR_PHASE[phase]), [phase]);

  const layout = CATALOG_MODULES.find((m) => m.id === moduleId)?.layout ?? 'grid';
  const searching = query.trim() !== '';
  const entries = catalogEntries(moduleId, query);
  // Boards are cut from the wood picked in the carpentry tab (slats stay pine)
  const insert = (def: CatalogItemDef) => {
    const item = createItemFromCatalog(def, useProjectStore.getState().van);
    if (!isBoardPiece(def.catalogId) || def.catalogId === WOOD_SLAT) return addItem(item);
    const materialId = useViewStore.getState().diyMaterialId;
    addItem({ ...item, materialId, dimensions: lockBoardThickness(def.catalogId, materialId, item.dimensions) });
  };
  const ownPanel = !searching && (moduleId === 'structure' || moduleId === 'insulation');

  return (
    <aside className="flex w-[19.5rem] shrink-0 flex-col border-r border-cad-border bg-cad-panel max-[1500px]:w-[17rem]">
      <PanelTab>Módulos</PanelTab>
      <div className="flex min-h-0 flex-1">
        <nav className="cad-scroll flex w-[4.75rem] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-cad-border bg-cad-chrome py-1" aria-label="Módulos">
          {CATALOG_MODULES.map(({ id, railLabel, icon: Icon }) => {
            const active = id === moduleId;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                data-module={id}
                title={railLabel}
                onClick={() => {
                  setModuleId(id);
                  setQuery('');
                }}
                className={`mx-1 flex flex-col items-center gap-1 rounded-md px-0.5 py-2 text-center text-[11px] leading-tight transition-colors ${
                  active ? 'bg-cad-accent text-white' : 'text-cad-muted hover:bg-cad-hover hover:text-white'
                }`}
              >
                <Icon size={22} strokeWidth={1.5} className={active ? '' : 'text-cad-accent-hi/90'} />
                <span>{railLabel}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-cad-border p-2">
            <label className="relative block">
              <span className="sr-only">Categoría</span>
              <select
                value={moduleId}
                aria-label="Categoría del catálogo"
                onChange={(event) => {
                  setModuleId(event.target.value as CatalogModuleId);
                  setQuery('');
                }}
                className="w-full appearance-none rounded-md border border-cad-border bg-cad-raised py-1.5 pl-2.5 pr-8 text-[14px] text-white focus:border-cad-accent focus:outline-none"
              >
                {CATALOG_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-cad-muted" />
            </label>
            <div className="flex items-center gap-2 rounded-md border border-cad-border bg-cad-bg px-2 py-1.5 focus-within:border-cad-accent">
              <Search size={14} className="text-cad-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en todo el catálogo..."
                className="w-full bg-transparent text-[13px] text-cad-text placeholder:text-cad-faint focus:outline-none"
              />
            </div>
          </div>

          <div className="cad-scroll min-h-0 flex-1 overflow-y-auto p-2" data-catalog-module={moduleId}>
            {!searching && moduleId === 'diy' && <DiyWoodPicker />}
            {ownPanel && moduleId === 'structure' && <StructurePanel />}
            {ownPanel && moduleId === 'insulation' && <InsulationCatalog query="" />}
            {!ownPanel && layout === 'list' && !searching && (
              <div className="space-y-1.5">
                {entries.map((def) => (
                  <CatalogRow key={def.catalogId} def={def} onInsert={insert} />
                ))}
              </div>
            )}
            {!ownPanel && (layout === 'grid' || searching) && (
              <div className="grid grid-cols-2 gap-2">
                {entries.map((def) => (
                  <CatalogCard key={def.catalogId} def={def} onInsert={insert} />
                ))}
              </div>
            )}
            {searching && <SearchExtras query={query} />}
            {!ownPanel && entries.length === 0 && !searching && (
              <p className="px-1 py-2 text-xs text-cad-faint">Todavía no hay productos en esta categoría.</p>
            )}
            {searching && entries.length === 0 && <p className="px-1 py-2 text-xs text-cad-faint">Sin resultados</p>}
          </div>
        </div>
      </div>
    </aside>
  );
}

// A search also matches insulation materials (shown below the module results when any match)
function SearchExtras({ query }: { query: string }) {
  const needle = query.trim().toLowerCase();
  if (!INSULATION_MATERIALS.some((m) => m.name.toLowerCase().includes(needle))) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-cad-faint">Aislamiento</p>
      <InsulationCatalog query={query} />
    </div>
  );
}
