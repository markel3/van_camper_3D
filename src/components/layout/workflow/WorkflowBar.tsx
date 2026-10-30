import { useState } from 'react';
import { Activity, ChevronUp } from 'lucide-react';
import { useViewStore } from '../../../store/useViewStore';
import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';
import type { WorkflowPhase } from '../../../types/camper.types';
import { BottomTelemetry } from '../BottomTelemetry';
import { formatNumber } from '../telemetry/format';

const STEPS: readonly { id: WorkflowPhase; label: string }[] = [
  { id: 'model', label: 'Escaneado/Modelo' },
  { id: 'insulation', label: 'Aislamiento' },
  { id: 'systems', label: 'Electricidad y Agua' },
  { id: 'furniture', label: 'Mobiliario' },
  { id: 'decor', label: 'Decoración y Acabados' },
];

// Compact always-visible readout of the telemetry; the full panel opens above the stepper
function TelemetrySummary({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { mmaPct, mmaStatus, lateral, energy, totalMassKg } = useEngineeringMetrics();
  const mmaTone = mmaStatus === 'critical' ? 'text-red-400' : mmaStatus === 'warning' ? 'text-amber-300' : 'text-cad-ok-hi';
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      data-telemetry-toggle
      title={open ? 'Ocultar telemetría' : 'Mostrar telemetría completa (MMA, balances, presupuesto, energía)'}
      className="ml-auto flex items-center gap-3 rounded px-2 py-0.5 font-mono text-[11.5px] text-cad-muted hover:bg-cad-hover"
    >
      <Activity size={14} className="text-cad-accent-hi" />
      <span>
        MMA <span className={mmaTone}>{formatNumber(mmaPct, 1)} %</span>
      </span>
      <span className="hidden xl:inline">{formatNumber(totalMassKg)} kg</span>
      <span>
        Lat. <span className={lateral.isBalanced ? 'text-cad-ok-hi' : 'text-amber-300'}>{formatNumber(lateral.leftPct, 0)}/{formatNumber(lateral.rightPct, 0)}</span>
      </span>
      <span className="hidden xl:inline">
        Autonomía {energy.autonomyDays === null ? '—' : `${formatNumber(energy.autonomyDays, 1)} d`}
      </span>
      <ChevronUp size={14} className={`transition-transform ${open ? '' : 'rotate-180'}`} />
    </button>
  );
}

// Bottom «Workflow» chevron stepper bound to useViewStore.workflowPhase, plus the telemetry drawer
export function WorkflowBar() {
  const phase = useViewStore((state) => state.workflowPhase);
  const setWorkflowPhase = useViewStore((state) => state.setWorkflowPhase);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const activeIndex = STEPS.findIndex((step) => step.id === phase);

  return (
    <section className="shrink-0 border-t border-cad-border bg-cad-chrome" aria-label="Workflow">
      {telemetryOpen && (
        <div className="border-b border-cad-border" data-telemetry-panel>
          <BottomTelemetry />
        </div>
      )}
      <div className="flex h-7 items-end border-b border-cad-border pr-2">
        <span className="relative flex h-full items-center border-x border-t border-cad-border bg-cad-panel px-3 text-[13px] text-cad-text before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:bg-cad-accent">
          Workflow
        </span>
        <div className="flex h-full flex-1 items-center">
          <TelemetrySummary open={telemetryOpen} onToggle={() => setTelemetryOpen((value) => !value)} />
        </div>
      </div>
      <ol className="flex gap-0 bg-cad-panel px-3 py-2.5">
        {STEPS.map((step, index) => {
          const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo';
          const color =
            state === 'active'
              ? 'bg-cad-ok text-white'
              : state === 'done'
                ? 'bg-cad-accent text-white hover:bg-cad-accent-hi'
                : 'bg-cad-raised text-cad-muted hover:bg-cad-hover hover:text-cad-text';
          return (
            <li key={step.id} className={`min-w-0 flex-1 ${index > 0 ? '-ml-2' : ''}`}>
              <button
                type="button"
                aria-current={state === 'active' ? 'step' : undefined}
                data-phase={step.id}
                data-phase-state={state}
                onClick={() => setWorkflowPhase(step.id)}
                className={`flex h-11 w-full items-center justify-center px-5 text-center text-[14px] leading-tight transition-colors max-[1500px]:text-[12.5px] ${color} ${
                  index === 0 ? 'cad-chevron-first rounded-l-md' : 'cad-chevron'
                }`}
              >
                <span className="line-clamp-2">
                  {index + 1}. {step.label}
                  {state === 'active' && <span className="whitespace-nowrap max-[1500px]:sr-only"> (Fase actual)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
