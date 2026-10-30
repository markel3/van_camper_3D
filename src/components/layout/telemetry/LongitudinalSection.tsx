import { ArrowUpDown } from 'lucide-react';
import type { LongitudinalBalance } from '../../../types/camper.types';
import { MetricBar } from './MetricBar';
import { TelemetrySection } from './TelemetrySection';
import { formatNumber, formatPercent } from './format';

interface LongitudinalSectionProps {
  longitudinal: LongitudinalBalance;
}

// Axle split: front (bar) versus rear (rest of the track).
export function LongitudinalSection({ longitudinal }: LongitudinalSectionProps) {
  const { frontPct, rearPct, frontKg, rearKg } = longitudinal;
  const outOfAxles = frontPct < 0 || frontPct > 100;

  return (
    <TelemetrySection
      title="Balance longitudinal"
      icon={ArrowUpDown}
      iconTooltip="Reparto de peso entre eje delantero y trasero"
    >
      <MetricBar valuePct={frontPct} tone={outOfAxles ? 'warning' : 'info'} trackClassName="bg-slate-700" />

      <div className="flex items-start justify-between font-mono text-xs">
        <div className="flex flex-col" title="Eje delantero">
          <span className="text-sky-400">Del. {formatPercent(frontPct)}</span>
          <span className="text-cad-faint">{formatNumber(frontKg)} kg</span>
        </div>
        <div className="flex flex-col items-end" title="Eje trasero">
          <span className="text-cad-muted">Tras. {formatPercent(rearPct)}</span>
          <span className="text-cad-faint">{formatNumber(rearKg)} kg</span>
        </div>
      </div>

      {outOfAxles && <p className="font-mono text-[11px] text-amber-400">CoG fuera de los ejes</p>}
    </TelemetrySection>
  );
}
