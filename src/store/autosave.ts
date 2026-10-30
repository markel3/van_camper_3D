import { parseProject, serializeProject } from '../utils/projectFile';
import { useProjectStore } from './useProjectStore';

// Passive local autosave of the project (ARCHITECTURE.md §1, local persistence).
// Only the van and the module list are stored; selection, snap step and drag state are ignored.
// Every localStorage access is guarded: blocked or full storage must never break the editor.

export const AUTOSAVE_KEY = 'camperstudio:autosave:v1';
export const AUTOSAVE_DEBOUNCE_MS = 800;

function readAutosave(): string | null {
  try {
    return localStorage.getItem(AUTOSAVE_KEY);
  } catch {
    return null;
  }
}

function writeAutosave(text: string): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, text);
  } catch {
    // Quota exceeded or storage blocked: the project keeps working in memory
  }
}

function removeAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Storage blocked: nothing else to do
  }
}

// Restores the stored project on startup. Returns true when a valid project was loaded.
// Invalid data is discarded so it cannot fail again on the next start.
export function restoreAutosave(): boolean {
  const text = readAutosave();
  if (text === null) return false;
  try {
    useProjectStore.getState().loadProject(parseProject(text));
    // The restored state is the baseline: Ctrl+Z must not walk back into the previous session
    useProjectStore.temporal.getState().clear();
    return true;
  } catch {
    removeAutosave();
    return false;
  }
}

// Subscribes to the store and writes the project after a quiet period. Returns the cleanup function.
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending = false;

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    pending = false;
    try {
      const { van, items, interiorFinish } = useProjectStore.getState();
      writeAutosave(serializeProject({ van, items, interiorFinish }));
    } catch {
      // Serialization must never escape into the app
    }
  };

  const unsubscribe = useProjectStore.subscribe((state, prev) => {
    if (state.van === prev.van && state.items === prev.items && state.interiorFinish === prev.interiorFinish) return;
    pending = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
  });

  // Pending writes are saved synchronously when the page is being closed or hidden
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  return () => {
    flush();
    unsubscribe();
    window.removeEventListener('pagehide', flush);
    window.removeEventListener('beforeunload', flush);
  };
}
