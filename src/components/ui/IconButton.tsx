import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  // On/off tools (X-ray, water, ...): filled accent while on
  active?: boolean;
  // Opens a popover / menu
  expanded?: boolean;
  badge?: string;
  size?: 'sm' | 'md';
  dataId?: string;
}

// Square tool button with tooltip, used by the viewport rail and the floating toolbar
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, onClick, disabled = false, active = false, expanded, badge, size = 'md', dataId },
  ref,
) {
  const box = size === 'sm' ? 'h-7 min-w-7' : 'h-9 min-w-9';
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-haspopup={expanded === undefined ? undefined : 'menu'}
      aria-expanded={expanded}
      data-tool={dataId}
      onClick={onClick}
      disabled={disabled}
      className={`flex ${box} items-center justify-center gap-1 rounded-md px-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active || expanded ? 'bg-cad-accent text-white shadow-inner shadow-black/20' : 'text-cad-muted hover:bg-cad-hover hover:text-white'
      }`}
    >
      <Icon size={size === 'sm' ? 15 : 17} strokeWidth={1.75} />
      {badge && <span className="font-mono text-[10.5px]">{badge}</span>}
    </button>
  );
});
