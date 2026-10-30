import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';
import { useProjectStore } from '../../../store/useProjectStore';
import { BATTERY_NOMINAL_V } from '../../../utils/energyMath';
import { Section, StatRow } from '../../ui/Panel';
import { SystemsBreakdown } from '../inspector/SystemsBreakdown';
import { clampPct, formatNumber } from '../telemetry/format';

// Display-only solar yield estimate: peak sun hours per day (conservative yearly average, Spain)
const PEAK_SUN_HOURS = 4;

function SplitBar({ leftLabel, rightLabel, leftPct }: { leftLabel: string; rightLabel: string; leftPct: number }) {
  const pct = clampPct(leftPct);
  return (
    <div className="mt-1">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-cad-bg">
        <div className="h-full bg-cad-accent" style={{ width: `${pct}%` }} />
        <div className="h-full flex-1 bg-sky-300/40" />
      </div>
      <p className="mt-0.5 flex justify-between font-mono text-[10.5px] text-cad-muted">
        <span>
          {leftLabel} {formatNumber(pct, 0)} %
        </span>
        <span>
          {rightLabel} {formatNumber(100 - pct, 0)} %
        </span>
      </p>
    </div>
  );
}

// Systems phase: electrical balance (Ah/day), water capacity, weight distribution and network lengths
export function SystemsProperties() {
  const { energy, lateral, longitudinal, totalMassKg } = useEngineeringMetrics();
  const items = useProjectStore((state) => state.items);
  const cleanL = items.reduce((sum, item) => sum + (item.waterSpecs?.cleanWaterLiters ?? 0), 0);
  const greyL = items.reduce((sum, item) => sum + (item.waterSpecs?.greyWaterLiters ?? 0), 0);
  const solarAh = (energy.solarWatts * PEAK_SUN_HOURS) / BATTERY_NOMINAL_V;
  const balanceAh = solarAh - energy.dailyConsumptionAh;

  return (
    <div className="space-y-2" data-systems-properties>
      <Section title="Balance Eléctrico (Ah/día)" collapsible>
        <StatRow label="Consumo" value={`-${formatNumber(energy.dailyConsumptionAh, 1)} Ah`} />
        <StatRow
          label="Producción solar"
          value={`+${formatNumber(solarAh, 1)} Ah`}
          title={`Estimación: ${formatNumber(energy.solarWatts)} W × ${PEAK_SUN_HOURS} h sol pico / ${BATTERY_NOMINAL_V} V`}
        />
        <StatRow label="Balance diario" value={`${balanceAh >= 0 ? '+' : ''}${formatNumber(balanceAh, 1)} Ah`} tone={balanceAh >= 0 ? 'ok' : 'bad'} />
        <StatRow label="Batería útil" value={`${formatNumber(energy.usableAh)} / ${formatNumber(energy.batteryAh)} Ah`} />
        <StatRow label="Autonomía sin sol" value={energy.autonomyDays === null ? '—' : `${formatNumber(energy.autonomyDays, 1)} días`} />
      </Section>

      <Section title={`Capacidad de Agua (${formatNumber(cleanL)} L)`} collapsible>
        <StatRow label="Agua limpia" value={`${formatNumber(cleanL)} L`} />
        <StatRow label="Aguas grises" value={`${formatNumber(greyL)} L`} />
        <StatRow label="Peso con depósito lleno" value={`${formatNumber(cleanL, 1)} kg`} title="1 L de agua ≈ 1 kg (no incluido en la masa del proyecto)" />
      </Section>

      <Section title="Distribución de Peso" collapsible>
        <StatRow label="Masa total" value={`${formatNumber(totalMassKg)} kg`} />
        <p className="mt-1 text-[11px] text-cad-faint">Lateral (conductor / pasajero)</p>
        <SplitBar leftLabel="Izq." rightLabel="Der." leftPct={lateral.leftPct} />
        <p className="mt-1 text-[11px] text-cad-faint">Ejes (delantero / trasero)</p>
        <SplitBar leftLabel="Del." rightLabel="Tras." leftPct={longitudinal.frontPct} />
      </Section>

      <Section title="Recorridos de instalación" collapsible defaultOpen={false}>
        <SystemsBreakdown />
      </Section>
    </div>
  );
}
