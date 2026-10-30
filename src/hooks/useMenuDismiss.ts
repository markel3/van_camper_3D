import { useEffect, type RefObject } from 'react';

// Closes a dropdown on an outside pointer press or on Escape, only while it is open
export function useMenuDismiss(open: boolean, close: () => void, rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close, rootRef]);
}
