import { Banknote } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';
import { PanelTab } from '../../ui/Panel';
import { WalkthroughPanel } from '../walkthrough/WalkthroughPanel';
import { formatNumber } from '../telemetry/format';
import { ItemInspector } from './ItemInspector';
import { PhaseProperties } from './PhaseProperties';
import { LayersPanel } from './LayersPanel';

function BudgetCard() {
  const budgetEur = useEngineeringMetrics().budgetEur;
  return (
    <div
      className="mx-2 mb-2 flex items-center gap-3 rounded-md border border-cad-line bg-cad-raised/70 px-3 py-2.5 [@media(max-height:820px)]:py-1.5"
      title="Módulos + aislamiento"
      data-budget-card
    >
      <Banknote size={20} className="text-cad-ok-hi" />
      <span className="text-[14.5px] text-cad-text">
        Presupuesto <span className="font-mono text-cad-ok-hi">({formatNumber(budgetEur, 2)} €)</span>
      </span>
    </div>
  );
}

// Right dock «Propiedades»: contextual by walkthrough / selection / workflow phase,
// then the budget card and the layers panel
export function PropertiesSidebar() {
  const item = useProjectStore((state) => state.items.find((i) => i.id === state.selectedId));
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  const phase = useViewStore((state) => state.workflowPhase);

  return (
    <aside className="flex w-[19rem] shrink-0 flex-col border-l border-cad-border bg-cad-panel max-[1500px]:w-[18rem]">
      <PanelTab>Propiedades</PanelTab>
      <div className="cad-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2" data-properties-phase={isWalkthrough ? 'walkthrough' : phase}>
        {isWalkthrough ? (
          <WalkthroughPanel />
        ) : (
          <>
            {/* Phase panel first (it may act on the selection, e.g. PBR swatches), then the inspector */}
            <PhaseProperties hasSelection={Boolean(item)} />
            {item && <ItemInspector item={item} />}
          </>
        )}
      </div>
      <div className="shrink-0 pt-2">
        <BudgetCard />
        <LayersPanel />
      </div>
    </aside>
  );
}
