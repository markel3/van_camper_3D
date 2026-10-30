import { useEngineeringMetrics } from '../../hooks/useEngineeringMetrics';
import { useProjectStore } from '../../store/useProjectStore';
import { BudgetSection } from './telemetry/BudgetSection';
import { EnergySection } from './telemetry/EnergySection';
import { LateralSection } from './telemetry/LateralSection';
import { LongitudinalSection } from './telemetry/LongitudinalSection';
import { MmaSection } from './telemetry/MmaSection';

// Bottom engineering telemetry panel, connected to the metrics derived from the store.
// Fixed height (h-36) so everything fits without scrolling at 1280x720 (AGENTS.md, Agent 3).
export function BottomTelemetry() {
  const metrics = useEngineeringMetrics();
  const mmaKg = useProjectStore((state) => state.van.mmaKg);

  return (
    <footer className="grid h-36 grid-cols-5 gap-px overflow-hidden border-t border-cad-border bg-cad-border">
      <MmaSection
        totalMassKg={metrics.totalMassKg}
        mmaKg={mmaKg}
        mmaPct={metrics.mmaPct}
        mmaStatus={metrics.mmaStatus}
      />
      <LateralSection lateral={metrics.lateral} />
      <LongitudinalSection longitudinal={metrics.longitudinal} />
      <BudgetSection budgetEur={metrics.budgetEur} />
      <EnergySection energy={metrics.energy} />
    </footer>
  );
}
