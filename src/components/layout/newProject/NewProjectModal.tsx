import { useEffect, useState } from 'react';
import { Caravan, Check, Truck, X } from 'lucide-react';
import { VANS_CATALOG } from '../../../data/vansCatalog';
import { DEFAULT_INTERIOR_FINISH } from '../../../data/interiorFinish';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { Thumbnail } from '../catalog/Thumbnail';
import { ChassisSpecs } from './ChassisSpecs';

// «Nuevo proyecto» dialog: pick the base vehicle and load it. A fresh project is one loadProject
// (single undo step restores the previous project); «Conservar módulos» swaps only the van (setVan).
export function NewProjectModal() {
  const open = useViewStore((state) => state.isNewProjectOpen);
  if (!open) return null;
  return <Dialog />;
}

function Dialog() {
  const setOpen = useViewStore((state) => state.setNewProjectOpen);
  const currentVan = useProjectStore((state) => state.van);
  const [selectedId, setSelectedId] = useState(currentVan.id);
  const [keepModules, setKeepModules] = useState(false);
  const selected = VANS_CATALOG.find((van) => van.id === selectedId) ?? currentVan;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const load = () => {
    const store = useProjectStore.getState();
    if (keepModules) {
      // Keeps the user's custom awning choice only where the variant supports it
      store.setVan(selected.id === store.van.id ? store.van : { ...selected });
    } else {
      store.loadProject({ van: { ...selected }, items: [], interiorFinish: { ...DEFAULT_INTERIOR_FINISH, insulation: [] } });
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]"
      onPointerDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        data-new-project
        className="flex max-h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-lg border border-cad-border bg-cad-panel shadow-2xl shadow-black/60"
      >
        <header className="relative flex h-10 shrink-0 items-center justify-center border-b border-cad-border bg-cad-chrome">
          <Caravan size={18} className="absolute left-3 text-cad-accent-hi" />
          <h2 id="new-project-title" className="text-[15px] uppercase tracking-wide text-white">
            Nuevo proyecto
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="absolute right-2 flex h-7 w-7 items-center justify-center rounded text-cad-muted hover:bg-cad-hover hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <p className="shrink-0 border-b border-cad-border px-4 py-3 text-[17px] text-white">Selecciona el vehículo base</p>

        <div className="flex min-h-0 flex-1 gap-3 p-3 max-md:flex-col">
          <div className="cad-scroll grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1">
            {VANS_CATALOG.map((van) => {
              const active = van.id === selected.id;
              return (
                <button
                  key={van.id}
                  type="button"
                  aria-pressed={active}
                  data-van-card={van.id}
                  onClick={() => setSelectedId(van.id)}
                  className={`relative flex flex-col overflow-hidden rounded-md border-2 bg-cad-raised text-left transition-colors ${
                    active ? 'border-cad-accent' : 'border-cad-line hover:border-cad-accent/60'
                  }`}
                >
                  <Thumbnail id={`van-${van.id}`} alt={van.name} fallbackIcon={Truck} className="aspect-[16/10] w-full rounded-none" />
                  {active && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-cad-accent text-white shadow">
                      <Check size={15} strokeWidth={3} />
                    </span>
                  )}
                  <span className="px-2 py-2 text-center text-[15px] text-white">{van.name}</span>
                </button>
              );
            })}
          </div>

          <aside className="w-[22rem] shrink-0 rounded-md border border-cad-line bg-cad-raised/60 p-3 max-md:w-full">
            <h3 className="mb-2 text-[16px] uppercase tracking-wide text-white">Especificaciones del chasis</h3>
            <ChassisSpecs van={selected} />
          </aside>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-cad-border px-4 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-cad-muted">
            <input
              type="checkbox"
              checked={keepModules}
              onChange={(event) => setKeepModules(event.target.checked)}
              className="cad-range h-4 w-4"
            />
            Conservar módulos y acabados actuales
          </label>
          <button
            type="button"
            onClick={load}
            data-load-chassis
            className="ml-auto rounded-md bg-cad-accent px-5 py-2 text-[15px] text-white hover:bg-cad-accent-hi"
          >
            Cargar chasis
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-cad-border bg-cad-raised px-5 py-2 text-[15px] text-cad-text hover:bg-cad-hover"
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  );
}
