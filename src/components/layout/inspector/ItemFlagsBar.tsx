import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CamperItem } from '../../../types/camper.types';

const TOGGLE =
  'flex h-7 w-7 items-center justify-center rounded-md border text-cad-text transition-colors hover:bg-cad-hover';

// Lock and visibility toggles of the selected module. Both are undoable store actions.
export function ItemFlagsBar({ item }: { item: CamperItem }) {
  const setItemLocked = useProjectStore((state) => state.setItemLocked);
  const setItemVisible = useProjectStore((state) => state.setItemVisible);

  const lockTitle = item.locked ? 'Desbloquear módulo' : 'Bloquear módulo';
  const visibleTitle = item.visible ? 'Ocultar módulo' : 'Mostrar módulo';

  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        title={lockTitle}
        aria-label={lockTitle}
        aria-pressed={item.locked}
        onClick={() => setItemLocked(item.id, !item.locked)}
        className={`${TOGGLE} ${item.locked ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : 'border-cad-border'}`}
      >
        {item.locked ? <Lock size={14} /> : <LockOpen size={14} />}
      </button>
      <button
        type="button"
        title={visibleTitle}
        aria-label={visibleTitle}
        aria-pressed={!item.visible}
        onClick={() => setItemVisible(item.id, !item.visible)}
        className={`${TOGGLE} ${item.visible ? 'border-cad-border' : 'border-sky-500/60 bg-sky-500/10 text-sky-300'}`}
      >
        {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
}
