import type { CameraViewId } from '../../utils/cameraViews';
import { isRoofMounted } from '../../utils/roofMount';

// Render-only visibility per camera view. In Plan the exterior roof modules (solar panel, skylight)
// would cover the interior layout and the aisle dimensions, so they are not drawn there.
// They still count in weight, CoG and collisions, like a module hidden from the Inspector.
export const isHiddenInView = (catalogId: string, view: CameraViewId): boolean =>
  view === 'top' && isRoofMounted(catalogId);
