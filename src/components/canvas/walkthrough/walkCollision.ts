import type { CamperItem, VanSpec } from '../../../types/camper.types';
import { cargoBox, wheelArchBoxes } from '../../../utils/collisionMath';
import { itemParts } from '../../../utils/shapes/itemShape';
import { isRoofMounted } from '../../../utils/roofMount';
import { HEAD_CLEARANCE_M, PLAYER_RADIUS_M, STEP_HEIGHT_M } from './walkConstants';

// Player collision for the walkthrough: a vertical cylinder against the cargo walls and 2D (XZ)
// footprints of the modules, all in van space. Pure functions, no three.js objects per frame.

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number; // height of the top face above the cargo floor
}

export interface WalkWorld {
  bounds: Rect; // cargo box shrunk by the player radius
  solids: Rect[]; // block the player
  steps: Rect[]; // low modules the player steps onto
}

const toRect = (box: ReturnType<typeof cargoBox>): Rect => ({
  minX: box.min.x,
  maxX: box.max.x,
  minZ: box.min.z,
  maxZ: box.max.z,
  top: box.max.y,
});

export function buildWalkWorld(van: VanSpec, items: readonly CamperItem[], radius = PLAYER_RADIUS_M): WalkWorld {
  const cargo = toRect(cargoBox(van));
  const bounds = {
    minX: cargo.minX + radius,
    maxX: cargo.maxX - radius,
    minZ: cargo.minZ + radius,
    maxZ: cargo.maxZ - radius,
    top: cargo.top,
  };
  // Wheel arches always block: standing on them is not a thing
  const solids: Rect[] = wheelArchBoxes(van).map(toRect);
  const steps: Rect[] = [];
  for (const item of items) {
    if (!item.visible || isRoofMounted(item.catalogId)) continue;
    // Real shapes (utils/shapes): the player stands on the floor under a table top, not on a box
    for (const box of itemParts(item)) {
      if (box.min.y >= HEAD_CLEARANCE_M) continue; // overhead: walk under it
      (box.max.y > STEP_HEIGHT_M ? solids : steps).push(toRect(box));
    }
  }
  return { bounds, solids, steps };
}

// Pushes the circle (x, z, r) out of a rect; returns true when it moved
function pushOut(p: { x: number; z: number }, rect: Rect, r: number): boolean {
  const cx = Math.min(Math.max(p.x, rect.minX), rect.maxX);
  const cz = Math.min(Math.max(p.z, rect.minZ), rect.maxZ);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-12) {
    const d = Math.sqrt(d2);
    p.x = cx + (dx / d) * r;
    p.z = cz + (dz / d) * r;
    return true;
  }
  // Centre inside the rect: leave through the nearest face
  const exits = [p.x - rect.minX, rect.maxX - p.x, p.z - rect.minZ, rect.maxZ - p.z];
  const nearest = exits.indexOf(Math.min(...exits));
  if (nearest === 0) p.x = rect.minX - r;
  else if (nearest === 1) p.x = rect.maxX + r;
  else if (nearest === 2) p.z = rect.minZ - r;
  else p.z = rect.maxZ + r;
  return true;
}

const clampInto = (p: { x: number; z: number }, b: Rect): void => {
  p.x = b.minX <= b.maxX ? Math.min(Math.max(p.x, b.minX), b.maxX) : (b.minX + b.maxX) / 2;
  p.z = b.minZ <= b.maxZ ? Math.min(Math.max(p.z, b.minZ), b.maxZ) : (b.minZ + b.maxZ) / 2;
};

// Resolves a desired position in place: slide along modules, stay inside the cargo box.
// A few relaxation passes settle corners between neighbouring modules.
export function resolvePosition(p: { x: number; z: number }, world: WalkWorld, r = PLAYER_RADIUS_M): void {
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (const rect of world.solids) moved = pushOut(p, rect, r) || moved;
    clampInto(p, world.bounds);
    if (!moved) break;
  }
}

export function collides(x: number, z: number, world: WalkWorld, r = PLAYER_RADIUS_M): boolean {
  const p = { x, z };
  return world.solids.some((rect) => pushOut(p, rect, r));
}

// Height of the floor under the player: the top of the highest low module it stands on
export function floorHeightAt(x: number, z: number, world: WalkWorld, r = PLAYER_RADIUS_M * 0.5): number {
  let floor = 0;
  for (const s of world.steps) {
    if (x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ) floor = Math.max(floor, s.top);
  }
  return floor;
}

// Spawn point: centre aisle near the side sliding door (front of the cargo), first free spot rearwards
export function findSpawn(world: WalkWorld): { x: number; z: number } {
  const { bounds } = world;
  const centreX = (bounds.minX + bounds.maxX) / 2;
  for (let z = bounds.minZ + 0.35; z <= bounds.maxZ; z += 0.1) {
    for (const dx of [0, 0.25, -0.25, 0.45, -0.45]) {
      if (!collides(centreX + dx, z, world)) return { x: centreX + dx, z };
    }
  }
  const p = { x: centreX, z: bounds.minZ + 0.5 };
  resolvePosition(p, world);
  return p;
}
