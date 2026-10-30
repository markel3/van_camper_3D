import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface TelemetrySectionProps {
  title: string;
  icon: LucideIcon;
  iconTooltip: string;
  children: ReactNode;
}

// Common frame for each telemetry cell: icon + heading, then the content.
export function TelemetrySection({ title, icon: Icon, iconTooltip, children }: TelemetrySectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2 overflow-hidden bg-cad-panel p-3">
      <header className="flex items-center gap-2">
        <span title={iconTooltip} className="shrink-0 text-cad-muted">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-cad-muted">{title}</h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">{children}</div>
    </section>
  );
}
