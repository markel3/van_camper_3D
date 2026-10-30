import { useMemo } from 'react';
import { Scaling } from 'lucide-react';
import { useViewStore } from '../../../store/useViewStore';
import type { CamperItem } from '../../../types/camper.types';
import { isBoardPiece } from '../../../utils/boardPieces';
import { boardBreakdown } from '../../../utils/boardArea';
import { StatRow } from '../../ui/Panel';
import { formatNumber } from '../telemetry/format';

const SUBTITLE = 'mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-cad-faint';

// «Tablero»: board thickness and cut-list area of a parametric module, plus a shortcut to push/pull resize
export function BoardSection({ item }: { item: CamperItem }) {
  const activeTool = useViewStore((state) => state.activeTool);
  const setActiveTool = useViewStore((state) => state.setActiveTool);
  const { catalogId, dimensions, materialId } = item;
  const breakdown = useMemo(() => boardBreakdown({ catalogId, dimensions, materialId }), [catalogId, dimensions, materialId]);

  return (
    <>
      <h4 className={SUBTITLE}>Tablero</h4>
      {breakdown.thicknessMM !== null && <StatRow label="Espesor" value={`${formatNumber(breakdown.thicknessMM)} mm`} />}
      {breakdown.rows.map((row) => (
        <StatRow key={row.family} label={`${row.label} ×${row.count}`} value={`${formatNumber(row.areaM2, 2)} m²`} />
      ))}
      <StatRow label="Total" value={`${formatNumber(breakdown.totalM2, 2)} m²`} tone="ok" />
      {activeTool !== 'resize' && isBoardPiece(item.catalogId) && (
        <button
          type="button"
          title="Redimensionar (R): estira los cantos de tableros y listones"
          disabled={item.locked}
          onClick={() => setActiveTool('resize')}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-cad-border px-2 py-1 text-xs text-cad-text transition-colors hover:bg-cad-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Scaling size={13} />
          Estirar en 3D (R)
        </button>
      )}
    </>
  );
}
