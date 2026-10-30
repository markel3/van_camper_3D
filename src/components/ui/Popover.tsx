import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useMenuDismiss } from '../../hooks/useMenuDismiss';

interface PopoverProps {
  // Renders the trigger; receives the open state and a toggle
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  // Where the panel opens relative to the trigger
  placement?: 'right' | 'bottom' | 'bottom-end';
  className?: string;
}

const PLACEMENT = {
  right: 'left-full top-0 ml-2',
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  'bottom-end': 'right-0 top-full mt-1',
} as const;

// Click-to-open floating panel, closed on outside press or Escape
export function Popover({ trigger, children, placement = 'right', className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useMenuDismiss(open, close, rootRef);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {trigger(open, () => setOpen((value) => !value))}
      {open && <div className={`absolute z-40 ${PLACEMENT[placement]}`}>{children(close)}</div>}
    </div>
  );
}
