import { Droplets, Magnet, Moon, Redo2, Sun, Undo2, Zap } from 'lucide-react';
import { useStore } from 'zustand';
import { redo, undo, useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { IconButton } from '../../ui/IconButton';

const Divider = () => <div className="mx-0.5 h-5 w-px bg-cad-border" />;

// Small floating toolbar at the top centre of the viewport: history, snap, networks, day/night
export function FloatingToolbar() {
  const canUndo = useStore(useProjectStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useProjectStore.temporal, (state) => state.futureStates.length > 0);
  const snapStepMM = useProjectStore((state) => state.snapStepMM);
  const setSnapStep = useProjectStore((state) => state.setSnapStep);
  const showWater = useViewStore((state) => state.showWater);
  const showElectrical = useViewStore((state) => state.showElectrical);
  const toggleWater = useViewStore((state) => state.toggleWater);
  const toggleElectrical = useViewStore((state) => state.toggleElectrical);
  const isNight = useViewStore((state) => state.isNight);
  const setNight = useViewStore((state) => state.setNight);
  const nextSnap = snapStepMM === 50 ? 10 : 50;

  return (
    <div
      role="toolbar"
      aria-label="Barra rápida"
      className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-cad-border bg-cad-panel/95 px-1 py-0.5 shadow-lg shadow-black/40 backdrop-blur"
    >
      <IconButton size="sm" icon={Undo2} label="Deshacer (Ctrl+Z)" dataId="undo" disabled={!canUndo} onClick={undo} />
      <IconButton size="sm" icon={Redo2} label="Rehacer (Ctrl+Y / Ctrl+Shift+Z)" dataId="redo" disabled={!canRedo} onClick={redo} />
      <Divider />
      <IconButton
        size="sm"
        icon={Magnet}
        label={`Snap a rejilla: ${snapStepMM} mm (clic para ${nextSnap} mm)`}
        dataId="snap"
        badge={`${snapStepMM}`}
        onClick={() => setSnapStep(nextSnap)}
      />
      <Divider />
      <IconButton
        size="sm"
        icon={Droplets}
        label={showWater ? 'Agua: visible (clic para ocultar)' : 'Agua: mostrar tuberías'}
        dataId="water"
        active={showWater}
        onClick={toggleWater}
      />
      <IconButton
        size="sm"
        icon={Zap}
        label={showElectrical ? 'Electricidad: visible (clic para ocultar)' : 'Electricidad: mostrar cableado'}
        dataId="electrical"
        active={showElectrical}
        onClick={toggleElectrical}
      />
      <Divider />
      <IconButton
        size="sm"
        icon={isNight ? Moon : Sun}
        label={isNight ? 'Iluminación nocturna (clic para día)' : 'Iluminación de día (clic para noche)'}
        dataId="night"
        active={isNight}
        onClick={() => setNight(!isNight)}
      />
    </div>
  );
}
