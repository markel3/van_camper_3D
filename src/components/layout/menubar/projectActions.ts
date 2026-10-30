import { create } from 'zustand';
import { openProjectFile, saveCurrentProject } from '../../../store/projectPersistence';
import { useProjectStore } from '../../../store/useProjectStore';
import { ProjectFileError } from '../../../utils/projectFile';

// UI-only status line of the menu bar (open / save results), replacing blocking dialogs.
interface UiStatus {
  tone: 'ok' | 'error';
  text: string;
  id: number;
}

interface UiStatusStore {
  status: UiStatus | null;
  post: (tone: UiStatus['tone'], text: string) => void;
  clear: (id: number) => void;
}

const STATUS_TIMEOUT_MS = 4000;

export const useUiStatus = create<UiStatusStore>()((set) => ({
  status: null,
  post: (tone, text) => {
    const id = Date.now();
    set({ status: { tone, text, id } });
    window.setTimeout(() => useUiStatus.getState().clear(id), STATUS_TIMEOUT_MS);
  },
  clear: (id) => set((state) => (state.status?.id === id ? { status: null } : state)),
}));

const post = (tone: UiStatus['tone'], text: string) => useUiStatus.getState().post(tone, text);

export function saveProjectWithStatus(): void {
  post('ok', `Guardado: ${saveCurrentProject()}`);
}

// Opens the native file picker and loads the chosen .camper.json (undoable via loadProject)
export function pickProjectFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const count = await openProjectFile(file);
      post('ok', `Abierto: ${file.name} (${count} módulos)`);
    } catch (error) {
      post('error', error instanceof ProjectFileError ? error.message : 'No se pudo leer el archivo.');
    }
  };
  input.click();
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

// Bill of materials of the current project as CSV (semicolon separated, Spanish spreadsheet locale)
export function exportBillOfMaterials(): void {
  const { items, van } = useProjectStore.getState();
  const rows = [
    ['Módulo', 'Categoría', 'Ancho (mm)', 'Alto (mm)', 'Fondo (mm)', 'Material', 'Peso (kg)', 'Precio (€)'],
    ...items.map((item) => [
      item.name,
      item.category,
      item.dimensions.width,
      item.dimensions.height,
      item.dimensions.depth,
      item.materialId,
      item.weightKg.toLocaleString('es-ES'),
      item.priceEur.toLocaleString('es-ES'),
    ]),
  ];
  const csv = '﻿' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${van.id}-materiales.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  post('ok', `Exportado: ${link.download}`);
}
