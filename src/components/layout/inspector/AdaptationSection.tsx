import { useMemo } from 'react';
import { Link2, Scissors } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { fitProfileOf } from '../../../data/fitProfiles';
import { useAdaptations } from '../../../hooks/useAdaptations';
import type { CamperItem } from '../../../types/camper.types';
import { findCollisions } from '../../../utils/collisionMath';

const SUBTITLE = 'mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-cad-faint';
const CHIP =
  'flex w-full items-start gap-1.5 rounded-md border border-sky-900/60 bg-sky-950/30 px-2 py-1 text-left text-[11px] text-sky-200';
const SIDE_LABELS = { left: 'izquierdo', right: 'derecho' } as const;

// Adaptation controls of the selected module: opt-out toggle, what it adapts to, and why not
export function AdaptationSection({ item }: { item: CamperItem }) {
  const items = useProjectStore((state) => state.items);
  const van = useProjectStore((state) => state.van);
  const select = useProjectStore((state) => state.select);
  const setItemAdaptToFit = useProjectStore((state) => state.setItemAdaptToFit);
  const adaptations = useAdaptations().get(item.id);
  const profile = fitProfileOf(item.catalogId);
  const archBlocked = useMemo(
    () => !!profile?.archUsableTopM && !!findCollisions(van, items).get(item.id)?.has('wheelArch'),
    [profile, van, items, item.id],
  );

  if (!profile) return null;

  const on = item.adaptToFit !== false;
  const nameOf = (id: string) => items.find((other) => other.id === id)?.name ?? 'Módulo';
  const link = (id: string, prefix: string) => (
    <button key={id} type="button" onClick={() => select(id)} className={`${CHIP} hover:bg-sky-950/60`}>
      <Link2 size={12} className="mt-0.5 shrink-0" />
      <span>
        {prefix}
        <span className="underline decoration-dotted">{nameOf(id)}</span>
      </span>
    </button>
  );

  return (
    <>
      <h4 className={SUBTITLE}>Adaptación</h4>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-cad-text">
        <input
          type="checkbox"
          checked={on}
          disabled={item.locked}
          onChange={(event) => setItemAdaptToFit(item.id, event.target.checked)}
        />
        Adaptar al entorno
      </label>
      <p className="mt-1 text-[11px] text-cad-faint">
        Recorta el mueble sobre los pasos de rueda y permite alojar equipos en su hueco
      </p>
      {on && adaptations && (
        <div className="mt-2 space-y-1">
          {adaptations.map((adaptation, index) => {
            if (adaptation.kind === 'archNotch') {
              return (
                <p key={`arch-${index}`} className={CHIP}>
                  <Scissors size={12} className="mt-0.5 shrink-0" />
                  Recortado sobre el paso de rueda {SIDE_LABELS[adaptation.side]}
                </p>
              );
            }
            if (adaptation.kind === 'nestedIn') return link(adaptation.hostId, 'Alojado en: ');
            return adaptation.itemIds.map((id) => link(id, 'Aloja: '));
          })}
        </div>
      )}
      {on && archBlocked && (
        <p className="mt-2 text-[11px] text-amber-300/90">
          No se puede recortar: el paso de rueda llega a la superficie útil o ocupa más de la mitad de la base. Eleva el
          mueble o reduce el solape.
        </p>
      )}
    </>
  );
}
