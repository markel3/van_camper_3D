import { RENDER_QUALITIES, useRenderQualityStore, type RenderQuality } from '../../canvas/render';
import type { MenuEntry } from '../../ui/menuTypes';

const LABELS: Record<RenderQuality, { label: string; hint: string }> = {
  high: { label: 'Alta', hint: 'Oclusión ambiental, bloom y antialiasing completos' },
  balanced: { label: 'Equilibrada', hint: 'Post-procesado a media resolución' },
  low: { label: 'Rápida', hint: 'Sin post-procesado, para equipos modestos' },
};

// Render quality presets of the «Render» menu (render pipeline store)
export function useRenderQualityEntries(): MenuEntry[] {
  const quality = useRenderQualityStore((state) => state.quality);
  const setQuality = useRenderQualityStore((state) => state.setQuality);
  return RENDER_QUALITIES.map((id) => ({
    kind: 'action',
    id: `quality:${id}`,
    label: LABELS[id].label,
    hint: LABELS[id].hint,
    role: 'radio',
    checked: quality === id,
    onSelect: () => setQuality(id),
  }));
}
