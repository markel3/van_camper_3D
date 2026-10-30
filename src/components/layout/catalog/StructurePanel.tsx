import { Check, Lightbulb, Tent, Truck } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { CEILING_FINISHES, FLOOR_FINISHES, WALL_FINISHES } from '../../../data/interiorFinish';
import type { VanInteriorFinish } from '../../../types/camper.types';
import { Thumbnail } from './Thumbnail';

type FinishKey = 'ceiling' | 'floor' | 'walls';

// UI swatch colours of the lining options (the 3D textures live in utils/textures)
const SWATCHES: Record<string, string> = {
  bare: 'linear-gradient(135deg,#9aa3ad,#6b7480)',
  woodSlats: 'repeating-linear-gradient(90deg,#c89a62 0 10px,#8a6238 10px 11px)',
  oak: 'repeating-linear-gradient(0deg,#b98a57 0 9px,#8f6538 9px 10px)',
  pine: 'repeating-linear-gradient(0deg,#e0bb84 0 9px,#b88c55 9px 10px)',
  warmWood: 'repeating-linear-gradient(0deg,#d2a46c 0 8px,#9b6d3d 8px 9px)',
  lightWood: 'repeating-linear-gradient(0deg,#e8d3b0 0 8px,#c7ad84 8px 9px)',
  offWhite: 'linear-gradient(135deg,#f1ede4,#d8d2c4)',
};

const GROUPS: readonly { key: FinishKey; title: string; options: readonly { id: string; label: string }[] }[] = [
  { key: 'walls', title: 'Paredes', options: WALL_FINISHES },
  { key: 'ceiling', title: 'Techo', options: CEILING_FINISHES },
  { key: 'floor', title: 'Suelo', options: FLOOR_FINISHES },
];

const TITLE = 'mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-cad-faint first:mt-0';

// Estructura: base vehicle, interior lining (walls / ceiling / floor), LED strips and awning
export function StructurePanel() {
  const van = useProjectStore((state) => state.van);
  const setVan = useProjectStore((state) => state.setVan);
  const finish = useProjectStore((state) => state.interiorFinish);
  const setInteriorFinish = useProjectStore((state) => state.setInteriorFinish);
  const setNewProjectOpen = useViewStore((state) => state.setNewProjectOpen);
  const awningAvailable = van.bodyStyle === 'camperPro';

  return (
    <div>
      <h4 className={TITLE}>Vehículo base</h4>
      <button
        type="button"
        onClick={() => setNewProjectOpen(true)}
        title="Cambiar el vehículo base"
        className="flex w-full items-center gap-2 rounded-md border border-cad-line bg-cad-raised p-1.5 text-left hover:border-cad-accent"
      >
        <Thumbnail id={`van-${van.id}`} alt={van.name} fallbackIcon={Truck} className="h-12 w-16 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-white">{van.name}</span>
          <span className="block text-[11px] text-cad-accent-hi">Cambiar vehículo…</span>
        </span>
      </button>

      {GROUPS.map(({ key, title, options }) => (
        <div key={key}>
          <h4 className={TITLE}>{title}</h4>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const active = finish[key] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  data-finish={`${key}:${option.id}`}
                  onClick={() => setInteriorFinish({ [key]: option.id } as Partial<VanInteriorFinish>)}
                  className={`relative overflow-hidden rounded-md border bg-cad-raised text-left ${
                    active ? 'border-cad-accent ring-1 ring-cad-accent' : 'border-cad-line hover:border-cad-accent/70'
                  }`}
                >
                  <span className="block h-10 w-full" style={{ background: SWATCHES[option.id] ?? '#64748b' }} />
                  {active && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cad-accent text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  <span className="line-clamp-2 block px-1.5 py-1 text-[11.5px] leading-tight text-cad-text">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <h4 className={TITLE}>Extras</h4>
      <div className="space-y-1.5">
        <ToggleRow
          icon={Lightbulb}
          label="Iluminación LED cálida 3000 K"
          checked={finish.ledStrips}
          onClick={() => setInteriorFinish({ ledStrips: !finish.ledStrips })}
        />
        <ToggleRow
          icon={Tent}
          label="Toldo lateral"
          checked={awningAvailable && van.awning}
          disabled={!awningAvailable}
          hint={awningAvailable ? undefined : 'Solo disponible en la Camper Pro'}
          onClick={() => setVan({ ...van, awning: !van.awning })}
        />
      </div>
    </div>
  );
}

interface ToggleRowProps {
  icon: typeof Lightbulb;
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
}

function ToggleRow({ icon: Icon, label, checked, disabled = false, hint, onClick }: ToggleRowProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'border-cad-accent bg-cad-accent-soft text-white' : 'border-cad-line bg-cad-raised text-cad-text hover:border-cad-accent/70'
      }`}
    >
      <Icon size={15} className={checked ? 'text-amber-300' : 'text-cad-muted'} />
      <span className="flex-1">{label}</span>
      {checked && <Check size={14} className="text-cad-accent-hi" />}
    </button>
  );
}
