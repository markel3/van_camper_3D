import type { VanSpec } from '../types/camper.types';
import type { BoxedItem } from './collisionBoxes';
import { analyzeFit, nestedIds } from './fitAdaptation';
import { addYaw, carryRiders, findRiders, type CarriedPose } from './stackCarry';

// Nest carry: devices nested inside a container (fitAdaptation.ts: battery under the bed, tank in a
// chest) travel rigidly with it when it is moved or turned, in the same undo step. The container's
// translation and yaw change are applied about its pivot exactly as for decor riders
// (stackCarry.ts): x' = x·cos θ + z·sin θ, z' = −x·sin θ + z·cos θ, Y shifted by the same dy.
// Removing or resizing the container leaves its devices where they are (they may then collide).
// Locked devices are carried too: the lock stops the user dragging the item, not its host moving.

const roundToMicron = (m: number): number => Math.round(m * 1e6) / 1e6;

// Ids of the devices nested inside `hostId` in the current scene
export function findNested(van: VanSpec, items: readonly BoxedItem[], hostId: string): string[] {
  return nestedIds(analyzeFit(van, items), hostId);
}

// New poses of the devices nested in `hostId` once it becomes `next`. Only changed poses are returned.
export function carryNested(
  van: VanSpec,
  items: readonly BoxedItem[],
  hostId: string,
  next: BoxedItem,
): Map<string, CarriedPose> {
  const result = new Map<string, CarriedPose>();
  const host = items.find((item) => item.id === hostId);
  if (!host) return result;
  const ids = new Set(findNested(van, items, hostId));
  if (ids.size === 0) return result;

  const dYaw = next.rotation.y - host.rotation.y;
  const cos = Math.cos(dYaw);
  const sin = Math.sin(dYaw);
  for (const device of items) {
    if (!ids.has(device.id)) continue;
    const ox = device.position.x - host.position.x;
    const oz = device.position.z - host.position.z;
    const position = {
      x: roundToMicron(next.position.x + ox * cos + oz * sin),
      y: roundToMicron(device.position.y + next.position.y - host.position.y),
      z: roundToMicron(next.position.z - ox * sin + oz * cos),
    };
    const rotation = dYaw === 0 ? device.rotation : { ...device.rotation, y: addYaw(device.rotation.y, dYaw) };
    const { x, y, z } = device.position;
    if (position.x === x && position.y === y && position.z === z && rotation.y === device.rotation.y) continue;
    result.set(device.id, { position, rotation });
  }
  return result;
}

// Everything that travels with module `id` when it becomes `next` (or is removed: `next` = null):
// decor resting on it (stackCarry.ts) and devices nested inside it
export function carryDependents(
  van: VanSpec,
  items: readonly BoxedItem[],
  id: string,
  next: BoxedItem | null,
): Map<string, CarriedPose> {
  const riders = carryRiders(items, id, next);
  if (!next) return riders;
  return new Map([...riders, ...carryNested(van, items, id, next)]);
}

// Ids of every module carried with `support` (riders and nested devices), e.g. to re-sync a live drag
export function findDependents(van: VanSpec, items: readonly BoxedItem[], support: BoxedItem): string[] {
  return [...findRiders(items, support), ...findNested(van, items, support.id)];
}
