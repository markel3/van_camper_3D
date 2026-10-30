import type { LucideIcon } from 'lucide-react';

// Declarative entries of a dropdown menu (menu bar, popovers). Built by hooks, rendered by MenuList.
export type MenuEntry =
  | {
      kind: 'action';
      label: string;
      icon?: LucideIcon;
      shortcut?: string;
      hint?: string;
      disabled?: boolean;
      // radio / checkbox items show a check mark while on
      role?: 'radio' | 'checkbox';
      checked?: boolean;
      // Stable hook for automated tests (rendered as data-menu-id)
      id?: string;
      onSelect: () => void;
    }
  | { kind: 'separator' }
  | { kind: 'header'; label: string }
  | { kind: 'submenu'; label: string; icon?: LucideIcon; entries: MenuEntry[] };

export const separator: MenuEntry = { kind: 'separator' };
export const header = (label: string): MenuEntry => ({ kind: 'header', label });
