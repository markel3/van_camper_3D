import type { ReactNode } from 'react';
import { Battery } from 'lucide-react';
import type { EnergyBalance } from '../../../types/camper.types';
import { TelemetrySection } from './TelemetrySection';
import { formatNumber } from './format';

interface EnergySectionProps {
  energy: EnergyBalance;
}

interface ReadoutProps {
  label: string;
  tooltip: string;
  children: ReactNode;
}

function Readout({ label, tooltip, children }: ReadoutProps) {
  return (
    <div className="flex min-w-0 flex-col" title={tooltip}>
      <span className="truncate text-[10px] uppercase tracking-wider text-cad-faint">{label}</span>
      <span className="font-mono text-sm text-slate-100">{children}</span>
    </div>
  );
}

// Battery balance (Ah) and solar generation (W). Autonomy shows "—" when no consumption is declared.
export function EnergySection({ energy }: EnergySectionProps) {
  const { batteryAh, usableAh, solarWatts, autonomyDays } = energy;

  return (
    <TelemetrySection title="Energía" icon={Battery} iconTooltip="Balance energético de baterías y solar">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <Readout label="Ah instal." tooltip="Capacidad de batería instalada">
          {formatNumber(batteryAh)} Ah
        </Readout>
        <Readout label="Ah útiles" tooltip="Capacidad útil de batería">
          {formatNumber(usableAh)} Ah
        </Readout>
        <Readout label="Solar" tooltip="Potencia solar instalada">
          {formatNumber(solarWatts)} W
        </Readout>
        <Readout label="Autonomía" tooltip="Días de autonomía con el consumo declarado">
          {autonomyDays === null ? '—' : `${formatNumber(autonomyDays, 1)} d`}
        </Readout>
      </div>
    </TelemetrySection>
  );
}
