import { clampPct } from './format';

export type MetricTone = 'neutral' | 'info' | 'ok' | 'warning' | 'critical';

const FILL_CLASS: Record<MetricTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-sky-500',
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

export interface BarBand {
  fromPct: number;
  toPct: number;
  title: string;
}

interface MetricBarProps {
  /** Fill width in percent. Values outside 0-100 are clamped for drawing only. */
  valuePct: number;
  tone?: MetricTone;
  trackClassName?: string;
  /** Optional highlighted range drawn over the track (e.g. acceptable balance band). */
  band?: BarBand;
}

// Reusable horizontal meter. Only the width is inline, since it is dynamic.
export function MetricBar({ valuePct, tone = 'neutral', trackClassName = 'bg-cad-bg', band }: MetricBarProps) {
  const width = clampPct(valuePct);

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className={`relative h-2 w-full overflow-hidden rounded-full ${trackClassName}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${FILL_CLASS[tone]}`}
        style={{ width: `${width}%` }}
      />

      {band && (
        <div
          title={band.title}
          className="absolute inset-y-0 border-x border-amber-300/70 bg-white/15"
          style={{ left: `${clampPct(band.fromPct)}%`, width: `${clampPct(band.toPct) - clampPct(band.fromPct)}%` }}
        />
      )}
    </div>
  );
}
