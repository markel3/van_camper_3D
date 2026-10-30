import { Check } from 'lucide-react';
import { INSULATION_MATERIALS } from '../../../data/insulationCatalog';
import { useProjectStore } from '../../../store/useProjectStore';
import type { InsulationMaterialDef, InsulationMaterialId } from '../../../types/camper.types';
import { formatNumber } from '../telemetry/format';

// Material swatch drawn in CSS (roll of foam / wool batt look) from the catalogue colour
function Swatch({ material }: { material: InsulationMaterialDef }) {
  const stripes =
    material.kind === 'mineralWool' || material.kind === 'felt'
      ? `repeating-linear-gradient(115deg, transparent 0 5px, rgba(255,255,255,0.18) 5px 7px)`
      : material.kind === 'reflective' || material.kind === 'tape'
        ? `linear-gradient(135deg, rgba(255,255,255,0.55), transparent 45%, rgba(255,255,255,0.35) 70%, transparent)`
        : `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%)`;
  return (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#e9edf2,#b7c0cc)]">
      <div
        className="h-3/5 w-3/5 rounded-md shadow-lg shadow-black/40"
        style={{ backgroundColor: material.color, backgroundImage: stripes }}
      />
    </div>
  );
}

// Aislamiento: toggle cards adding/removing layers in interiorFinish.insulation (one undo step each)
export function InsulationCatalog({ query }: { query: string }) {
  const insulation = useProjectStore((state) => state.interiorFinish.insulation);
  const setInteriorFinish = useProjectStore((state) => state.setInteriorFinish);
  const needle = query.trim().toLowerCase();
  const materials = INSULATION_MATERIALS.filter((m) => m.name.toLowerCase().includes(needle));

  const toggle = (id: InsulationMaterialId) =>
    setInteriorFinish({ insulation: insulation.includes(id) ? insulation.filter((x) => x !== id) : [...insulation, id] });

  return (
    <div className="grid grid-cols-2 gap-2">
      {materials.map((material) => {
        const active = insulation.includes(material.id);
        return (
          <button
            key={material.id}
            type="button"
            aria-pressed={active}
            data-insulation={material.id}
            title={active ? `Quitar ${material.name}` : `Aplicar ${material.name} a paredes y techo`}
            onClick={() => toggle(material.id)}
            className={`relative flex flex-col overflow-hidden rounded-md border text-left transition-colors ${
              active ? 'border-cad-accent ring-1 ring-cad-accent' : 'border-cad-line hover:border-cad-accent/70'
            } bg-cad-raised`}
          >
            <Swatch material={material} />
            {active && (
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cad-accent text-white">
                <Check size={13} strokeWidth={3} />
              </span>
            )}
            <span className="line-clamp-2 px-1.5 pt-1 text-center text-[12.5px] leading-tight text-cad-text">{material.name}</span>
            <span className="pb-1.5 text-center font-mono text-[10.5px] text-cad-faint">
              {material.thicknessMM > 0 ? `${formatNumber(material.thicknessMM, material.thicknessMM < 1 ? 1 : 0)} mm · ` : ''}
              {formatNumber(material.priceEurM2, 2)} €/m²
            </span>
          </button>
        );
      })}
      {materials.length === 0 && <p className="col-span-2 text-xs text-cad-faint">Sin resultados</p>}
    </div>
  );
}
