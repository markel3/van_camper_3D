import { useMemo, useRef, type RefObject } from 'react';
import type { Group, Object3D } from 'three';
import type { VanLayout } from '../../../../utils/vanLayout';
import { cargoCentre, cargoPanelRules, type CargoPanelId } from '../van/cargoPanels';
import { useAutoHidePanels, type AutoHidePanel } from '../van/useAutoHidePanels';

export interface PanelGroups {
  root: RefObject<Group | null>;
  refs: Record<CargoPanelId, RefObject<Object3D | null>>;
}

// One group per cargo panel (walls, roof, rear doors, bulkhead) that opens with the body, so every
// interior layer (shell, insulation, lining) disappears together with the panel it is fixed to.
export function usePanelGroups(layout: VanLayout): PanelGroups {
  const root = useRef<Group | null>(null);
  const left = useRef<Object3D | null>(null);
  const right = useRef<Object3D | null>(null);
  const roof = useRef<Object3D | null>(null);
  const rear = useRef<Object3D | null>(null);
  const cab = useRef<Object3D | null>(null);
  const refs = useMemo(() => ({ left, right, roof, rear, cab }), []);
  const centre = useMemo(() => cargoCentre(layout), [layout]);
  const panels = useMemo<AutoHidePanel[]>(
    () => cargoPanelRules(layout).map((rule) => ({ ref: refs[rule.id], rule })),
    [layout, refs],
  );
  useAutoHidePanels(root, centre, panels);
  return { root, refs };
}
