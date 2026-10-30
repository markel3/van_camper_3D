import { useMemo } from 'react';
import { useProjectStore } from '../../../store/useProjectStore';
import { computeInsulationMetrics } from '../../../utils/insulationMetrics';
import { Section, StatRow } from '../../ui/Panel';
import { formatNumber } from '../telemetry/format';

const m2 = (value: number) => `${formatNumber(value, 2)} m²`;

// Insulation phase: covered areas, per-material thickness / mass / cost and the totals
export function InsulationProperties() {
  const van = useProjectStore((state) => state.van);
  const insulation = useProjectStore((state) => state.interiorFinish.insulation);
  const metrics = useMemo(() => computeInsulationMetrics(van, insulation), [van, insulation]);

  return (
    <Section title="Materiales Térmicos">
      <div data-insulation-metrics>
        <StatRow label="Área paredes" value={m2(metrics.wallAreaM2)} />
        <StatRow label="Área techo" value={m2(metrics.roofAreaM2)} />
        <StatRow label="Área suelo" value={m2(metrics.floorAreaM2)} />

        <div className="my-2 h-px bg-cad-border" />
        {metrics.perMaterial.length === 0 ? (
          <p className="py-1 text-xs text-cad-faint">Chapa desnuda. Elige materiales en el catálogo «Aislamiento».</p>
        ) : (
          <ul className="space-y-1.5">
            {metrics.perMaterial.map((material) => (
              <li key={material.id} className="rounded border border-cad-line bg-cad-panel/60 px-2 py-1">
                <p className="flex justify-between text-[12.5px] text-white">
                  <span className="truncate">{material.name}</span>
                  <span className="font-mono text-[11px] text-cad-muted">
                    {material.thicknessMM > 0 ? `${formatNumber(material.thicknessMM, material.thicknessMM < 1 ? 1 : 0)} mm` : '—'}
                  </span>
                </p>
                <p className="flex justify-between font-mono text-[11px] text-cad-muted">
                  <span>{m2(material.areaM2)}</span>
                  <span>{formatNumber(material.massKg, 1)} kg</span>
                  <span className="text-cad-ok-hi">{formatNumber(material.costEur, 2)} €</span>
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="my-2 h-px bg-cad-border" />
        <StatRow label="Área instalada" value={m2(metrics.areaM2)} />
        <StatRow label="Peso estimado" value={`${formatNumber(metrics.massKg, 1)} kg`} />
        <StatRow label="Presupuesto" value={`${formatNumber(metrics.costEur, 2)} €`} tone="ok" />
      </div>
    </Section>
  );
}
