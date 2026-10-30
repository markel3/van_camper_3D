import type { CamperItem, CatalogItemDef, VanSpec } from '../types/camper.types';
import { mmToM } from './unitConverters';
import { resolveRestingY } from './surfaceSnap';
import { roofTopY } from './vanLayout';

// Builds a new instance from a catalog entry (WORKFLOWS.md, Flow 2).
// Placement: centred on the cargo floor (X = 0, Z = half the cargo length, base at Y = 0).
// Roof-mounted products (skylights, solar panels) sit on the exterior roof face instead, and
// overhead cabinets high on the driver-side wall (−X), turned 90° so their front faces the aisle.
// Surface decor rests on the highest free surface under the insertion point (`items`, surfaceSnap.ts);
// the store's addItem re-applies the same rule, so callers without the item list still land correctly.
export function createItemFromCatalog(
  def: CatalogItemDef,
  van: VanSpec,
  items: readonly CamperItem[] = [],
): Omit<CamperItem, 'id'> {
  // Model URL and mount stay in the catalogue (looked up by catalogId), so they never reach saved projects
  const { modelUrl: _model, mount, articulated: _articulated, ...product } = def;
  // Overhead cabinets start against the ceiling (Y = interior height − module height)
  const y =
    mount === 'roof'
      ? roofTopY(van)
      : mount === 'overhead'
        ? Math.max(0, mmToM(van.interiorHeightMM - def.dimensions.height))
        : 0;
  const overhead = mount === 'overhead';
  // A quarter turn maps the module's front (+Z) to +X and its depth onto the X axis
  const wallX = -mmToM(van.interiorWidthMM - def.dimensions.depth) / 2;

  const position = { x: overhead ? wallX : 0, y, z: mmToM(van.interiorLengthMM) / 2 };
  const rotation = { x: 0, y: overhead ? Math.PI / 2 : 0, z: 0 };
  const restingY = resolveRestingY(items, { id: '', catalogId: def.catalogId, dimensions: def.dimensions, position, rotation }, Infinity);

  return {
    // Deep copy so store instances never share nested objects with the catalog
    ...structuredClone(product),
    position: { ...position, y: restingY },
    rotation,
    locked: false,
    visible: true,
  };
}
