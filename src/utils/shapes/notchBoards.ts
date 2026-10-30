import { Box3 } from 'three';
import { span } from './shapeBox';

// Carpentry that closes a carcass notched around a wheel arch (fitAdaptation.ts), module-local
// frame: a top board over the arch and a vertical board on every notch face that lies inside the
// module (faces on the module's outer skin stay open towards the wall). The boards are drawn by
// canvas/adapt/NotchBoxing and are solid parts of the notched module.

export const NOTCH_BOARD_T_M = 0.012; // thin plywood boxing around the arch
const EDGE_EPS_M = 0.001;

// `w`, `d`: module width and depth (its local box is [−w/2, w/2] × [−d/2, d/2])
export function notchBoards(notch: Box3, w: number, d: number): Box3[] {
  const t = NOTCH_BOARD_T_M;
  const { min, max } = notch;
  const top = max.y + t;
  const boards: Box3[] = [span(min.x, max.x, max.y, top, min.z, max.z)];
  const xMin = min.x - t >= -w / 2 - EDGE_EPS_M && min.x > -w / 2 + EDGE_EPS_M;
  const xMax = max.x + t <= w / 2 + EDGE_EPS_M && max.x < w / 2 - EDGE_EPS_M;
  const zMin = min.z - t >= -d / 2 - EDGE_EPS_M && min.z > -d / 2 + EDGE_EPS_M;
  const zMax = max.z + t <= d / 2 + EDGE_EPS_M && max.z < d / 2 - EDGE_EPS_M;
  if (xMin) boards.push(span(min.x - t, min.x, min.y, top, min.z, max.z));
  if (xMax) boards.push(span(max.x, max.x + t, min.y, top, min.z, max.z));
  // End boards wrap the corners of the side boards
  const x0 = min.x - (xMin ? t : 0);
  const x1 = max.x + (xMax ? t : 0);
  if (zMin) boards.push(span(x0, x1, min.y, top, min.z - t, min.z));
  if (zMax) boards.push(span(x0, x1, min.y, top, max.z, max.z + t));
  return boards;
}
