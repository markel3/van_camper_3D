import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { MenuEntry } from './menuTypes';

interface MenuListProps {
  entries: readonly MenuEntry[];
  onClose: () => void;
  label?: string;
  className?: string;
}

const ROW =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40';

// Dark dropdown panel. Submenus fly out to the right on hover (desktop CAD style).
export function MenuList({ entries, onClose, label, className = '' }: MenuListProps) {
  const [openSub, setOpenSub] = useState<number | null>(null);

  return (
    <div
      role="menu"
      aria-label={label}
      className={`min-w-56 rounded-md border border-cad-border bg-cad-panel p-1 shadow-2xl shadow-black/50 ${className}`}
    >
      {entries.map((entry, index) => {
        if (entry.kind === 'separator') return <div key={index} className="my-1 h-px bg-cad-border" />;
        if (entry.kind === 'header') {
          return (
            <p key={index} className="px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-cad-faint">
              {entry.label}
            </p>
          );
        }
        if (entry.kind === 'submenu') {
          const Icon = entry.icon;
          const open = openSub === index;
          return (
            <div key={index} className="relative" onMouseEnter={() => setOpenSub(index)} onMouseLeave={() => setOpenSub(null)}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpenSub(open ? null : index)}
                className={`${ROW} ${open ? 'bg-cad-hover text-white' : 'text-cad-text hover:bg-cad-hover'}`}
              >
                <span className="flex w-4 shrink-0 justify-center">{Icon && <Icon size={14} />}</span>
                <span className="flex-1">{entry.label}</span>
                <ChevronRight size={14} className="text-cad-muted" />
              </button>
              {open && (
                <div className="absolute left-full top-0 z-10 pl-1">
                  <MenuList entries={entry.entries} onClose={onClose} label={entry.label} />
                </div>
              )}
            </div>
          );
        }
        const Icon = entry.icon;
        const toggled = entry.role !== undefined;
        return (
          <button
            key={index}
            type="button"
            role={entry.role === 'radio' ? 'menuitemradio' : entry.role === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={toggled ? Boolean(entry.checked) : undefined}
            data-menu-id={entry.id}
            disabled={entry.disabled}
            title={entry.hint}
            onMouseEnter={() => setOpenSub(null)}
            onClick={() => {
              entry.onSelect();
              onClose();
            }}
            className={`${ROW} ${entry.checked ? 'text-cad-accent-hi' : 'text-cad-text'} hover:bg-cad-hover disabled:hover:bg-transparent`}
          >
            <span className="flex w-4 shrink-0 justify-center">
              {entry.checked ? <Check size={14} /> : Icon ? <Icon size={14} className="text-cad-muted" /> : null}
            </span>
            <span className="flex-1 whitespace-nowrap">{entry.label}</span>
            {entry.shortcut && <span className="pl-4 font-mono text-[11px] text-cad-faint">{entry.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
