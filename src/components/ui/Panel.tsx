import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// Tab-like strip heading a docked panel ("Módulos", "3D Workspace", "Propiedades", "Capas"...)
export function PanelTab({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-end justify-between border-b border-cad-border bg-cad-chrome pr-2">
      <span className="relative flex h-full items-center border-x border-t border-cad-border bg-cad-panel px-3 text-[13px] text-cad-text before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:bg-cad-accent">
        {children}
      </span>
      {right && <div className="flex h-full items-center gap-1">{right}</div>}
    </div>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
  // Collapsible sections show a chevron (systems phase cards)
  collapsible?: boolean;
  defaultOpen?: boolean;
  right?: ReactNode;
  className?: string;
}

// Raised card inside the right sidebar
export function Section({ title, children, collapsible = false, defaultOpen = true, right, className = '' }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;
  return (
    <section className={`rounded-md border border-cad-line bg-cad-raised/70 ${className}`}>
      <header className="flex items-center gap-1.5 px-3 py-2">
        {collapsible && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Contraer ${title}` : `Expandir ${title}`}
            onClick={() => setOpen((value) => !value)}
            className="text-cad-muted hover:text-white"
          >
            <ChevronDown size={15} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
          </button>
        )}
        <h3 className="flex-1 truncate text-[15px] text-white">{title}</h3>
        {right}
      </header>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

// Label / value row with a monospaced value (no jitter while numbers change)
export function StatRow({ label, value, tone, title }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'accent'; title?: string }) {
  const toneClass =
    tone === 'ok' ? 'text-cad-ok-hi' : tone === 'warn' ? 'text-amber-300' : tone === 'bad' ? 'text-red-400' : tone === 'accent' ? 'text-cad-accent-hi' : 'text-cad-text';
  return (
    <p className="flex items-baseline justify-between gap-3 py-0.5 text-[13px]" title={title}>
      <span className="truncate text-cad-muted">{label}</span>
      <span className={`shrink-0 font-mono text-[12.5px] ${toneClass}`}>{value}</span>
    </p>
  );
}

// On/off switch (Día/Noche style)
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1 text-[13px] text-cad-text">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-cad-accent' : 'bg-cad-border'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
