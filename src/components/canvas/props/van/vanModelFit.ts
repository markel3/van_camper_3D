import { Box3, DoubleSide, Group, Mesh, Vector3, type BufferGeometry, type Material, type Object3D, type Plane } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VanSpec } from '../../../../types/camper.types';
import { mmToM } from '../../../../utils/unitConverters';
import type { VanLayout } from '../../../../utils/vanLayout';
import type { VanDoorId } from '../../../../store/useInteractionStore';
import { upgradeVanMaterial } from './vanMaterials';
import { doorAperture } from './vanDoorMotion';

// Fits a vehicle .glb into van space and prepares it for the section cut.
// Assumed source convention (van-l3h2.glb): Y-up, metres, front facing +Z, wheel nodes named
// Wheel_FL / Wheel_FR / Wheel_RL / Wheel_RR. Van space has the cab at −Z, so the model is turned
// 180° about Y; its driver door (+X) then lands on −X, our driver side.

const WHEEL_NODE = /^Wheel_([FR])([LR])$/;
// Calibration references: the model's cargo floor top lands on Y = 0, and the inner face of its
// rear doors on the official interior length (bulkhead Z = 0 stays put)
const FLOOR_NODE = 'Cargo_Floor';
// The body shell's top is the exterior roof face: stretched (about the floor) onto layout.roofTop,
// so roof modules sit on it and the inner ceiling clears the official interior height
const BODY_NODE = 'Body';
const REAR_DOOR_NODE = /^RearDoor_/;
// Sanity window for the Z stretch: anything outside means the reference nodes are not what we expect
const MAX_STRETCH_DEVIATION = 0.1;
// The model's own floor (calibrated flush with Y = 0) is replaced by our slab, which would z-fight with it
const HIDDEN_NODES = new Set(['Cargo_Floor']);
// Only these cast directional shadows: walls and roof would darken the interior while designing
const SHADOW_CASTER = /^(Wheel_|Bumper_)/;
// Cargo doors (separate nodes in the source, pivots on the hinge line / track) and the door they move with
const DOOR_NODES: Readonly<Record<string, VanDoorId>> = { SlidingDoor_R: 'side', RearDoor_L: 'rear', RearDoor_R: 'rear' };

const noRaycast = (): void => undefined;

// The .glb ships without normals (GLTFLoader then falls back to flat shading, whose facets show
// in every clearcoat reflection). Smooth normals are rebuilt once per source geometry: faces
// meeting under the crease angle are smoothed, sharper edges (panel corners) stay crisp.
const CREASE_ANGLE_RAD = (35 * Math.PI) / 180;
// GLTFLoader set flatShading on normal-less meshes; the rebuilt normals replace it
const smoothShade = (material: Material): void => {
  if ('flatShading' in material) material.flatShading = false;
};
const smoothed = new WeakMap<BufferGeometry, BufferGeometry>();
function withSmoothNormals(geometry: BufferGeometry): BufferGeometry {
  if (geometry.getAttribute('normal')) return geometry;
  let result = smoothed.get(geometry);
  if (!result) {
    result = toCreasedNormals(geometry, CREASE_ANGLE_RAD);
    smoothed.set(geometry, result);
  }
  return result;
}

export interface VanModelFit {
  scale: number; // uniform
  rotationY: number; // radians
  offset: [number, number, number]; // van space, applied after rotation and scale
  // Extra Z scale (about the bulkhead, Z = 0) fitting the model's cargo length to the official one
  stretchZ: number;
  // Extra Y scale (about the cargo floor, Y = 0) fitting the model's roof face to layout.roofTop
  stretchY: number;
  // Model-unit Y of the tyre bottoms and the ground they must keep touching (wheel compensation)
  tyreBottomModelY: number;
  groundY: number;
  wheelbaseM: number | null; // model wheelbase before scaling (null: no wheel nodes)
  // Fitted model envelope in van space, for reporting and the section cut
  bounds: Box3;
}

// Movable cargo doors of the model (VanModel animates them in the model frame: Y-up, front +Z)
export interface VanModelDoors {
  side: Object3D | null; // SlidingDoor_R: passenger side, slides towards the rear (model −Z)
  rearLeft: Object3D | null; // RearDoor_L (model +X), hinged on its outer edge
  rearRight: Object3D | null; // RearDoor_R (model −X, carries the handle: opens first)
  // Closed pose of each node, to animate from
  base: Map<Object3D, { position: Vector3; rotationY: number }>;
  // Per-door clones of the cut materials: an open door drops the section planes (it stands
  // outside the body and stays visible from any side)
  materials: Record<VanDoorId, Material[]>;
  // Interior openings in van space (null: the model lacks that door)
  apertures: Record<VanDoorId, Box3 | null>;
}

export interface PreparedVanModel {
  object: Group;
  fit: VanModelFit;
  materials: Material[]; // per-instance clones, to dispose
  doors: VanModelDoors;
}

const doorOf = (object: Object3D): { door: VanDoorId; node: Object3D } | null => {
  for (let node: Object3D | null = object; node; node = node.parent) {
    const door = DOOR_NODES[node.name];
    if (door) return { door, node };
  }
  return null;
};

const isUnderWheel = (object: Object3D): boolean => {
  for (let node: Object3D | null = object; node; node = node.parent) if (WHEEL_NODE.test(node.name)) return true;
  return false;
};

// Axle centres (Z, in the rotated model frame) from the wheel node world positions
function axleZ(rotated: Object3D): { front: number; rear: number } | null {
  const front: number[] = [];
  const rear: number[] = [];
  const position = new Vector3();
  rotated.traverse((node) => {
    const match = WHEEL_NODE.exec(node.name);
    if (!match) return;
    node.getWorldPosition(position);
    (match[1] === 'F' ? front : rear).push(position.z);
  });
  if (front.length === 0 || rear.length === 0) return null;
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return { front: mean(front), rear: mean(rear) };
}

// Box of the named nodes (rotated model frame), or null when the model does not have them
function nodesBox(rotated: Object3D, match: (name: string) => boolean): Box3 | null {
  const box = new Box3();
  rotated.traverse((node) => {
    if (match(node.name)) box.expandByObject(node);
  });
  return box.isEmpty() ? null : box;
}

// Uniform scale from the wheelbase (fallback: overall length), centred on X, tyres resting on the
// ground plane. Then the calibration (Y: floor on Y = 0 and roof face on layout.roofTop):
// - Z: two-point fit, rear axle on rearAxleZMM AND the rear doors' inner face on cargoL, so the
//   interior wheel arches (collisions) sit exactly in the model's wheel openings;
// - Y: shift putting the model's cargo floor on Y = 0 (wheels are compensated in prepareVanModel,
//   so tyres stay round and on the ground).
export function computeVanModelFit(rotated: Object3D, van: VanSpec, layout: VanLayout): VanModelFit {
  rotated.updateMatrixWorld(true);
  const box = new Box3().setFromObject(rotated);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const axles = axleZ(rotated);
  const wheelbaseM = axles ? axles.rear - axles.front : null;
  const scale =
    wheelbaseM && wheelbaseM > 0 ? mmToM(van.wheelbaseMM) / wheelbaseM : mmToM(van.overallLengthMM) / (size.z || 1);
  const baseZ = axles
    ? layout.rearAxleZ - axles.rear * scale
    : (layout.frontZ + layout.rearZ) / 2 - centre.z * scale;
  const baseY = layout.groundY - box.min.y * scale;

  const floor = nodesBox(rotated, (name) => name === FLOOR_NODE);
  const body = nodesBox(rotated, (name) => name === BODY_NODE);
  // Roof face above the model's cargo floor, after the uniform scale
  const roofAboveFloor = floor && body ? (body.max.y - floor.max.y) * scale : 0;
  const stretchYRaw = roofAboveFloor > 0 ? layout.roofTop / roofAboveFloor : 1;
  const stretchY = Math.abs(stretchYRaw - 1) <= MAX_STRETCH_DEVIATION ? stretchYRaw : 1;
  const sy = scale * stretchY;
  // Cargo floor on Y = 0 (without a floor node: tyres on the ground, as the uniform fit)
  const offsetY = floor ? -floor.max.y * sy : baseY;
  const doors = nodesBox(rotated, (name) => REAR_DOOR_NODE.test(name));
  // Uniformly fitted, the rear axle is already on rearAxleZ: stretch about it so the doors land on cargoL
  const doorInnerZ = doors ? doors.min.z * scale + baseZ : 0;
  const pivotZ = axles ? layout.rearAxleZ : 0;
  const stretch = doorInnerZ > pivotZ ? (layout.cargoL - pivotZ) / (doorInnerZ - pivotZ) : 1;
  const stretchZ = Math.abs(stretch - 1) <= MAX_STRETCH_DEVIATION ? stretch : 1;

  const offset: [number, number, number] = [-centre.x * scale, offsetY, pivotZ + (baseZ - pivotZ) * stretchZ];
  const sz = scale * stretchZ;
  // Body envelope (the lifted wheels stay inside it except at the bottom: ground level)
  const bounds = new Box3(
    new Vector3(box.min.x * scale + offset[0], layout.groundY, box.min.z * sz + offset[2]),
    new Vector3(box.max.x * scale + offset[0], box.max.y * sy + offset[1], box.max.z * sz + offset[2]),
  );
  return {
    scale,
    rotationY: Math.PI,
    offset,
    stretchZ,
    stretchY,
    tyreBottomModelY: box.min.y,
    groundY: layout.groundY,
    wheelbaseM,
    bounds,
  };
}

// Clones the cached glTF scene for one van instance: fitted transform, shadows, our floor instead
// of the model's, and per-instance PBR materials (upgradeVanMaterial: clearcoat paint, tinted glass,
// rubber, brushed rims...) carrying the shared section-cut planes.
// Wheels get uncut clones (the X-ray mode still changes their opacity); the glTF cache is never mutated.
export function prepareVanModel(
  scene: Object3D,
  van: VanSpec,
  layout: VanLayout,
  planes: Plane[],
): PreparedVanModel {
  const rotated = new Group();
  rotated.rotation.y = Math.PI;
  rotated.add(scene.clone(true));
  const fit = computeVanModelFit(rotated, van, layout);

  const clones = new Map<Material, Material>();
  const cut = (material: Material): Material => {
    const existing = clones.get(material);
    if (existing) return existing;
    const clone = upgradeVanMaterial(material, van.paintColor);
    smoothShade(clone);
    clone.clippingPlanes = planes;
    // Only the region inside ALL half-spaces is removed: a box-shaped opening in the cargo zone
    clone.clipIntersection = true;
    // Cut walls show their inner faces instead of looking like missing geometry
    clone.side = DoubleSide;
    clones.set(material, clone);
    return clone;
  };
  const plainClones = new Map<Material, Material>();
  const plain = (material: Material): Material => {
    const existing = plainClones.get(material);
    if (existing) return existing;
    const clone = upgradeVanMaterial(material, van.paintColor);
    smoothShade(clone);
    plainClones.set(material, clone);
    return clone;
  };

  // Door parts get their own clones per door, so each door can drop the section cut on its own
  const doorClones: Record<VanDoorId, Map<Material, Material>> = { side: new Map(), rear: new Map() };
  const doorCut = (door: VanDoorId) => (material: Material): Material => {
    const existing = doorClones[door].get(material);
    if (existing) return existing;
    const clone = upgradeVanMaterial(material, van.paintColor);
    smoothShade(clone);
    clone.clippingPlanes = planes;
    clone.clipIntersection = true;
    clone.side = DoubleSide;
    doorClones[door].set(material, clone);
    return clone;
  };
  const doorNodes = new Map<string, Object3D>();

  rotated.traverse((node) => {
    if (HIDDEN_NODES.has(node.name)) node.visible = false;
    if (DOOR_NODES[node.name]) doorNodes.set(node.name, node);
    if (WHEEL_NODE.test(node.name)) {
      // Wheels stay round under the Z/Y stretches and keep their uniform-fit height: tyres on the ground
      node.scale.z /= fit.stretchZ;
      node.scale.y /= fit.stretchY;
      const centreAboveGround = (node.position.y - fit.tyreBottomModelY) * fit.scale;
      node.position.y = (fit.groundY + centreAboveGround - fit.offset[1]) / (fit.scale * fit.stretchY);
    }
    if (!(node instanceof Mesh)) return;
    node.raycast = noRaycast;
    node.geometry = withSmoothNormals(node.geometry);
    node.castShadow = SHADOW_CASTER.test(node.name) || isUnderWheel(node);
    node.receiveShadow = true;
    const door = doorOf(node);
    const convert = isUnderWheel(node) ? plain : door ? doorCut(door.door) : cut;
    node.material = Array.isArray(node.material) ? node.material.map(convert) : convert(node.material);
  });

  const object = new Group();
  object.scale.set(fit.scale, fit.scale * fit.stretchY, fit.scale * fit.stretchZ);
  object.position.set(...fit.offset);
  object.add(rotated);

  // Closed door boxes in van space (the object has no parent yet: its world frame is van space)
  object.updateMatrixWorld(true);
  const leafBox = (...names: string[]): Box3 | null => {
    const box = new Box3();
    for (const name of names) {
      const node = doorNodes.get(name);
      if (node) box.expandByObject(node);
    }
    return box.isEmpty() ? null : box;
  };
  const sideLeaf = leafBox('SlidingDoor_R');
  const rearLeaves = leafBox('RearDoor_L', 'RearDoor_R');
  const base = new Map<Object3D, { position: Vector3; rotationY: number }>();
  doorNodes.forEach((node) => base.set(node, { position: node.position.clone(), rotationY: node.rotation.y }));
  const doors: VanModelDoors = {
    side: doorNodes.get('SlidingDoor_R') ?? null,
    rearLeft: doorNodes.get('RearDoor_L') ?? null,
    rearRight: doorNodes.get('RearDoor_R') ?? null,
    base,
    materials: { side: [...doorClones.side.values()], rear: [...doorClones.rear.values()] },
    apertures: {
      side: sideLeaf && doorAperture('side', sideLeaf, layout),
      rear: rearLeaves && doorAperture('rear', rearLeaves, layout),
    },
  };
  return {
    object,
    fit,
    materials: [...clones.values(), ...plainClones.values(), ...doors.materials.side, ...doors.materials.rear],
    doors,
  };
}
