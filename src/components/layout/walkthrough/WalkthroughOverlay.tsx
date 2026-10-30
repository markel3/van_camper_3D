import type { JSX } from 'react';
import { X } from 'lucide-react';
import { useViewStore } from '../../../store/useViewStore';
import { EYE_HEIGHT_M } from '../../canvas/walkthrough/walkConstants';
import { aimHint, pointerLocked, useWalkSignal } from '../../canvas/walkthrough/walkStore';
import { WalkthroughMinimap } from './WalkthroughMinimap';

const GLASS = 'rounded-lg border border-slate-700/70 bg-slate-900/80 shadow-lg shadow-black/40 backdrop-blur-md';
const EYE_LABEL = EYE_HEIGHT_M.toLocaleString('es-ES', { minimumFractionDigits: 2 });

function Crosshair({ hint }: { hint: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <div className="relative h-5 w-5">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80 shadow" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80 shadow" />
      </div>
      {hint && (
        <span data-walk-hint="" className={`${GLASS} absolute top-8 whitespace-nowrap px-2.5 py-1 text-xs font-medium text-slate-100`}>
          <kbd className="mr-1 rounded bg-blue-500 px-1.5 py-0.5 font-mono text-[11px] text-white">E</kbd>
          {hint.replace(/^E · /, '')}
        </span>
      )}
    </div>
  );
}

// Immersive first-person HUD drawn over the 3D viewport (renders nothing outside the walkthrough).
// Mount it inside the viewport's relatively positioned container; it lets the mouse through to the
// canvas except on its own buttons.
export function WalkthroughOverlay(): JSX.Element | null {
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  const setWalkthrough = useViewStore((state) => state.setWalkthrough);
  const hint = useWalkSignal(aimHint);
  const locked = useWalkSignal(pointerLocked);
  if (!isWalkthrough) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none text-slate-100" data-walk-overlay="">
      <div className={`${GLASS} absolute left-3 top-3 w-40 p-2 lg:w-56`}>
        <div className="mb-1 flex items-center justify-between px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <span>Minimapa</span>
          <span className="text-blue-400">Planta</span>
        </div>
        <WalkthroughMinimap />
      </div>

      <button
        type="button"
        onClick={() => setWalkthrough(false)}
        className={`${GLASS} pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 px-4 py-2 text-sm font-medium hover:border-blue-500 hover:bg-slate-800/90`}
      >
        <X size={15} className="text-blue-400" />
        Cerrar Recorrido
      </button>

      <Crosshair hint={hint} />

      {!locked && (
        <div className={`${GLASS} absolute left-1/2 top-[62%] -translate-x-1/2 px-3 py-1.5 text-xs text-slate-300`}>
          Haz clic en la vista para mirar con el ratón (o arrastra) · [Esc] para salir
        </div>
      )}

      <div className={`${GLASS} absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] px-3 py-1.5 text-xs text-slate-200 sm:text-sm`}>
        [WASD] Moverse | [Mayús] Correr | [Ratón] Mirar | [E] Interactuar (Puertas/Cajones/Grifos/Luces) | Altura de ojos: {EYE_LABEL}m
      </div>
    </div>
  );
}
