import { useStore } from 'zustand';
import { FilePlus2, FileSpreadsheet, FolderOpen, Redo2, Save, Trash2, Undo2, XCircle } from 'lucide-react';
import { redo, undo, useProjectStore } from '../../../store/useProjectStore';
import { useViewStore } from '../../../store/useViewStore';
import { PROJECT_FILE_EXTENSION } from '../../../utils/projectFile';
import { header, separator, type MenuEntry } from '../../ui/menuTypes';
import { exportBillOfMaterials, pickProjectFile, saveProjectWithStatus } from './projectActions';

export function useFileMenu(): MenuEntry[] {
  const setNewProjectOpen = useViewStore((state) => state.setNewProjectOpen);
  return [
    { kind: 'action', id: 'new-project', label: 'Nuevo proyecto…', icon: FilePlus2, onSelect: () => setNewProjectOpen(true) },
    { kind: 'action', id: 'open-project', label: `Abrir proyecto (${PROJECT_FILE_EXTENSION})…`, icon: FolderOpen, onSelect: pickProjectFile },
    { kind: 'action', id: 'save-project', label: 'Guardar proyecto', icon: Save, shortcut: 'Ctrl+S', onSelect: saveProjectWithStatus },
  ];
}

export function useEditMenu(): MenuEntry[] {
  // zundo's history is a separate vanilla store
  const canUndo = useStore(useProjectStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useProjectStore.temporal, (state) => state.futureStates.length > 0);
  const selected = useProjectStore((state) => state.items.find((item) => item.id === state.selectedId));
  const snapStepMM = useProjectStore((state) => state.snapStepMM);
  const setSnapStep = useProjectStore((state) => state.setSnapStep);
  const removeItem = useProjectStore((state) => state.removeItem);
  const select = useProjectStore((state) => state.select);

  return [
    { kind: 'action', id: 'undo', label: 'Deshacer', icon: Undo2, shortcut: 'Ctrl+Z', disabled: !canUndo, onSelect: undo },
    { kind: 'action', id: 'redo', label: 'Rehacer', icon: Redo2, shortcut: 'Ctrl+Y', disabled: !canRedo, onSelect: redo },
    separator,
    {
      kind: 'action',
      id: 'delete-selected',
      label: 'Eliminar módulo seleccionado',
      icon: Trash2,
      shortcut: 'Supr',
      disabled: !selected || selected.locked,
      onSelect: () => selected && removeItem(selected.id),
    },
    { kind: 'action', id: 'deselect', label: 'Deseleccionar', icon: XCircle, shortcut: 'Esc', disabled: !selected, onSelect: () => select(null) },
    separator,
    header('Snap a rejilla'),
    { kind: 'action', id: 'snap-10', label: 'Rejilla de 10 mm', role: 'radio', checked: snapStepMM === 10, onSelect: () => setSnapStep(10) },
    { kind: 'action', id: 'snap-50', label: 'Rejilla de 50 mm', role: 'radio', checked: snapStepMM === 50, onSelect: () => setSnapStep(50) },
  ];
}

export function useExportMenu(): MenuEntry[] {
  return [
    { kind: 'action', id: 'export-project', label: `Proyecto (${PROJECT_FILE_EXTENSION})`, icon: Save, shortcut: 'Ctrl+S', onSelect: saveProjectWithStatus },
    { kind: 'action', id: 'export-bom', label: 'Lista de materiales (CSV)', icon: FileSpreadsheet, onSelect: exportBillOfMaterials },
  ];
}
