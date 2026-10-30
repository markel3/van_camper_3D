import { Droplets, Footprints } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { useInteractionStore } from '../../../store/useInteractionStore';
import { doorInteraction, useWalkSignal } from '../../canvas/walkthrough/walkStore';

interface SwitchRowProps {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}

function SwitchRow({ label, detail, checked, onChange, id }: SwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm text-slate-200">{label}</span>
        <span className="block text-[11px] text-slate-500">{detail}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        data-walk-switch={id}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-slate-600'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

// Right-panel "Inspección Inmersiva" section: lighting mood, door interaction and LEDs of the walkthrough
export function WalkthroughPanel() {
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  const setWalkthrough = useViewStore((state) => state.setWalkthrough);
  const isNight = useViewStore((state) => state.isNight);
  const setNight = useViewStore((state) => state.setNight);
  const ledOn = useProjectStore((state) => state.interiorFinish.ledStrips);
  const setInteriorFinish = useProjectStore((state) => state.setInteriorFinish);
  const doors = useWalkSignal(doorInteraction);
  const anyWater = useInteractionStore((state) => Object.values(state.runningWater).some(Boolean));
  const stopAllWater = useInteractionStore((state) => state.stopAllWater);

  return (
    <section className="rounded-lg border border-slate-700/70 bg-slate-900/80 p-3" aria-label="Inspección Inmersiva">
      <h3 className="mb-2 text-sm font-semibold text-slate-100">Inspección Inmersiva</h3>
      <SwitchRow
        id="walk-night"
        label="Iluminación Día/Noche"
        detail={isNight ? 'Noche: dominan las luces interiores' : 'Día: luz natural'}
        checked={isNight}
        onChange={setNight}
      />
      <SwitchRow
        id="walk-doors"
        label="Interacción de Puertas"
        detail="[E] abre cajones, puertas y altillos"
        checked={doors}
        onChange={doorInteraction.set}
      />
      <SwitchRow
        id="walk-leds"
        label="Luces LED interiores"
        detail="También con [E] mirando al techo"
        checked={ledOn}
        onChange={(on) => setInteriorFinish({ ledStrips: on })}
      />
      {anyWater && (
        <button
          type="button"
          data-stop-water
          onClick={stopAllWater}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-blue-500/60 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
        >
          <Droplets size={15} />
          Cerrar toda el agua
        </button>
      )}
      <button
        type="button"
        onClick={() => setWalkthrough(!isWalkthrough)}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition-colors ${
          isWalkthrough ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        <Footprints size={15} />
        {isWalkthrough ? 'Modo Recorrido Activo · Salir' : 'Iniciar Recorrido'}
      </button>
    </section>
  );
}
