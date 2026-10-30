import { Check } from 'lucide-react';
import { findMaterial } from '../../../data/materialsCatalog';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { SWATCHES, swatchMaterialFor } from './decorSwatches';
import { Section, StatRow, Switch } from '../../ui/Panel';
import { formatNumber } from '../telemetry/format';
import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';

// Decoration phase: PBR finish swatches for the selected furniture or textile + LED intensity
export function DecorProperties() {
  const item = useProjectStore((state) => state.items.find((i) => i.id === state.selectedId));
  const setItemMaterial = useProjectStore((state) => state.setItemMaterial);
  const ledIntensity = useViewStore((state) => state.ledIntensity);
  const setLedIntensity = useViewStore((state) => state.setLedIntensity);
  const isNight = useViewStore((state) => state.isNight);
  const setNight = useViewStore((state) => state.setNight);
  const { totalMassKg, budgetEur } = useEngineeringMetrics();

  return (
    <Section title="Materiales PBR">
      <div data-decor-properties>
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map((swatch) => {
            const materialId = swatchMaterialFor(swatch, item);
            const active = Boolean(item && materialId && item.materialId === materialId);
            const usable = materialId !== undefined;
            const hint = !item
              ? 'Selecciona un mueble o textil'
              : !usable
                ? `${swatch.label} no se aplica a ${item.name}`
                : `Aplicar ${findMaterial(materialId)?.name ?? swatch.label}`;
            return (
              <button
                key={swatch.label}
                type="button"
                title={hint}
                aria-pressed={active}
                data-swatch={swatch.label}
                disabled={!usable}
                onClick={() => item && materialId && setItemMaterial(item.id, materialId)}
                className="group flex flex-col items-center gap-1 text-center disabled:cursor-default disabled:opacity-40"
              >
                <span
                  className={`relative block aspect-square w-full rounded-md border-2 shadow-inner ${
                    active ? 'border-cad-accent' : 'border-transparent group-enabled:group-hover:border-cad-accent/70'
                  }`}
                  style={{ background: swatch.color }}
                >
                  {active && <Check size={14} strokeWidth={3} className="absolute right-0.5 top-0.5 text-white drop-shadow" />}
                </span>
                <span className="text-[11.5px] leading-tight text-cad-text">{swatch.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-cad-faint">
          {item ? (SWATCHES.some((sw) => swatchMaterialFor(sw, item)) ? `Aplica a: ${item.name}` : `${item.name}: material fijo`) : 'Selecciona un mueble o textil'}
        </p>

        <label className="mt-3 block">
          <span className="flex justify-between text-[13px] text-cad-text">
            Intensidad luz
            <span className="font-mono text-[12px] text-cad-muted">{Math.round(ledIntensity * 100)} %</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(ledIntensity * 100)}
            aria-label="Intensidad de las luces LED"
            onChange={(event) => setLedIntensity(Number(event.target.value) / 100)}
            className="cad-range mt-1 w-full"
          />
        </label>
        <Switch label="Iluminación nocturna" checked={isNight} onChange={setNight} />

        <div className="mt-2 border-t border-cad-border pt-2">
          <StatRow label="Peso estimado" value={`${formatNumber(totalMassKg)} kg`} />
          <StatRow label="Presupuesto" value={`${formatNumber(budgetEur, 2)} €`} tone="ok" />
        </div>
      </div>
    </Section>
  );
}
