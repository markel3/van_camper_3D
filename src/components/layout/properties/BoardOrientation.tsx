import { useProjectStore } from '../../../store/useProjectStore';
import type { CamperItem } from '../../../types/camper.types';
import { boardOrientationOf, type BoardOrientation } from '../../../utils/boardPieces';

const OPTIONS: readonly { id: BoardOrientation; label: string }[] = [
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical-long', label: 'Vertical longitudinal' },
  { id: 'vertical-trans', label: 'Vertical transversal' },
];

// Segmented quick buttons that lay a board flat or stand it along / across the van
export function BoardOrientationButtons({ item }: { item: CamperItem }) {
  const setBoardOrientation = useProjectStore((state) => state.setBoardOrientation);
  const current = boardOrientationOf(item);
  if (!current) return null;

  return (
    <div role="radiogroup" aria-label="Orientación del tablero" className="mt-2 grid grid-cols-3 overflow-hidden rounded-md border border-cad-border">
      {OPTIONS.map(({ id, label }) => {
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={item.locked}
            onClick={() => !active && setBoardOrientation(item.id, id)}
            className={`border-l border-cad-border px-1 py-1 text-[11px] leading-tight transition-colors first:border-l-0 disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'bg-cad-accent text-white' : 'text-cad-muted hover:bg-cad-hover hover:text-white'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
