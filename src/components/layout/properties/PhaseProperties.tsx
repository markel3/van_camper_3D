import { Truck } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';
import { Section, StatRow } from '../../ui/Panel';
import { ChassisSpecs } from '../newProject/ChassisSpecs';
import { SystemsBreakdown } from '../inspector/SystemsBreakdown';
import { formatNumber } from '../telemetry/format';
import { InsulationProperties } from './InsulationProperties';
import { SystemsProperties } from './SystemsProperties';
import { DecorProperties } from './DecorProperties';

// Phase 1: the base vehicle
function ModelProperties() {
  const van = useProjectStore((state) => state.van);
  const setNewProjectOpen = useViewStore((state) => state.setNewProjectOpen);
  return (
    <Section title="Especificaciones del chasis">
      <p className="mb-1 text-[13px] font-medium text-white">{van.name}</p>
      <ChassisSpecs van={van} compact />
      <button
        type="button"
        onClick={() => setNewProjectOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-cad-accent px-3 py-1.5 text-[13px] text-white hover:bg-cad-accent-hi"
      >
        <Truck size={15} />
        Cambiar vehículo base
      </button>
    </Section>
  );
}

// Phase 4 without a selection: project summary and the installation lengths (old empty inspector)
function FurnitureSummary() {
  const count = useProjectStore((state) => state.items.length);
  const collisions = useProjectStore((state) => state.items.filter((item) => item.hasCollision).length);
  const { totalMassKg, mmaPct } = useEngineeringMetrics();
  return (
    <Section title="Mobiliario">
      <p className="mb-2 text-xs text-cad-faint">Ningún objeto seleccionado. Haz clic en un módulo para editarlo.</p>
      <StatRow label="Módulos" value={formatNumber(count)} />
      <StatRow label="Colisiones" value={formatNumber(collisions)} tone={collisions > 0 ? 'bad' : 'ok'} />
      <StatRow label="Masa total" value={`${formatNumber(totalMassKg)} kg`} />
      <StatRow label="Uso de MMA" value={`${formatNumber(mmaPct, 1)} %`} tone={mmaPct > 100 ? 'bad' : mmaPct > 90 ? 'warn' : undefined} />
      <SystemsBreakdown />
    </Section>
  );
}

// Phase-specific content of the «Propiedades» sidebar
export function PhaseProperties({ hasSelection }: { hasSelection: boolean }) {
  const phase = useViewStore((state) => state.workflowPhase);
  switch (phase) {
    case 'model':
      return <ModelProperties />;
    case 'insulation':
      return <InsulationProperties />;
    case 'systems':
      return <SystemsProperties />;
    case 'furniture':
      return hasSelection ? null : <FurnitureSummary />;
    case 'decor':
      return <DecorProperties />;
  }
}
