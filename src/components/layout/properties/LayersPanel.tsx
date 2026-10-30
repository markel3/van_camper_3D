import { Eye, EyeOff, Layers } from 'lucide-react';
import { useViewStore } from '../../../store/useViewStore';
import type { SceneLayerId } from '../../../types/camper.types';

const LAYERS: readonly { id: SceneLayerId; label: string }[] = [
  { id: 'structure', label: 'Estructura' },
  { id: 'insulation', label: 'Aislamiento' },
  { id: 'systems', label: 'Instalaciones' },
  { id: 'furniture', label: 'Mobiliario' },
  { id: 'decor', label: 'Decoración' },
];

// «Capas»: per-group visibility, independent of the phase preset (useViewStore.layers)
export function LayersPanel() {
  const layers = useViewStore((state) => state.layers);
  const setLayerVisible = useViewStore((state) => state.setLayerVisible);

  return (
    <section className="border-t border-cad-border" data-layers-panel>
      <h3 className="flex items-center gap-2 px-3 py-2 text-[14px] text-white [@media(max-height:820px)]:py-1">
        <Layers size={15} className="text-cad-muted" />
        Capas
      </h3>
      <ul className="px-1.5 pb-2">
        {LAYERS.map(({ id, label }) => {
          const visible = layers[id];
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={visible}
                data-layer={id}
                title={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
                onClick={() => setLayerVisible(id, !visible)}
                className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left [@media(max-height:820px)]:py-0.5 text-[13.5px] transition-colors ${
                  visible ? 'bg-cad-accent-soft text-white hover:bg-cad-accent/30' : 'text-cad-faint hover:bg-cad-hover'
                }`}
              >
                {visible ? <Eye size={15} className="text-cad-accent-hi" /> : <EyeOff size={15} />}
                <Layers size={14} className={visible ? 'text-cad-muted' : 'text-cad-faint'} />
                <span className="flex-1">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
