import { Grid2x2, RectangleHorizontal, Rotate3d, Square, type LucideIcon } from 'lucide-react';
import type { CameraViewId } from '../../../utils/cameraViews';

export interface ViewOption {
  id: CameraViewId;
  label: string;
  hint: string;
  icon: LucideIcon;
}

// Camera presets (Render menu, viewport rail «Vistas»)
export const VIEW_OPTIONS: readonly ViewOption[] = [
  { id: 'perspective', label: 'Perspectiva libre', hint: 'Órbita 3D completa', icon: Rotate3d },
  { id: 'top', label: 'Planta cenital', hint: 'Ortográfica desde arriba, con cotas de pasillo', icon: Grid2x2 },
  { id: 'side', label: 'Alzado lateral', hint: 'Ortográfica desde el lateral, con alturas libres', icon: RectangleHorizontal },
  { id: 'rear', label: 'Alzado trasero', hint: 'Ortográfica desde las puertas traseras', icon: Square },
];
