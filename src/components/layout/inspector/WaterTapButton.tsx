import { Droplets } from 'lucide-react';
import { useInteractionStore } from '../../../store/useInteractionStore';
import type { CamperItem } from '../../../types/camper.types';
import { WATER_FIXTURE_LABEL, waterFixtureOf } from '../../../utils/waterFixtures';

interface WaterTapButtonProps {
  item: CamperItem;
  className: string;
}

// Turns the running water of a tap / shower module on or off (visual only)
export function WaterTapButton({ item, className }: WaterTapButtonProps) {
  const running = useInteractionStore((state) => state.runningWater[item.id] === true);
  const toggleRunningWater = useInteractionStore((state) => state.toggleRunningWater);
  const kind = waterFixtureOf(item.catalogId);
  if (!kind) return null;
  const label = WATER_FIXTURE_LABEL[kind];
  return (
    <button
      type="button"
      title={running ? label.off : label.on}
      aria-pressed={running}
      data-water-toggle
      onClick={() => toggleRunningWater(item.id)}
      className={`${className} ${running ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : ''}`}
    >
      <Droplets size={13} />
      {running ? label.off : label.on}
    </button>
  );
}
