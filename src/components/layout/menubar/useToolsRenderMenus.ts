import { Droplets, Footprints, Lightbulb, Moon, PaintRoller, ScanEye, Tent, Truck, Zap } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { VANS_CATALOG } from '../../../data/vansCatalog';
import { CEILING_FINISHES, FLOOR_FINISHES, WALL_FINISHES } from '../../../data/interiorFinish';
import type { VanInteriorFinish } from '../../../types/camper.types';
import { header, separator, type MenuEntry } from '../../ui/menuTypes';
import { VIEW_OPTIONS } from '../viewport/viewOptions';
import { useRenderQualityEntries } from './renderQuality';

type FinishKey = 'ceiling' | 'floor' | 'walls';

const FINISH_GROUPS: readonly { key: FinishKey; title: string; options: readonly { id: string; label: string }[] }[] = [
  { key: 'ceiling', title: 'Techo', options: CEILING_FINISHES },
  { key: 'floor', title: 'Suelo', options: FLOOR_FINISHES },
  { key: 'walls', title: 'Paredes', options: WALL_FINISHES },
];

// «Herramientas»: base vehicle (old Chasis menu), interior lining (old Interior menu), installations
export function useToolsMenu(): MenuEntry[] {
  const van = useProjectStore((state) => state.van);
  const setVan = useProjectStore((state) => state.setVan);
  const finish = useProjectStore((state) => state.interiorFinish);
  const setInteriorFinish = useProjectStore((state) => state.setInteriorFinish);
  const showWater = useViewStore((state) => state.showWater);
  const showElectrical = useViewStore((state) => state.showElectrical);
  const toggleWater = useViewStore((state) => state.toggleWater);
  const toggleElectrical = useViewStore((state) => state.toggleElectrical);
  const setNewProjectOpen = useViewStore((state) => state.setNewProjectOpen);
  const awningAvailable = van.bodyStyle === 'camperPro';

  const chassis: MenuEntry[] = [
    ...VANS_CATALOG.map<MenuEntry>((variant) => ({
      kind: 'action',
      id: `van:${variant.id}`,
      label: variant.name,
      role: 'radio',
      checked: variant.id === van.id,
      // Re-selecting the active variant is a no-op (setVan ignores identical vans)
      onSelect: () => setVan(variant.id === van.id ? van : { ...variant }),
    })),
    separator,
    {
      kind: 'action',
      id: 'awning',
      label: 'Toldo lateral',
      icon: Tent,
      role: 'checkbox',
      checked: awningAvailable && van.awning,
      disabled: !awningAvailable,
      hint: awningAvailable ? undefined : 'Solo disponible en la Camper Pro',
      onSelect: () => setVan({ ...van, awning: !van.awning }),
    },
    separator,
    { kind: 'action', id: 'open-new-project', label: 'Selector de vehículo…', icon: Truck, onSelect: () => setNewProjectOpen(true) },
  ];

  const lining: MenuEntry[] = FINISH_GROUPS.flatMap(({ key, title, options }) => [
    header(title),
    ...options.map<MenuEntry>((option) => ({
      kind: 'action',
      id: `finish:${key}:${option.id}`,
      label: option.label,
      role: 'radio',
      checked: finish[key] === option.id,
      onSelect: () => setInteriorFinish({ [key]: option.id } as Partial<VanInteriorFinish>),
    })),
  ]);

  return [
    { kind: 'submenu', label: 'Vehículo base', icon: Truck, entries: chassis },
    { kind: 'submenu', label: 'Revestimiento interior', icon: PaintRoller, entries: lining },
    {
      kind: 'action',
      id: 'finish:ledStrips',
      label: 'Iluminación LED cálida 3000 K',
      icon: Lightbulb,
      role: 'checkbox',
      checked: finish.ledStrips,
      onSelect: () => setInteriorFinish({ ledStrips: !finish.ledStrips }),
    },
    separator,
    header('Instalaciones'),
    { kind: 'action', id: 'toggle-water', label: 'Tuberías de agua', icon: Droplets, role: 'checkbox', checked: showWater, onSelect: toggleWater },
    { kind: 'action', id: 'toggle-electrical', label: 'Cableado eléctrico', icon: Zap, role: 'checkbox', checked: showElectrical, onSelect: toggleElectrical },
  ];
}

// «Render»: camera presets, X-ray, lighting mood, walkthrough and (when available) render quality
export function useRenderMenu(): MenuEntry[] {
  const view = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);
  const isVanTransparent = useViewStore((state) => state.isVanTransparent);
  const toggleVanTransparent = useViewStore((state) => state.toggleVanTransparent);
  const isNight = useViewStore((state) => state.isNight);
  const setNight = useViewStore((state) => state.setNight);
  const setWalkthrough = useViewStore((state) => state.setWalkthrough);
  const quality = useRenderQualityEntries();

  return [
    header('Vistas'),
    ...VIEW_OPTIONS.map<MenuEntry>((option) => ({
      kind: 'action',
      id: `view:${option.id}`,
      label: option.label,
      icon: option.icon,
      role: 'radio',
      checked: view === option.id,
      hint: option.hint,
      onSelect: () => setView(option.id),
    })),
    separator,
    { kind: 'action', id: 'xray', label: 'Chasis transparente (rayos X)', icon: ScanEye, role: 'checkbox', checked: isVanTransparent, onSelect: toggleVanTransparent },
    { kind: 'action', id: 'night', label: 'Iluminación nocturna', icon: Moon, role: 'checkbox', checked: isNight, onSelect: () => setNight(!isNight) },
    { kind: 'action', id: 'walkthrough', label: 'Recorrido en primera persona', icon: Footprints, onSelect: () => setWalkthrough(true) },
    ...(quality.length > 0 ? [separator, header('Calidad de render'), ...quality] : []),
  ];
}
