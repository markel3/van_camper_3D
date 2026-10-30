import { DIY_BOARD_MATERIALS } from '../../../data/diyCatalog';
import { isBoardPiece, WOOD_SLAT } from '../../../utils/boardPieces';
import { findMaterial } from '../../../data/materialsCatalog';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';

// Quick wood selector of the carpentry tab: applies to the next board and the selected board (never to slats, always pine)
export function DiyWoodPicker() {
  const diyMaterialId = useViewStore((state) => state.diyMaterialId);
  const setDiyMaterial = useViewStore((state) => state.setDiyMaterial);
  const setItemMaterial = useProjectStore((state) => state.setItemMaterial);

  const choose = (id: string) => {
    setDiyMaterial(id);
    const { selectedId, items } = useProjectStore.getState();
    const selected = items.find((item) => item.id === selectedId);
    if (selected && isBoardPiece(selected.catalogId) && selected.catalogId !== WOOD_SLAT && !selected.locked && selected.materialId !== id) setItemMaterial(selected.id, id);
  };

  return (
    <div className="mb-3 rounded-md border border-cad-accent/50 bg-cad-raised p-2" data-diy-wood>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-cad-faint">Madera del tablero</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Madera del tablero">
        {DIY_BOARD_MATERIALS.map(({ id, label }) => {
          const active = id === diyMaterialId;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              title={label}
              onClick={() => choose(id)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11.5px] transition-colors ${
                active ? 'border-cad-accent bg-cad-accent/20 text-white' : 'border-cad-border text-cad-muted hover:bg-cad-hover hover:text-white'
              }`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/40"
                style={{ backgroundColor: findMaterial(id)?.texture.baseColor ?? '#ccc' }}
              />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-cad-faint">Se aplica a la próxima pieza y al tablero seleccionado</p>
    </div>
  );
}
