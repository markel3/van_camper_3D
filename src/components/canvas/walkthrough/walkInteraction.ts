import { Mesh, Raycaster, ShaderMaterial, Vector2, Vector3, type Camera, type Object3D } from 'three';
import { useProjectStore } from '../../../store/useProjectStore';
import { useInteractionStore, type VanDoorId } from '../../../store/useInteractionStore';
import { isArticulated } from '../../../utils/catalogLookup';
import { WATER_FIXTURE_LABEL, waterFixtureOf, type WaterFixtureKind } from '../../../utils/waterFixtures';
import { kitchenLayout } from '../../../utils/shapes/cabinetShapes';
import { showerLayout } from '../../../utils/shapes/fixtureShapes';
import { mmToM } from '../../../utils/unitConverters';
import type { CamperItem } from '../../../types/camper.types';
import { vanDoorAt } from '../props/van/vanDoorMotion';
import { INTERACT_RANGE_M } from './walkConstants';
import { doorInteraction } from './walkStore';

// [E] interaction: a ray from the screen centre finds what the player aims at (furniture groups
// are named after their item id, see FurnitureItem):
// - the tap / sink of a kitchen block, or the riser / head / mixer of a shower: water on/off;
// - anywhere else on an articulated module: its doors, drawers or lid open/close;
// - the sliding door or the rear doors of the van (their opening, when no module is nearer):
//   open/close (the player stays inside: an open door only lets you look out);
// - anything else (ceiling, walls, empty air): the interior LED strips.
// Doors (modules and van) follow the "Interacción de Puertas" switch; water and lights always work.

const raycaster = new Raycaster();
const CENTRE = new Vector2(0, 0);

// What the opening part of each articulated module is called in the hint
const PART_NOUN: Record<string, string> = {
  'drawer-unit-600': 'cajón',
  'fridge-65l-12v': 'nevera',
  'locker-side-1000': 'arcón',
  'kitchen-block-1000': 'cajón',
  'shower-cabin-800': 'puerta',
  'overhead-cabinet-1000': 'altillo',
};

function isShown(object: Object3D | null): boolean {
  for (let node = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

// Surfaces the ray must pass through: lines/points (generous pick threshold) and drei's infinite
// studio grid, whose 120 m raycast plane stands upright (the shader lays it flat on the GPU only)
function isNoise(object: Object3D): boolean {
  if (!(object instanceof Mesh)) return true;
  const material = object.material as unknown;
  return material instanceof ShaderMaterial && 'infiniteGrid' in material.uniforms;
}

function itemOf(object: Object3D | null, items: readonly CamperItem[]): CamperItem | null {
  for (let node = object; node; node = node.parent) {
    if (!node.name) continue;
    const item = items.find((candidate) => candidate.id === node.name);
    if (item) return item;
  }
  return null;
}

export type AimTarget =
  | { kind: 'item'; item: CamperItem }
  | { kind: 'water'; item: CamperItem; fixture: WaterFixtureKind }
  | { kind: 'vanDoor'; door: VanDoorId }
  | { kind: 'lights' };

const VAN_DOOR_NOUN: Record<VanDoorId, string> = { side: 'puerta lateral', rear: 'portones' };

// Margin around the water parts that still counts as aiming at them (metres)
const WATER_AIM_MARGIN_M = 0.05;
const local = new Vector3();

// Whether a hit point (module frame) is on the module's tap/sink or shower riser/head
function hitsWater(fixture: WaterFixtureKind, item: CamperItem, point: Vector3): boolean {
  const w = mmToM(item.dimensions.width);
  const h = mmToM(item.dimensions.height);
  const d = mmToM(item.dimensions.depth);
  const m = WATER_AIM_MARGIN_M;
  if (fixture === 'tap') {
    const { sink, tap, worktopTop } = kitchenLayout(w, h, d);
    return (
      point.y > worktopTop - 0.2 &&
      Math.abs(point.x - sink.x) < sink.w / 2 + m &&
      point.z > tap.z - m &&
      point.z < sink.z + sink.d / 2 + m
    );
  }
  const l = showerLayout(w, h, d);
  return point.y > l.trayH + 0.02 && Math.abs(point.x - l.riserX) < 0.09 + m && point.z < l.riserZ + l.armL + m + 0.05;
}

// Group of a module (named after its id) above a hit object
function itemGroup(object: Object3D | null, id: string): Object3D | null {
  for (let node = object; node; node = node.parent) if (node.name === id) return node;
  return null;
}

// Nearest visible hit within reach (see the header for what each target does)
export function aimTarget(camera: Camera, scene: Object3D): AimTarget {
  raycaster.setFromCamera(CENTRE, camera);
  raycaster.near = 0;
  raycaster.far = INTERACT_RANGE_M;
  const doors = doorInteraction.get();
  const vanDoor = doors ? vanDoorAt(raycaster.ray, INTERACT_RANGE_M) : null;
  const { items } = useProjectStore.getState();
  for (const hit of raycaster.intersectObjects(scene.children, true)) {
    if (isNoise(hit.object) || !isShown(hit.object)) continue;
    if (vanDoor && hit.distance > vanDoor.distance) break; // the door opening is nearer
    const item = itemOf(hit.object, items);
    if (!item) break;
    const fixture = waterFixtureOf(item.catalogId);
    const group = fixture && itemGroup(hit.object, item.id);
    if (fixture && group && hitsWater(fixture, item, group.worldToLocal(local.copy(hit.point)))) {
      return { kind: 'water', item, fixture };
    }
    if (doors && isArticulated(item.catalogId)) return { kind: 'item', item };
    break; // first visible surface blocks the ray
  }
  if (vanDoor) return { kind: 'vanDoor', door: vanDoor.door };
  return { kind: 'lights' };
}

export function hintFor(target: AimTarget): string {
  switch (target.kind) {
    case 'item': {
      const noun = PART_NOUN[target.item.catalogId] ?? 'puerta';
      return `E · ${target.item.isOpen ? 'Cerrar' : 'Abrir'} ${noun}`;
    }
    case 'water': {
      const label = WATER_FIXTURE_LABEL[target.fixture];
      return `E · ${useInteractionStore.getState().runningWater[target.item.id] ? label.off : label.on}`;
    }
    case 'vanDoor':
      return `E · ${useInteractionStore.getState().vanDoors[target.door] ? 'Cerrar' : 'Abrir'} ${VAN_DOOR_NOUN[target.door]}`;
    case 'lights': {
      const on = useProjectStore.getState().interiorFinish.ledStrips;
      return on ? 'E · Apagar luces' : 'E · Encender luces';
    }
  }
}

export function interact(target: AimTarget): void {
  const store = useProjectStore.getState();
  switch (target.kind) {
    case 'item':
      store.setItemOpen(target.item.id, !target.item.isOpen);
      break;
    case 'water':
      useInteractionStore.getState().toggleRunningWater(target.item.id);
      break;
    case 'vanDoor':
      useInteractionStore.getState().toggleVanDoor(target.door);
      break;
    case 'lights':
      store.setInteriorFinish({ ledStrips: !store.interiorFinish.ledStrips });
      break;
  }
}
