import { REAR_DOOR_THICKNESS_M, type VanLayout } from '../../../../utils/vanLayout';

// Camera-facing rule shared by the procedural body (panel hiding) and the .glb body (section cut),
// so both variants open the same side of the van for the same camera.

// Walls must be clearly faced (within ≈ 45°), so three-quarter exterior shots keep the body
export const WALL_HIDE_COS = 0.7;
// The roof opens earlier: looking down into the van is the main design view
export const ROOF_HIDE_COS = 0.55;

export type CargoPanelId = 'left' | 'right' | 'roof' | 'rear' | 'cab';

export interface CargoPanelRule {
  id: CargoPanelId;
  normal: readonly [number, number, number]; // outward unit normal, van space
  plane: number; // normal · (point on the outer face): the camera is outside when beyond it
  threshold: number; // cosine: open only when the view comes from within this cone of the normal
}

export function cargoPanelRules(layout: VanLayout): CargoPanelRule[] {
  return [
    { id: 'left', normal: [-1, 0, 0], plane: layout.halfBody, threshold: WALL_HIDE_COS },
    { id: 'right', normal: [1, 0, 0], plane: layout.halfBody, threshold: WALL_HIDE_COS },
    { id: 'roof', normal: [0, 1, 0], plane: layout.roofTop, threshold: ROOF_HIDE_COS },
    { id: 'rear', normal: [0, 0, 1], plane: layout.cargoL + REAR_DOOR_THICKNESS_M, threshold: WALL_HIDE_COS },
    // The cab only opens when the camera looks into the van from straight ahead of the bulkhead
    { id: 'cab', normal: [0, 0, -1], plane: 0, threshold: WALL_HIDE_COS },
  ];
}

// Centre of the cargo box, the reference point of the view direction
export const cargoCentre = (layout: VanLayout): readonly [number, number, number] => [
  0,
  layout.cargoH / 2,
  layout.cargoL / 2,
];

// Cosine between the panel normal and the direction cargo centre → camera, or −1 when the camera
// is inside the panel's outer face. A panel "opens" when the result exceeds its threshold.
// Plain numbers: safe to call every frame.
export function panelFacing(
  camX: number,
  camY: number,
  camZ: number,
  centre: readonly [number, number, number],
  rule: CargoPanelRule,
): number {
  const [nx, ny, nz] = rule.normal;
  if (camX * nx + camY * ny + camZ * nz <= rule.plane) return -1;
  const dx = camX - centre[0];
  const dy = camY - centre[1];
  const dz = camZ - centre[2];
  const distance = Math.hypot(dx, dy, dz) || 1;
  return (dx * nx + dy * ny + dz * nz) / distance;
}
