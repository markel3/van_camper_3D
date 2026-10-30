import { Weight } from 'lucide-react';
import type { MmaStatus } from '../../../types/camper.types';
import { MetricBar, type MetricTone } from './MetricBar';
import { TelemetrySection } from './TelemetrySection';
import { formatNumber, formatPercent } from './format';

interface MmaSectionProps {
  totalMassKg: number;
  mmaKg: number;
  mmaPct: number;
  mmaStatus: MmaStatus;
}

const STATUS_TONE: Record<MmaStatus, MetricTone> = {
  ok: 'ok',
  warning: 'warning',
  critical: 'critical',
};

const STATUS_TEXT: Record<MmaStatus, string> = {
  ok: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
};

const STATUS_LABEL: Record<MmaStatus, string> = {
  ok: 'Dentro de MMA',
  warning: 'Próximo al límite',
  critical: 'Supera la MMA',
};

// Total weight versus the chassis maximum authorised mass (MMA).
export function MmaSection({ totalMassKg, mmaKg, mmaPct, mmaStatus }: MmaSectionProps) {
  return (
    <TelemetrySection title="Peso / MMA" icon={Weight} iconTooltip="Masa total frente a MMA del chasis">
      <p className="font-mono text-lg leading-none text-slate-100">
        {formatNumber(totalMassKg)} kg
        <span className="ml-1 text-xs text-cad-faint">/ {formatNumber(mmaKg)} kg</span>
      </p>

      <MetricBar valuePct={mmaPct} tone={STATUS_TONE[mmaStatus]} />

      <div className="flex items-center justify-between font-mono text-xs">
        <span className={STATUS_TEXT[mmaStatus]} title={STATUS_LABEL[mmaStatus]}>
          {formatPercent(mmaPct)}
        </span>
        <span className="text-cad-faint">{STATUS_LABEL[mmaStatus]}</span>
      </div>
    </TelemetrySection>
  );
}
