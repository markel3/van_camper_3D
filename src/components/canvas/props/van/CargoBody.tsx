import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3, type Group, type Material, type Object3D } from 'three';
import { REAR_DOOR_THICKNESS_M, type VanLayout } from '../../../../utils/vanLayout';
import { ROOF_SKIN_ABOVE_M, SIDE_SKIN_OFFSET_M } from '../insulation/shellProfile';
import { SLIDING_DOOR_Z_M } from '../insulation/shellLayout';
import { BoxPart, type Vec3 } from './BoxPart';
import { doorAperture, phase, setVanDoorAperture, vanDoorProgress } from './vanDoorMotion';
import { WHEEL_ARCH_CLEARANCE_M } from './cabGeometry';
import { vanMaterials } from './vanMaterials';

export interface CargoPanelRefs {
  left: RefObject<Group | null>;
  right: RefObject<Group | null>;
  roof: RefObject<Group | null>;
  rear: RefObject<Group | null>;
}

interface CargoBodyProps {
  layout: VanLayout;
  paint: Material;
  camperPro: boolean;
  awning: boolean;
  refs: CargoPanelRefs;
}

// Sliding door opening on the passenger side (+X), Z from the bulkhead: the bare shell frames
// leave the same gap (insulation/shellLayout.ts). REFERENCE values.
const SLIDING_DOOR_Z: readonly [number, number] = SLIDING_DOOR_Z_M;
const SIDE_DOOR_TOP_BELOW_ROOF_M = 0.14; // under the awning cassette
const SIDE_DOOR_STEP_M = 0.02; // sill strip under the sliding door
const REAR_PILLAR_W_M = 0.07; // rear corner pillars carrying the barn door hinges
const REAR_DOOR_TOP_BELOW_ROOF_M = 0.02;
const REAR_BUMPER_TOP_M = 0.14; // above the sill
const LEAF_GAP_M = 0.004; // half the gap between the two rear leaves
const SIDE_POP_CLEARANCE_M = 0.02;
const SIDE_TRAVEL_EXTRA_M = 0.04;
const REAR_OPEN_RAD = (100 * Math.PI) / 180;

interface PartSpec {
  min: Vec3;
  max: Vec3;
  material: Material;
  castShadow?: boolean;
}

// The parts of a wall piece outside a door rectangle (Y × Z), and the part inside it
function splitByDoor(part: PartSpec, y0: number, y1: number, z0: number, z1: number): { wall: PartSpec[]; door: PartSpec | null } {
  const [ax, ay, az] = part.min;
  const [bx, by, bz] = part.max;
  if (by <= y0 || ay >= y1 || bz <= z0 || az >= z1) return { wall: [part], door: null };
  const cy0 = Math.max(ay, y0);
  const cy1 = Math.min(by, y1);
  const cz0 = Math.max(az, z0);
  const cz1 = Math.min(bz, z1);
  const piece = (min: Vec3, max: Vec3): PartSpec => ({ ...part, min, max });
  const wall = [
    piece([ax, ay, az], [bx, by, cz0]), // ahead of the door
    piece([ax, ay, cz1], [bx, by, bz]), // behind it
    piece([ax, ay, cz0], [bx, cy0, cz1]), // below
    piece([ax, cy1, cz0], [bx, by, cz1]), // above
  ].filter(({ min, max }) => max[1] - min[1] > 1e-4 && max[2] - min[2] > 1e-4);
  return { wall, door: piece([ax, cy0, cz0], [bx, cy1, cz1]) };
}

export function CargoBody({ layout, paint, camperPro, awning, refs }: CargoBodyProps) {
  const { cargoW, cargoH, cargoL, halfBody: hb, sillY, roofTop, groundY } = layout;
  const inner = cargoW / 2;
  // Outer skin of the walls, beyond the bare shell's painted inner skin (BareShell)
  const wallInner = Math.min(hb - 0.01, inner + SIDE_SKIN_OFFSET_M + 0.004);
  const archR = layout.wheelR + WHEEL_ARCH_CLEARANCE_M;
  const openingTop = layout.wheelY + archR;
  const archFront = layout.rearAxleZ - archR;
  const archRear = layout.rearAxleZ + archR;
  const doorsZ = cargoL + REAR_DOOR_THICKNESS_M;
  // Inside face of the roof: above the interior height, beyond the bare shell's roof skin
  const roofInner = Math.min(roofTop - 0.01, cargoH + ROOF_SKIN_ABOVE_M + 0.004);
  const black = vanMaterials.blackPlastic();
  const glass = vanMaterials.glass();

  // Sliding door rectangle (Y × Z) and the rear barn doors
  const [sideZ0, sideZ1] = SLIDING_DOOR_Z;
  const sideY0 = sillY + SIDE_DOOR_STEP_M;
  const sideY1 = cargoH - SIDE_DOOR_TOP_BELOW_ROOF_M;
  const hingeX = hb - REAR_PILLAR_W_M;
  const leafY0 = sillY + REAR_BUMPER_TOP_M + 0.01;
  const leafY1 = cargoH - REAR_DOOR_TOP_BELOW_ROOF_M;

  // Wall pieces, built on +X (the driver side is the mirror image, without the door)
  const wallParts: PartSpec[] = [
    { min: [wallInner, openingTop, 0], max: [hb, roofInner, cargoL], material: paint, castShadow: false },
    // Lower panel, interrupted by the rear wheel opening
    { min: [wallInner, sillY, 0], max: [hb, openingTop, archFront], material: paint },
    { min: [wallInner, sillY, archRear], max: [hb, openingTop, cargoL], material: paint },
    // Swage line pressed along the side
    { min: [hb, 0.9, 0.15], max: [hb + 0.006, 0.94, cargoL - 0.15], material: paint, castShadow: false },
    ...(camperPro
      ? [
          { min: [hb, sillY, 0], max: [hb + 0.012, sillY + 0.14, archFront], material: black },
          { min: [hb, sillY, archRear], max: [hb + 0.012, sillY + 0.14, cargoL], material: black },
        ] satisfies PartSpec[]
      : []),
  ];
  const rightWall: PartSpec[] = [];
  const sideLeaf: PartSpec[] = [];
  for (const part of wallParts) {
    const { wall, door } = splitByDoor(part, sideY0, sideY1, sideZ0, sideZ1);
    rightWall.push(...wall);
    if (door) sideLeaf.push(door);
  }
  // Pull at the rear edge of the sliding door
  sideLeaf.push({ min: [hb, 0.36, sideZ1 - 0.2], max: [hb + 0.014, 0.4, sideZ1 - 0.06], material: black });

  // Door openings for the [E] aim and the interior cut (the aperture helper insets by the leaf overlap)
  useLayoutEffect(() => {
    const grow = 0.03;
    const side = new Box3(new Vector3(wallInner, sideY0, sideZ0 - grow), new Vector3(hb, sideY1 + grow, sideZ1 + grow));
    const rear = new Box3(new Vector3(-hingeX - grow, leafY0, cargoL), new Vector3(hingeX + grow, leafY1 + grow, doorsZ));
    setVanDoorAperture('side', doorAperture('side', side, layout));
    setVanDoorAperture('rear', doorAperture('rear', rear, layout));
  }, [layout, wallInner, hb, sideY0, sideY1, sideZ0, sideZ1, hingeX, leafY0, leafY1, cargoL, doorsZ]);

  // Door leaves: outside the panel groups, so an open door stays visible when its panel opens for
  // the camera; a closed one follows its panel
  const sideLeafRef = useRef<Group | null>(null);
  const rightLeafRef = useRef<Group | null>(null);
  const leftLeafRef = useRef<Group | null>(null);
  const rearLeavesRef = useRef<Group | null>(null);
  const sidePop = hb - wallInner + SIDE_POP_CLEARANCE_M;
  const sideTravel = sideZ1 - sideZ0 + SIDE_TRAVEL_EXTRA_M;
  useFrame(() => {
    const side = vanDoorProgress.side;
    const rear = vanDoorProgress.rear;
    const leaf = sideLeafRef.current;
    if (leaf) {
      leaf.position.set(phase(side, 0, 0.25) * sidePop, 0, phase(side, 0.18, 1) * sideTravel);
      showWith(leaf, refs.right.current, side);
    }
    if (rightLeafRef.current) rightLeafRef.current.rotation.y = REAR_OPEN_RAD * phase(rear, 0, 0.7);
    if (leftLeafRef.current) leftLeafRef.current.rotation.y = REAR_OPEN_RAD * phase(rear, 0.3, 1);
    if (rearLeavesRef.current) showWith(rearLeavesRef.current, refs.rear.current, rear);
  });

  const parts = (list: readonly PartSpec[]) =>
    list.map((part, index) => <BoxPart key={index} min={part.min} max={part.max} material={part.material} castShadow={part.castShadow} />);

  const sideWall = (side: 1 | -1) => (
    // Built on +X and mirrored for the driver side
    <group ref={side === 1 ? refs.right : refs.left} scale={[side, 1, 1]}>
      {parts(side === 1 ? rightWall : wallParts)}
      {side === 1 && camperPro && awning && (
        // Rolled awning cassette under the roof edge, with black end caps
        <>
          <BoxPart min={[hb + 0.005, cargoH - 0.12, 0.35]} max={[hb + 0.13, cargoH + 0.04, cargoL - 0.25]} material={vanMaterials.awning()} />
          <BoxPart min={[hb + 0.005, cargoH - 0.13, 0.3]} max={[hb + 0.135, cargoH + 0.05, 0.35]} material={black} />
          <BoxPart min={[hb + 0.005, cargoH - 0.13, cargoL - 0.25]} max={[hb + 0.135, cargoH + 0.05, cargoL - 0.2]} material={black} />
        </>
      )}
    </group>
  );

  // One barn door leaf, built for +X around its hinge (outer face, at the pillar's inner edge)
  const leafW = hingeX - LEAF_GAP_M;
  const rearLeaf = (side: 1 | -1) => (
    <group key={side} scale={[side, 1, 1]}>
      <group ref={side === 1 ? rightLeafRef : leftLeafRef} position={[hingeX, 0, doorsZ]}>
        <BoxPart min={[-leafW, leafY0, -REAR_DOOR_THICKNESS_M]} max={[0, leafY1, 0]} material={paint} castShadow={false} />
        <BoxPart min={[-leafW + 0.05, cargoH - 0.62, 0]} max={[-0.07, cargoH - 0.12, 0.004]} material={glass} />
        {side === 1 && <BoxPart min={[-leafW + 0.02, 0.3, 0]} max={[-leafW + 0.04, 0.42, 0.012]} material={black} />}
      </group>
    </group>
  );

  return (
    <group>
      {/* Cargo floor (top face at Y = 0) and the dark chassis frame between the axles */}
      <BoxPart min={[-inner, sillY + 0.05, 0]} max={[inner, 0, cargoL]} material={vanMaterials.cargoFloor()} />
      <BoxPart
        min={[-0.45, groundY + 0.22, layout.frontAxleZ + 0.4]}
        max={[0.45, sillY + 0.05, cargoL - 0.2]}
        material={vanMaterials.chassis()}
      />
      {sideWall(1)}
      {sideWall(-1)}
      <group ref={sideLeafRef}>{parts(sideLeaf)}</group>

      <group ref={refs.roof}>
        <BoxPart min={[-hb, roofInner, 0]} max={[hb, roofTop, doorsZ]} material={paint} castShadow={false} />
      </group>

      {/* Rear frame: corner pillars, header and sill around the barn doors, bumper and lights */}
      <group ref={refs.rear}>
        <BoxPart min={[-hingeX, leafY1, cargoL]} max={[hingeX, roofInner, doorsZ]} material={paint} castShadow={false} />
        <BoxPart min={[-hingeX, sillY, cargoL]} max={[hingeX, leafY0, doorsZ]} material={paint} castShadow={false} />
        <BoxPart min={[-hb, sillY - 0.06, doorsZ]} max={[hb, sillY + REAR_BUMPER_TOP_M, layout.rearZ]} material={black} />
        {[-1, 1].map((side) => (
          <group key={side} scale={[side, 1, 1]}>
            <BoxPart min={[hingeX, sillY, cargoL]} max={[hb, roofInner, doorsZ]} material={paint} castShadow={false} />
            <BoxPart min={[hb - 0.065, 0.05, doorsZ]} max={[hb - 0.005, 0.55, doorsZ + 0.015]} material={vanMaterials.taillight()} />
          </group>
        ))}
      </group>
      <group ref={rearLeavesRef}>
        {rearLeaf(1)}
        {rearLeaf(-1)}
      </group>
    </group>
  );
}

// A door leaf is drawn while it is open, or while the body panel it closes is drawn
function showWith(leaf: Object3D, panel: Object3D | null, progress: number): void {
  const visible = progress > 0.001 || (panel?.visible ?? true);
  if (leaf.visible !== visible) leaf.visible = visible;
}
