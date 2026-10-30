import { DoorClosed, DoorOpen } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CamperItem } from '../../../types/camper.types';
import { isArticulated } from '../../../utils/catalogLookup';

interface OpenCloseButtonProps {
  item: CamperItem;
  className: string;
}

// Opens or closes the doors, lid or drawers of an articulated module, to check the aisle.
// Visual only: collisions and clearances keep using the closed shape.
export function OpenCloseButton({ item, className }: OpenCloseButtonProps) {
  const setItemOpen = useProjectStore((state) => state.setItemOpen);
  if (!isArticulated(item.catalogId)) return null;
  const open = item.isOpen === true;
  return (
    <button
      type="button"
      title={open ? 'Cerrar puertas, tapa o cajones' : 'Abrir puertas, tapa o cajones para comprobar el paso libre'}
      aria-pressed={open}
      data-open-toggle
      onClick={() => setItemOpen(item.id, !open)}
      className={`${className} ${open ? 'border-amber-500/60 bg-amber-500/10 text-amber-200' : ''}`}
    >
      {open ? <DoorOpen size={13} /> : <DoorClosed size={13} />}
      {open ? 'Cerrar' : 'Abrir'}
    </button>
  );
}
