import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { VanSpec } from '../../../../types/camper.types';
import type { VanLayout } from '../../../../utils/vanLayout';
import { CargoBody } from './CargoBody';
import { VanCab } from './VanCab';
import { VanWheels } from './VanWheels';
import { usePaintMaterial } from './vanMaterials';
import { useAutoHidePanels, type AutoHidePanel } from './useAutoHidePanels';
import { cargoCentre, cargoPanelRules, type CargoPanelId } from './cargoPanels';

interface ProceduralVanBodyProps {
  van: VanSpec;
  layout: VanLayout;
}

// Procedural panel-van body around the cargo box, with camera-driven panel hiding.
export function ProceduralVanBody({ van, layout }: ProceduralVanBodyProps) {
  const paint = usePaintMaterial(van.paintColor);
  const root = useRef<Group | null>(null);
  const left = useRef<Group | null>(null);
  const right = useRef<Group | null>(null);
  const roof = useRef<Group | null>(null);
  const rear = useRef<Group | null>(null);
  const cab = useRef<Group | null>(null);

  const centre = useMemo(() => cargoCentre(layout), [layout]);
  const panels = useMemo<AutoHidePanel[]>(() => {
    const refs: Record<CargoPanelId, AutoHidePanel['ref']> = { left, right, roof, rear, cab };
    return cargoPanelRules(layout).map((rule) => ({ ref: refs[rule.id], rule }));
  }, [layout]);
  useAutoHidePanels(root, centre, panels);

  const camperPro = van.bodyStyle === 'camperPro';
  return (
    <group ref={root}>
      <VanCab layout={layout} paint={paint} camperPro={camperPro} groupRef={cab} />
      <CargoBody layout={layout} paint={paint} camperPro={camperPro} awning={van.awning} refs={{ left, right, roof, rear }} />
      <VanWheels layout={layout} />
    </group>
  );
}
