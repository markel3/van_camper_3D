import { useSystemRoutes } from '../../../hooks/useSystemRoutes';
import { useViewStore } from '../../../store/useViewStore';
import type { SystemKind, SystemNetworkSummary } from '../../../types/camper.types';

const formatMeters = (m: number) => `${m.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m`;

const GROUPS: { kind: SystemKind; title: string; toggleName: string }[] = [
  { kind: 'water', title: 'Agua', toggleName: 'Agua' },
  { kind: 'electrical', title: 'Electricidad', toggleName: 'Electricidad' },
];

function NetworkRow({ network }: { network: SystemNetworkSummary }) {
  const empty = network.totalLengthM <= 0;
  return (
    <li className={`flex items-center gap-2 text-xs ${empty ? 'opacity-40' : ''}`}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: network.color }} />
      <span className="min-w-0 flex-1 truncate text-slate-300">{network.label}</span>
      <span className="font-mono text-[11px] text-cad-faint">{network.sizeLabel}</span>
      <span className="w-14 text-right font-mono text-slate-100">
        {empty ? '—' : formatMeters(network.totalLengthM)}
      </span>
    </li>
  );
}

// "Instalaciones" breakdown: metres of pipe and cable per network (shown with no selection).
export function SystemsBreakdown() {
  const { networks, waterTotalM, electricalTotalM } = useSystemRoutes();
  const showWater = useViewStore((state) => state.showWater);
  const showElectrical = useViewStore((state) => state.showElectrical);
  const visible = { water: showWater, electrical: showElectrical };
  const totals = { water: waterTotalM, electrical: electricalTotalM };

  return (
    <div data-systems-breakdown className="space-y-4 border-t border-cad-border pt-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-cad-muted">Instalaciones</h3>
      {GROUPS.map(({ kind, title, toggleName }) => (
        <section key={kind} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-200">{title}</span>
            <span className="font-mono text-slate-100">{formatMeters(totals[kind])}</span>
          </div>
          <ul className="space-y-1">
            {networks
              .filter((n) => n.kind === kind)
              .map((n) => (
                <NetworkRow key={n.network} network={n} />
              ))}
          </ul>
          {!visible[kind] && (
            <p className="text-[11px] text-cad-faint">Activa «{toggleName}» en la barra para verlo en 3D</p>
          )}
        </section>
      ))}
    </div>
  );
}
