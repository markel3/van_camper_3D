import { Plane, type Box3, type Matrix4 } from 'three';
import type { VanLayout } from '../../../../utils/vanLayout';
import { panelFacing, type CargoPanelId, type CargoPanelRule } from './cargoPanels';

// Section cut of a .glb body: four clipping planes shared by all the model's cut materials, with
// clipIntersection = true, so only the box-shaped region inside every half-space disappears.
// The cab (Z < 0), the wheels (uncut materials) and the lower sill stay intact.
// Double cut (roof + one side wall): two box openings cannot be one convex region, so the planes
// describe a diagonal wedge instead, from the far wall's top edge down to the near wall's floor
// line. It removes the whole roof and the near wall and leaves the far wall standing.

export const SECTION_PLANE_COUNT = 4;
export type SectionCut = Exclude<CargoPanelId, 'cab'> | 'roofLeft' | 'roofRight' | null;

const FLOOR_MARGIN_M = 0.02; // keep the sill below the cargo floor
const REAR_SILL_M = 0.07; // keep the rear bumper top under the doors
const REAR_DEPTH_M = 0.15; // depth of the rear opening from the model's rear end
const ROOF_DEPTH_M = 0.08; // the roof cut starts this far below the interior ceiling
const NEVER = 1e6;

// Plane that removes the half-space { p : a · p > d } (three.js clips where n · p + c < 0).
// Normalised, since Plane.applyMatrix4 assumes a unit normal.
function removeBeyond(plane: Plane, ax: number, ay: number, az: number, d: number): void {
  const length = Math.hypot(ax, ay, az) || 1;
  plane.normal.set(-ax / length, -ay / length, -az / length);
  plane.constant = d / length;
}

// A plane nothing lies behind: with intersection clipping it disables the whole cut
const keepAll = (plane: Plane): void => removeBeyond(plane, 0, 1, 0, NEVER);

// The one set of section planes of the scene (there is a single van): written each frame by the
// .glb body (VanModel) and shared by every material that must be cut with it, such as the
// interior lining. Starts, and is reset to, "cut nothing".
export const SECTION_PLANES: readonly Plane[] = Array.from({ length: SECTION_PLANE_COUNT }, () => {
  const plane = new Plane();
  keepAll(plane);
  return plane;
});
export const resetSectionPlanes = (): void => SECTION_PLANES.forEach(keepAll);

// The panel to open: the most squarely faced one beyond its threshold (one cut at a time, since a
// single intersection set cannot describe two openings). The cab never opens on the model.
export function chooseSectionCut(
  camX: number,
  camY: number,
  camZ: number,
  centre: readonly [number, number, number],
  rules: readonly CargoPanelRule[],
): SectionCut {
  let best: SectionCut = null;
  let bestCos = -Infinity;
  for (const rule of rules) {
    if (rule.id === 'cab') continue;
    const cos = panelFacing(camX, camY, camZ, centre, rule);
    if (cos > rule.threshold && cos > bestCos) {
      best = rule.id;
      bestCos = cos;
    }
  }
  return best;
}

// Perspective design view: roof and the side wall nearest the camera open together, unless the
// camera looks in through the rear doors or stands inside the cargo body (walk-through view: the
// lining and ceiling must stay). The orthographic views keep one cut each.
export function chooseCargoOpening(
  camX: number,
  camY: number,
  camZ: number,
  centre: readonly [number, number, number],
  rules: readonly CargoPanelRule[],
  doubleCut: boolean,
): SectionCut {
  const single = chooseSectionCut(camX, camY, camZ, centre, rules);
  if (!doubleCut || single === 'rear') return single;
  const inside = rules.every(({ normal: [nx, ny, nz], plane }) => camX * nx + camY * ny + camZ * nz <= plane);
  if (inside) return null;
  return camX >= 0 ? 'roofRight' : 'roofLeft';
}

// Whether a cargo panel is open for a cut (shared with the procedural body's panel hiding)
export function isPanelOpen(cut: SectionCut, panel: CargoPanelId): boolean {
  if (cut === panel) return true;
  if (cut === 'roofRight') return panel === 'roof' || panel === 'right';
  if (cut === 'roofLeft') return panel === 'roof' || panel === 'left';
  return false;
}

// Writes the cut planes in van space, then moves them to world space (clipping planes are world-space).
// Plane.applyMatrix4 uses three's internal scratch objects: no allocations.
export function writeSectionPlanes(
  planes: readonly Plane[],
  cut: SectionCut,
  layout: VanLayout,
  model: Box3,
  vanToWorld: Matrix4,
): void {
  const [a, b, c, d] = planes;
  if (!a || !b || !c || !d) return;
  const inner = layout.cargoW / 2;
  const rearEnd = model.max.z;

  switch (cut) {
    case 'right':
    case 'left': {
      const side = cut === 'right' ? 1 : -1;
      removeBeyond(a, side, 0, 0, inner); // beyond the inner wall face
      removeBeyond(b, 0, 1, 0, FLOOR_MARGIN_M); // above the floor
      removeBeyond(c, 0, 0, 1, 0); // behind the bulkhead (cargo zone, cab untouched)
      removeBeyond(d, 0, 0, -1, -(rearEnd - REAR_DEPTH_M)); // ahead of the rear corner pillars
      break;
    }
    case 'rear':
      removeBeyond(a, 0, 0, 1, rearEnd - REAR_DEPTH_M);
      removeBeyond(b, 0, 1, 0, REAR_SILL_M);
      removeBeyond(c, 1, 0, 0, -inner); // x > −inner
      removeBeyond(d, -1, 0, 0, -inner); // x < inner
      break;
    case 'roofRight':
    case 'roofLeft': {
      const side = cut === 'roofRight' ? 1 : -1;
      const top = layout.cargoH - ROOF_DEPTH_M;
      const rise = top - FLOOR_MARGIN_M;
      removeBeyond(a, 0, 0, 1, 0); // behind the bulkhead
      removeBeyond(b, 0, 0, -1, -(rearEnd - REAR_DEPTH_M)); // ahead of the rear corner pillars
      removeBeyond(c, 0, 1, 0, FLOOR_MARGIN_M); // above the floor
      // Above the line (−side·inner, top) → (side·inner, floor): normal (side·rise, 2·inner)
      removeBeyond(d, side * rise, 2 * inner, 0, rise * inner + 2 * inner * FLOOR_MARGIN_M);
      break;
    }
    case 'roof':
      removeBeyond(a, 0, 1, 0, layout.cargoH - ROOF_DEPTH_M);
      removeBeyond(b, 0, 0, 1, 0);
      removeBeyond(c, 0, 1, 0, layout.cargoH - ROOF_DEPTH_M); // padding: same half-space again
      removeBeyond(d, 0, 0, 1, 0);
      break;
    case null:
      keepAll(a);
      keepAll(b);
      keepAll(c);
      keepAll(d);
      break;
  }
  for (const plane of planes) plane.applyMatrix4(vanToWorld);
}
