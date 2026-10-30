import { Box3, Vector3 } from 'three';
import type { VanSpec } from '../types/camper.types';
import { mmToM } from './unitConverters';

// Exterior body layout derived from a VanSpec, in van space (metres): X centred, Y = 0 on the
// cargo floor, Z = 0 at the bulkhead, +Z towards the rear doors, cab at Z < 0.
// The interior cargo box (collisions) is NOT defined here: see collisionMath.cargoBox.

export const REAR_DOOR_THICKNESS_M = 0.06;
export const REAR_BUMPER_DEPTH_M = 0.06; // bumper behind the doors: the rearmost point of the van
// Cab roof height above the cargo floor (≈ 2.2 m above the ground), REFERENCE value
export const CAB_ROOF_Y_M = 1.68;
// Lower edge of the body side panels above the ground
const SILL_ABOVE_GROUND_M = 0.33;
const TYRE_TRACK_INSET_M = 0.14; // tyre centre plane inside the body side
// Space between the official interior height and the inside of the roof skin, inside the roof
// thickness: the slatted ceiling lining lives there, flush with the interior height
export const CEILING_CAVITY_M = 0.02;
// Free height of the roof zone above the roof skin (roof modules may not exceed it)
export const ROOF_ZONE_HEIGHT_M = 1;
// Wing mirrors stick out beyond the body on each side
export const MIRROR_REACH_M = 0.26;

export interface VanLayout {
  cargoW: number;
  cargoH: number;
  cargoL: number;
  halfBody: number; // half exterior width
  roofTop: number; // exterior roof face: roof modules sit here
  groundY: number;
  sillY: number;
  rearZ: number; // rearmost point (bumper)
  frontZ: number; // frontmost point (front bumper)
  wheelR: number;
  wheelY: number; // wheel centre height
  wheelX: number; // |X| of the tyre centre plane
  frontAxleZ: number;
  rearAxleZ: number;
  cabRoofY: number;
}

export function vanLayout(van: VanSpec): VanLayout {
  const cargoL = mmToM(van.interiorLengthMM);
  const cargoH = mmToM(van.interiorHeightMM);
  const groundY = -mmToM(van.floorHeightMM);
  const wheelR = mmToM(van.wheelRadiusMM);
  const halfBody = mmToM(van.bodyWidthMM) / 2;
  const rearZ = cargoL + REAR_DOOR_THICKNESS_M + REAR_BUMPER_DEPTH_M;
  const rearAxleZ = mmToM(van.rearAxleZMM);
  return {
    cargoW: mmToM(van.interiorWidthMM),
    cargoH,
    cargoL,
    halfBody,
    roofTop: roofTopY(van),
    groundY,
    sillY: groundY + SILL_ABOVE_GROUND_M,
    rearZ,
    frontZ: rearZ - mmToM(van.overallLengthMM),
    wheelR,
    wheelY: groundY + wheelR,
    wheelX: halfBody - TYRE_TRACK_INSET_M,
    frontAxleZ: rearAxleZ - mmToM(van.wheelbaseMM),
    rearAxleZ,
    cabRoofY: Math.min(CAB_ROOF_Y_M, cargoH),
  };
}

// Height of the exterior roof face: interior height + roof thickness
export const roofTopY = (van: VanSpec): number => mmToM(van.interiorHeightMM + van.roofThicknessMM);

// Volume available to roof-mounted modules: the roof footprint, from the roof face upwards
export function roofZoneBox(van: VanSpec): Box3 {
  const halfBody = mmToM(van.bodyWidthMM) / 2;
  const top = roofTopY(van);
  return new Box3(
    new Vector3(-halfBody, top, 0),
    new Vector3(halfBody, top + ROOF_ZONE_HEIGHT_M, mmToM(van.interiorLengthMM) + REAR_DOOR_THICKNESS_M),
  );
}

export interface BoundsM {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

// Whole vehicle (mirrors, wheels, roof modules' headroom) in WORLD space: VanScene shifts van
// space by −L/2 on Z so the cargo box is centred on the origin.
export function vehicleBoundsWorld(van: VanSpec, roofExtraM = 0.3): BoundsM {
  const layout = vanLayout(van);
  const shiftZ = -layout.cargoL / 2;
  const halfX = layout.halfBody + MIRROR_REACH_M;
  return {
    min: [-halfX, layout.groundY, layout.frontZ + shiftZ],
    max: [halfX, layout.roofTop + roofExtraM, layout.rearZ + shiftZ],
  };
}
