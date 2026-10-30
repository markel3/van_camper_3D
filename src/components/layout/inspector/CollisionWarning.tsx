import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CollisionReason } from '../../../types/camper.types';
import { findCollisions } from '../../../utils/collisionMath';
import { fitProfileOf } from '../../../data/fitProfiles';
import { isRoofMounted } from '../../../utils/roofMount';

const REASON_LABELS: Record<CollisionReason, string> = {
  item: 'Se solapa con otro módulo',
  bounds: 'Sobresale de la caja de carga',
  wheelArch: 'Invade un paso de rueda',
};
// Roof modules are bounded by the roof footprint, not the cargo box
const ROOF_BOUNDS_LABEL = 'Sobresale del techo o no apoya sobre él';

// Explains why the selected module is flagged (WORKFLOWS.md, Flow 3).
export function CollisionWarning({ itemId }: { itemId: string }) {
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);
  const reasons = useMemo(() => findCollisions(van, items).get(itemId), [van, items, itemId]);
  const catalogId = items.find((item) => item.id === itemId)?.catalogId ?? '';
  const onRoof = isRoofMounted(catalogId);
  const notchable = !!fitProfileOf(catalogId)?.archUsableTopM;

  if (!reasons) return null;

  return (
    <div role="alert" className="rounded-md border border-red-900/70 bg-red-950/40 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-red-300">
        <TriangleAlert size={13} />
        Colisión detectada
      </p>
      <ul className="mt-1 space-y-0.5 pl-5 text-[11px] text-red-200/80">
        {[...reasons].map((reason) => (
          <li key={reason} className="list-disc">
            {reason === 'bounds' && onRoof
              ? ROOF_BOUNDS_LABEL
              : reason === 'wheelArch' && notchable
                ? 'Invade un paso de rueda y no se puede recortar'
                : REASON_LABELS[reason]}
          </li>
        ))}
      </ul>
    </div>
  );
}
