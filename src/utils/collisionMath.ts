import type { CollisionReason, VanSpec } from '../types/camper.types';
import { cargoBox, exceeds, isDecor, overlaps, wheelArchBoxes, type BoxedItem } from './collisionBoxes';
import { analyzeFit } from './fitAdaptation';
import { isRoofMounted } from './roofMount';
import { unionOf } from './shapes/shapeBox';
import { roofZoneBox } from './vanLayout';

// Pure collision engine (WORKFLOWS.md, Flow 3) on the modules' real shapes: every module is the
// set of solid parts its 3D prop draws (utils/shapes), never an invisible bounding box. All boxes
// live in van space: X centred, Y = 0 on the cargo floor, Z = 0 at the bulkhead, metres.
// The primitives live in collisionBoxes.ts and are re-exported here for existing callers.
export * from './collisionBoxes';

export type CollisionMap = Map<string, Set<CollisionReason>>;

// Every colliding module with the reasons why. Part-vs-part, pairs pre-filtered by their envelopes:
// fine for a van-sized scene. Two independent groups: interior modules (cargo box, wheel arches,
// each other) and roof-mounted modules (roof zone, each other); they never collide with one another.
// Decoration (catalogId 'decor-*': cushions, plants, kettles) rests on or hangs from furniture by
// design, so it is only checked against the cargo bounds, never against modules or wheel arches.
// Fit adaptations (fitAdaptation.ts) are part of the shapes: a module notched around a wheel arch
// has its parts split around it, and a device in a bed's open bay touches none of the bed's parts.
export function findCollisions(van: VanSpec, items: readonly BoxedItem[]): CollisionMap {
  const result: CollisionMap = new Map();
  const flag = (id: string, reason: CollisionReason) => {
    const reasons = result.get(id) ?? new Set<CollisionReason>();
    reasons.add(reason);
    result.set(id, reasons);
  };

  const fit = analyzeFit(van, items);
  const cargo = cargoBox(van);
  const roofZone = roofZoneBox(van);
  const arches = wheelArchBoxes(van);
  const shapes = items.map((item) => {
    const parts = fit.parts.get(item.id) ?? [];
    return { id: item.id, roof: isRoofMounted(item.catalogId), decor: isDecor(item.catalogId), parts, envelope: unionOf(parts) };
  });

  shapes.forEach(({ id, roof, decor, parts, envelope }, index) => {
    if (parts.length > 0 && exceeds(envelope, roof ? roofZone : cargo)) flag(id, 'bounds');
    if (decor) return;
    if (!roof && arches.some((arch) => overlaps(envelope, arch) && parts.some((part) => overlaps(part, arch)))) flag(id, 'wheelArch');
    for (const other of shapes.slice(index + 1)) {
      if (other.decor || other.roof !== roof || !overlaps(envelope, other.envelope)) continue;
      if (!parts.some((part) => overlaps(part, other.envelope) && other.parts.some((piece) => overlaps(part, piece)))) continue;
      flag(id, 'item');
      flag(other.id, 'item');
    }
  });

  return result;
}
