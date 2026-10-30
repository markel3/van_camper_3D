import { useEffect } from 'react';
import { redo, undo, useProjectStore } from '../store/useProjectStore';
import { saveCurrentProject } from '../store/projectPersistence';
import { useViewStore } from '../store/useViewStore';

// Text fields keep the browser's native text editing (undo, delete) instead of the project shortcuts
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, Ctrl/Cmd+D duplicate.
function handleModifiedKey(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    undo();
  } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault();
    redo();
  } else if (key === 'd') {
    // Duplicate the selection; preventDefault stops the browser bookmark dialog
    event.preventDefault();
    const { selectedId, items, duplicateItem } = useProjectStore.getState();
    const selected = items.find((item) => item.id === selectedId);
    if (selected && !selected.locked) duplicateItem(selected.id);
  } else if (key === 's') {
    event.preventDefault();
    saveCurrentProject();
  }
}

// Delete / Backspace removes the selected module (unless locked); Escape clears the selection.
function handlePlainKey(event: KeyboardEvent): void {
  const { items, selectedId, removeItem, select } = useProjectStore.getState();
  if (event.key === 'Escape') {
    if (selectedId) select(null);
    return;
  }
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  const selected = items.find((item) => item.id === selectedId);
  if (!selected || selected.locked) return;
  event.preventDefault();
  removeItem(selected.id);
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isEditableTarget(event.target)) return;
      // The first-person walkthrough owns the keyboard (WASD, E, Esc)
      if (useViewStore.getState().isWalkthrough) return;
      if (event.ctrlKey || event.metaKey) handleModifiedKey(event);
      else if (!event.shiftKey) handlePlainKey(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
