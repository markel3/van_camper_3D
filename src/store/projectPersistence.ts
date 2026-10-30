import { parseProject, projectFileName, serializeProject } from '../utils/projectFile';
import { useProjectStore } from './useProjectStore';

// Browser side of .camper.json import/export (ARCHITECTURE.md §1, local persistence).

// Downloads the current project and returns the file name used
export function saveCurrentProject(): string {
  const { van, items, interiorFinish } = useProjectStore.getState();
  const fileName = projectFileName(van);
  const blob = new Blob([serializeProject({ van, items, interiorFinish })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Some browsers start the download asynchronously; release the blob URL afterwards
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

// Validates and loads a project file. Throws ProjectFileError (Spanish message) on invalid content.
export async function openProjectFile(file: File): Promise<number> {
  const project = parseProject(await file.text());
  useProjectStore.getState().loadProject(project);
  return project.items.length;
}
