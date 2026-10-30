import type { VanSpec } from '../types/camper.types';
import { type BoxedItem } from './collisionMath';
import { isRoofMounted } from './roofMount';
import { mmToM } from './unitConverters';

// Vertical (Y) movement rules shared by the gizmo, the properties panel and the store.

// True when the user controls the item's height: everything but roof modules (Y is the roof face).
// Surface decor moves vertically between its free resting levels only (surfaceSnap.ts): the
// requested Y picks the nearest one, e.g. the floor under a table or the table top.
export const canMoveVertically = (catalogId: string): boolean => !isRoofMounted(catalogId);

// Highest base Y (metres) that keeps the item under the cargo ceiling, quarter turns irrelevant for height
export function maxItemY(van: VanSpec, item: Pick<BoxedItem, 'dimensions'>): number {
  return Math.max(0, mmToM(van.interiorHeightMM) - mmToM(item.dimensions.height));
}

// Clamps a requested Y to [0, ceiling − item height]. Roof modules only get the floor clamp.
export function clampItemY(
  van: VanSpec,
  item: Pick<BoxedItem, 'catalogId' | 'dimensions'>,
  y: number,
): number {
  const floored = Math.max(0, y);
  return isRoofMounted(item.catalogId) ? floored : Math.min(floored, maxItemY(van, item));
}
