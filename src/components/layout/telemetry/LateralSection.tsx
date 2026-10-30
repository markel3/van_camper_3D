import { ArrowLeftRight } from 'lucide-react';
import type { LateralBalance } from '../../../types/camper.types';
import { MetricBar } from './MetricBar';
import { TelemetrySection } from './TelemetrySection';
import { formatPercent } from './format';

interface LateralSectionProps {
  lateral: LateralBalance;
}

const BAND_MIN_PCT = 45;
const BAND_MAX_PCT = 55;

// Left (driver) / right (passenger) split with the acceptable 45-55 % band.
export function LateralSection({ lateral }: LateralSectionProps) {
  const { leftPct, rightPct, isBalanced } = lateral;
  const stateClass = isBalanced ? 'text-cad-muted' : 'text-amber-400';

  return (
    <TelemetrySection title="Balance lateral" icon={ArrowLeftRight} iconTooltip="Reparto de peso izquierda / derecha">
      <MetricBar
        valuePct={leftPct}
        tone={isBalanced ? 'info' : 'warning'}
        trackClassName="bg-slate-700"
        band={{
          fromPct: BAND_MIN_PCT,
          toPct: BAND_MAX_PCT,
          title: `Rango aceptable ${BAND_MIN_PCT}-${BAND_MAX_PCT} % (lado izquierdo)`,
        }}
      />

      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-sky-400" title="Lado conductor (-X)">
          Cond. {formatPercent(leftPct)}
        </span>
        <span className="text-cad-muted" title="Lado acompañante (+X)">
          Acomp. {formatPercent(rightPct)}
        </span>
      </div>

      <p className={`font-mono text-[11px] ${stateClass}`}>
        {isBalanced ? `En banda ${BAND_MIN_PCT}-${BAND_MAX_PCT} %` : `Fuera de banda ${BAND_MIN_PCT}-${BAND_MAX_PCT} %`}
      </p>
    </TelemetrySection>
  );
}
