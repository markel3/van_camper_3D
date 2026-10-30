import { useEffect, useState } from 'react';
import { Footprints, Maximize, MousePointer2, Move, Ruler, Scaling, ScanEye, Settings, View } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { IconButton } from '../../ui/IconButton';
import { MenuList } from '../../ui/MenuList';
import { Popover } from '../../ui/Popover';
import { header, type MenuEntry } from '../../ui/menuTypes';
import { useUiStatus } from '../menubar/projectActions';
import { VanDoorButtons } from './VanDoorButtons';
import { VIEW_OPTIONS } from './viewOptions';

type Tool = 'select' | 'move' | 'resize' | 'measure';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const Divider = () => <div className="mx-1.5 my-1 h-px bg-cad-border" />;

// Vertical tool rail docked over the left edge of the viewport
export function ViewportToolRail() {
  const [measuring, setMeasuring] = useState(false);
  const activeTool = useViewStore((state) => state.activeTool);
  const setActiveTool = useViewStore((state) => state.setActiveTool);
  const tool: Tool = measuring ? 'measure' : activeTool;
  const setTool = (next: 'select' | 'move' | 'resize') => {
    setMeasuring(false);
    setActiveTool(next);
  };

  // V = select, G / M = move, R = resize; R again leaves resize for move (ignored while typing, with
  // modifiers or in the walkthrough)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target) || useViewStore.getState().isWalkthrough) return;
      const key = event.key.toLowerCase();
      if (key === 'v') setTool('select');
      else if (key === 'g' || key === 'm') setTool('move');
      else if (key === 'r') setTool(useViewStore.getState().activeTool === 'resize' ? 'move' : 'resize');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const view = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);
  const isVanTransparent = useViewStore((state) => state.isVanTransparent);
  const toggleVanTransparent = useViewStore((state) => state.toggleVanTransparent);
  const setWalkthrough = useViewStore((state) => state.setWalkthrough);
  const isNight = useViewStore((state) => state.isNight);
  const setNight = useViewStore((state) => state.setNight);
  const snapStepMM = useProjectStore((state) => state.snapStepMM);
  const setSnapStep = useProjectStore((state) => state.setSnapStep);

  const chooseMove = () => {
    setTool('move');
    if (!useProjectStore.getState().selectedId) useUiStatus.getState().post('ok', 'Selecciona un módulo y arrástralo con el gizmo (X/Z)');
  };
  // Measuring = the dimensioned plan: aisle widths are drawn on the top orthographic view
  const chooseMeasure = () => {
    setMeasuring(true);
    setView('top');
  };

  const viewEntries: MenuEntry[] = [
    header('Vistas de cámara'),
    ...VIEW_OPTIONS.map<MenuEntry>((option) => ({
      kind: 'action',
      id: `view:${option.id}`,
      label: option.label,
      icon: option.icon,
      hint: option.hint,
      role: 'radio',
      checked: option.id === view,
      onSelect: () => setView(option.id),
    })),
  ];
  const settingsEntries: MenuEntry[] = [
    header('Snap a rejilla'),
    { kind: 'action', id: 'snap-10', label: 'Rejilla de 10 mm', role: 'radio', checked: snapStepMM === 10, onSelect: () => setSnapStep(10) },
    { kind: 'action', id: 'snap-50', label: 'Rejilla de 50 mm', role: 'radio', checked: snapStepMM === 50, onSelect: () => setSnapStep(50) },
    header('Iluminación'),
    { kind: 'action', id: 'night', label: 'Modo nocturno', role: 'checkbox', checked: isNight, onSelect: () => setNight(!isNight) },
  ];

  return (
    <div
      className="absolute left-2 top-2 z-10 flex w-11 flex-col items-center gap-0.5 rounded-md border border-cad-border bg-cad-panel/95 py-1 shadow-lg shadow-black/40 backdrop-blur"
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Herramientas del visor"
    >
      <IconButton icon={MousePointer2} label="Seleccionar" dataId="select" active={tool === 'select'} onClick={() => setTool('select')} />
      <IconButton icon={Move} label="Mover (gizmo X/Z)" dataId="move" active={tool === 'move'} onClick={chooseMove} />
      <IconButton
        icon={Scaling}
        label="Redimensionar (R): estira los cantos de tableros y listones"
        dataId="resize"
        active={tool === 'resize'}
        onClick={() => setTool(activeTool === 'resize' && !measuring ? 'move' : 'resize')}
      />
      <IconButton icon={Ruler} label="Medir: planta con cotas de pasillo" dataId="measure" active={tool === 'measure'} onClick={chooseMeasure} />
      <Divider />
      <Popover
        trigger={(open, toggle) => <IconButton icon={View} label="Vistas" dataId="views" expanded={open} onClick={toggle} />}
      >
        {(close) => <MenuList entries={viewEntries} onClose={close} label="Vistas" />}
      </Popover>
      <IconButton
        icon={ScanEye}
        label={isVanTransparent ? 'Rayos X: activado' : 'Chasis transparente (rayos X)'}
        dataId="xray"
        active={isVanTransparent}
        onClick={toggleVanTransparent}
      />
      {/* Re-requesting the active view re-frames the camera (viewRequestId bump) */}
      <IconButton icon={Maximize} label="Encuadrar todo" dataId="zoom-fit" onClick={() => setView(view)} />
      <Divider />
      <VanDoorButtons />
      <Divider />
      <IconButton icon={Footprints} label="Recorrido en primera persona" dataId="walkthrough" onClick={() => setWalkthrough(true)} />
      <Popover
        trigger={(open, toggle) => <IconButton icon={Settings} label="Ajustes del visor" dataId="settings" expanded={open} onClick={toggle} />}
      >
        {(close) => <MenuList entries={settingsEntries} onClose={close} label="Ajustes" />}
      </Popover>
    </div>
  );
}
