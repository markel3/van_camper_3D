import type { BoundsM } from './vanLayout';

// Pure camera framing math for the toolbar "Vistas" presets (1 unit = 1 m, world space).
// World cargo box: X ∈ [−W/2, W/2], Y ∈ [0, H], Z ∈ [−L/2, L/2]; +Z = rear doors.
// Presets frame the whole vehicle (cab, wheels, mirrors, roof), see vanLayout.vehicleBoundsWorld.

export type CameraViewId = 'perspective' | 'top' | 'side' | 'rear';

export type Vec3 = readonly [number, number, number];

export interface CameraPose {
  position: Vec3;
  target: Vec3;
  // Orthographic zoom in pixels per metre (drei's frustum is sized in pixels); 1 for perspective
  zoom: number;
}

export interface ViewportPx {
  width: number;
  height: number;
}

// Three-quarter rear view: the rear doors auto-hide, so the cargo interior is visible with the
// cab in the background
export const DEFAULT_PERSPECTIVE_POSE: CameraPose = {
  position: [4.6, 3.4, 6.4],
  target: [0, 0.7, -0.4],
  zoom: 1,
};

export const isOrthographicView = (view: CameraViewId): boolean => view !== 'perspective';

// Ortho cameras sit this far from the target: well inside the scene fog's start distance (18 m)
const ORTHO_DISTANCE_M = 10;
// Breathing room around the vehicle bounds, plus a relative margin
const FRAME_PADDING_M = 0.25;
const FRAME_MARGIN_FACTOR = 1.1;
// A strictly vertical view direction is degenerate for lookAt; tilt by a negligible offset
const TOP_VIEW_EPSILON_M = 1e-3;

// Pixels-per-metre zoom that fits a span (metres) into the viewport on both screen axes
function fitZoom(viewport: ViewportPx, spanHorizontalM: number, spanVerticalM: number): number {
  const horizontal = (spanHorizontalM + 2 * FRAME_PADDING_M) * FRAME_MARGIN_FACTOR;
  const vertical = (spanVerticalM + 2 * FRAME_PADDING_M) * FRAME_MARGIN_FACTOR;
  const zoom = Math.min(viewport.width / horizontal, viewport.height / vertical);
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 100;
}

// Target pose for a view preset, framing the given world bounds for the viewport.
// Top: cab at the top of the screen, +X to the right. Side: seen from +X (cab on the right).
// Rear: seen from behind (+Z), +X to the right.
export function computeViewPose(view: CameraViewId, bounds: BoundsM, viewport: ViewportPx): CameraPose {
  const widthM = bounds.max[0] - bounds.min[0];
  const heightM = bounds.max[1] - bounds.min[1];
  const lengthM = bounds.max[2] - bounds.min[2];
  const centre: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const [cx, cy, cz] = centre;

  switch (view) {
    case 'perspective':
      return DEFAULT_PERSPECTIVE_POSE;
    case 'top':
      return {
        position: [cx, cy + ORTHO_DISTANCE_M, cz + TOP_VIEW_EPSILON_M],
        target: centre,
        zoom: fitZoom(viewport, widthM, lengthM),
      };
    case 'side':
      return {
        position: [cx + ORTHO_DISTANCE_M, cy, cz],
        target: centre,
        zoom: fitZoom(viewport, lengthM, heightM),
      };
    case 'rear':
      return {
        position: [cx, cy, cz + ORTHO_DISTANCE_M],
        target: centre,
        zoom: fitZoom(viewport, widthM, heightM),
      };
  }
}

// Height (metres) visible at the target plane, used to hand over framing between camera types
export function perspectiveVisibleHeight(distanceM: number, fovDeg: number): number {
  return 2 * distanceM * Math.tan((fovDeg * Math.PI) / 360);
}

export function perspectiveDistanceForHeight(visibleHeightM: number, fovDeg: number): number {
  return visibleHeightM / (2 * Math.tan((fovDeg * Math.PI) / 360));
}

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
