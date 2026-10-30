import { ExtrudeGeometry, Shape, ShapeGeometry, type BufferGeometry } from 'three';
import type { VanLayout } from '../../../../utils/vanLayout';

// Side profiles of the cab, drawn in the (Z, Y) plane of van space and extruded across X.
// All offsets are measured from the front bumper (layout.frontZ). REFERENCE proportions of a large panel van.

export const CAB_BEVEL_M = 0.025; // rounds every edge of the extruded panels
const BEVEL_THICKNESS_M = 0.04;
const CAB_REAR_U = -0.03; // stops short of Z = 0 so the bevel never pokes into the cargo box
export const WHEEL_ARCH_CLEARANCE_M = 0.06;

// Key points of the cab profile, shared by the glazing so it follows the body lines
export function cabPoints(layout: VanLayout) {
  const f = layout.frontZ;
  return {
    rearU: CAB_REAR_U,
    windscreenTop: [f + 1.42, layout.cabRoofY - 0.03] as const,
    windscreenBase: [f + 0.78, 0.98] as const,
    bonnetFront: [f + 0.2, 0.66] as const,
    noseTop: [f + 0.07, 0.5] as const,
    archR: layout.wheelR + WHEEL_ARCH_CLEARANCE_M,
  };
}

// Extrudes a (Z, Y) shape across the width, centred on X. ExtrudeGeometry runs along +Z, so it is
// turned −90° about Y (shape X → van Z, extrusion → van −X) and re-centred.
function extrudeAcross(shape: Shape, width: number): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: width - 2 * BEVEL_THICKNESS_M,
    bevelEnabled: true,
    bevelSize: CAB_BEVEL_M,
    bevelThickness: BEVEL_THICKNESS_M,
    bevelSegments: 3,
    curveSegments: 20,
  });
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(width / 2 - BEVEL_THICKNESS_M, 0, 0);
  return geometry;
}

// Wedge nose, raked windscreen, cab roof and the front wheel arch cut-out
export function createCabGeometry(layout: VanLayout): BufferGeometry {
  const p = cabPoints(layout);
  const bottom = layout.sillY + 0.03;
  const shape = new Shape();
  shape.moveTo(p.rearU, bottom);
  shape.lineTo(p.rearU, layout.cabRoofY - 0.03);
  shape.lineTo(...p.windscreenTop);
  shape.lineTo(...p.windscreenBase);
  shape.lineTo(...p.bonnetFront);
  shape.lineTo(...p.noseTop);
  shape.lineTo(p.noseTop[0], bottom);
  shape.lineTo(layout.frontAxleZ - p.archR, bottom);
  shape.absarc(layout.frontAxleZ, layout.wheelY, p.archR, Math.PI, 0, true);
  shape.lineTo(layout.frontAxleZ + p.archR, bottom);
  shape.closePath();
  return extrudeAcross(shape, layout.halfBody * 2);
}

// Camper Pro: aerodynamic cap rising from the cab roof to the high roof, overhanging the windscreen
export function createCabCapGeometry(layout: VanLayout): BufferGeometry {
  const p = cabPoints(layout);
  const tipU = layout.frontZ + 1.3;
  const shape = new Shape();
  shape.moveTo(p.rearU, layout.cabRoofY - 0.05);
  shape.lineTo(p.rearU, layout.roofTop - 0.03);
  shape.lineTo(-0.35, layout.roofTop - 0.05);
  shape.quadraticCurveTo(tipU, layout.roofTop - 0.05, tipU, layout.cabRoofY + 0.06);
  shape.lineTo(p.windscreenTop[0], layout.cabRoofY - 0.02);
  shape.closePath();
  return extrudeAcross(shape, layout.halfBody * 2 - 0.1);
}

// Flat side window outline in the (Z, Y) plane, turned to face ±X like the cab sides
export function createSideWindowGeometry(layout: VanLayout): BufferGeometry {
  const f = layout.frontZ;
  const shape = new Shape();
  shape.moveTo(-0.12, 1.0);
  shape.lineTo(-0.12, layout.cabRoofY - 0.09);
  shape.lineTo(f + 1.47, layout.cabRoofY - 0.09);
  shape.lineTo(f + 0.93, 1.0);
  shape.closePath();
  return new ShapeGeometry(shape).rotateY(-Math.PI / 2);
}
