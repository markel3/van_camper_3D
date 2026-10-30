import { Box3, Vector3 } from 'three';
import type { Adaptation, ArchSide } from '../types/adaptation.types';
import type { VanSpec } from '../types/camper.types';
import { fitProfileOf } from '../data/fitProfiles';
import { isDecor, itemBox, overlaps, wheelArchBoxes, type BoxedItem } from './collisionBoxes';
import { isRoofMounted } from './roofMount';
import { itemOpenSpace, itemParts } from './shapes/itemShape';
import { notchBoards } from './shapes/notchBoards';
import { localToVanBox, subtractBox, unionOf, vanToLocalBox } from './shapes/shapeBox';
import { mmToM } from './unitConverters';

// Fit adaptation (WORKFLOWS.md, Flow 3) on the modules' real shapes (utils/shapes): in a camper,
// furniture is adjusted to the van instead of being placed as rigid boxes. Pure rules, no React;
// per-module data in data/fitProfiles.ts.
//
// 1. Wheel-arch notch. A module with `archUsableTopM` one of whose parts overlaps a wheel arch is
//    notched around it when both hold:
//    - the arch top + ARCH_MIN_CLEARANCE_M (20 mm: 5 mm gap + 12 mm boxing board + margin) is at or
//      below the module's working surface (bed platform, chest lid, worktop);
//    - the notch removes at most MAX_NOTCH_FOOTPRINT_SHARE (50 %) of the module's plan footprint.
//    The notch is the arch ∩ module region grown by NOTCH_GAP_M on its inner faces and clipped to
//    the module box. Every part is split around it and boxing boards (shapes/notchBoards.ts) close
//    it, exactly as drawn (canvas/adapt). Otherwise the parts that touch the arch collide with it.
//    A loose standing board (profile `panel`) is jigsawed instead: no surface rule, no boxing boards,
//    and the cut may take up to MAX_PANEL_NOTCH_SHARE (60 %) of its face.
// 2. Nesting. A `nestable` device lying inside a module's open space (ItemShape.openSpace: bays
//    under a bed, inside a chest) within NEST_TOLERANCE_M, and overlapping none of its parts, is
//    nested in it (no collision: they simply do not touch). It travels with its host (nestCarry.ts).
//    A device that overlaps a host part (a post, a panel) is a plain collision.
// Both rules apply to interior (non-roof, non-decor) modules. A module with adaptToFit === false is
// rigid: it is never notched and takes no part in nesting (no hosting link, no carry). Collisions
// still follow its real shape, so a device standing in its open space does not collide either.

export const ARCH_MIN_CLEARANCE_M = 0.02;
export const MAX_NOTCH_FOOTPRINT_SHARE = 0.5;
export const MAX_PANEL_NOTCH_SHARE = 0.6;
export const NOTCH_GAP_M = 0.005;
export const NEST_TOLERANCE_M = 0.005;

const EPS = 1e-6;
const AXES = ['x', 'y', 'z'] as const;
const ARCH_SIDES: readonly ArchSide[] = ['left', 'right'];

export interface ArchNotch {
  archIndex: number; // index in wheelArchBoxes(van)
  side: ArchSide;
  box: Box3; // van space
  localBox: Box3; // module-local frame
  boards: Box3[]; // boxing boards, module-local frame
}

export interface FitAnalysis {
  notches: Map<string, ArchNotch[]>; // module id → notches
  hostOf: Map<string, string>; // nested device id → container id
  parts: Map<string, Box3[]>; // every module's solid parts in van space, notches applied
}

const adapts = (item: BoxedItem): boolean => item.adaptToFit !== false;

export { localToVanBox, vanToLocalBox };

// The container's open storage space in van space, or null if it holds nothing
export const storageVolume = (item: BoxedItem): Box3 | null => itemOpenSpace(item);

const containedIn = (inner: Box3, outer: Box3): boolean =>
  AXES.every(
    (axis) => inner.min[axis] >= outer.min[axis] - NEST_TOLERANCE_M && inner.max[axis] <= outer.max[axis] + NEST_TOLERANCE_M,
  );

// The notch of `item` (envelope `box`) around `arch`, or null when the arch cannot be notched around
function archNotch(item: BoxedItem, box: Box3, arch: Box3, archIndex: number): ArchNotch | null {
  const profile = fitProfileOf(item.catalogId);
  if (profile?.panel) return panelNotch(item, box, arch, archIndex);
  const usableTop = profile?.archUsableTopM;
  if (!usableTop) return null;
  if (arch.max.y + ARCH_MIN_CLEARANCE_M > item.position.y + usableTop(item.dimensions) + EPS) return null;
  const cut = box.clone().intersect(arch);
  const cutSize = cut.getSize(new Vector3());
  const size = box.getSize(new Vector3());
  if ((cutSize.x * cutSize.z) / (size.x * size.z) > MAX_NOTCH_FOOTPRINT_SHARE + EPS) return null;
  const grown = new Box3(
    new Vector3(cut.min.x - NOTCH_GAP_M, box.min.y, cut.min.z - NOTCH_GAP_M),
    new Vector3(cut.max.x + NOTCH_GAP_M, cut.max.y + NOTCH_GAP_M, cut.max.z + NOTCH_GAP_M),
  ).intersect(box);
  const localBox = vanToLocalBox(item, grown);
  const boards = notchBoards(localBox, mmToM(item.dimensions.width), mmToM(item.dimensions.depth));
  return { archIndex, side: ARCH_SIDES[archIndex]!, box: grown, localBox, boards };
}

// A loose standing board cut around the arch: the notch is the arch ∩ board grown by NOTCH_GAP_M,
// measured on the board's face (its two largest sides), with no boxing boards
function panelNotch(item: BoxedItem, box: Box3, arch: Box3, archIndex: number): ArchNotch | null {
  const cut = box.clone().intersect(arch);
  const faceArea = (b: Box3): number => {
    const [, a1, a2] = b.getSize(new Vector3()).toArray().sort((x, y) => x - y);
    return (a1 ?? 0) * (a2 ?? 0);
  };
  const grown = new Box3(
    new Vector3(cut.min.x - NOTCH_GAP_M, box.min.y, cut.min.z - NOTCH_GAP_M),
    new Vector3(cut.max.x + NOTCH_GAP_M, cut.max.y + NOTCH_GAP_M, cut.max.z + NOTCH_GAP_M),
  ).intersect(box);
  if (faceArea(grown) > MAX_PANEL_NOTCH_SHARE * faceArea(box) + EPS) return null;
  return { archIndex, side: ARCH_SIDES[archIndex]!, box: grown, localBox: vanToLocalBox(item, grown), boards: [] };
}

// Real shapes, notches and nesting of the whole scene
export function analyzeFit(van: VanSpec, items: readonly BoxedItem[]): FitAnalysis {
  const notches = new Map<string, ArchNotch[]>();
  const hostOf = new Map<string, string>();
  const parts = new Map(items.map((item) => [item.id, itemParts(item)]));
  const arches = wheelArchBoxes(van);
  const adaptive = items.filter((item) => adapts(item) && !isDecor(item.catalogId) && !isRoofMounted(item.catalogId));

  for (const item of adaptive) {
    const own = parts.get(item.id)!;
    const box = itemBox(item);
    const list = arches.flatMap((arch, index) => {
      if (!own.some((piece) => overlaps(piece, arch))) return [];
      const notch = archNotch(item, box, arch, index);
      return notch ? [notch] : [];
    });
    if (list.length === 0) continue;
    notches.set(item.id, list);
    const cut = list.reduce((pieces, notch) => pieces.flatMap((piece) => subtractBox(piece, notch.box)), own);
    parts.set(item.id, [...cut, ...list.flatMap((notch) => notch.boards.map((board) => localToVanBox(item, board)))]);
  }

  const hosts = adaptive.flatMap((item) => {
    const space = itemOpenSpace(item);
    return space ? [{ id: item.id, space }] : [];
  });
  if (hosts.length === 0) return { notches, hostOf, parts };
  for (const device of adaptive) {
    if (!fitProfileOf(device.catalogId)?.nestable) continue;
    const own = parts.get(device.id)!;
    const envelope = unionOf(own);
    const host = hosts.find(
      (candidate) =>
        candidate.id !== device.id &&
        containedIn(envelope, candidate.space) &&
        !own.some((piece) => parts.get(candidate.id)!.some((other) => overlaps(piece, other))),
    );
    if (host) hostOf.set(device.id, host.id);
  }
  return { notches, hostOf, parts };
}

// True when one of the two modules is nested inside the other
export const isNestedPair = (fit: FitAnalysis, a: string, b: string): boolean =>
  fit.hostOf.get(a) === b || fit.hostOf.get(b) === a;

// Ids of the devices nested inside `hostId`
export const nestedIds = (fit: FitAnalysis, hostId: string): string[] =>
  [...fit.hostOf].filter(([, host]) => host === hostId).map(([id]) => id);

// Every module's adaptations, for the 3D view and the Inspector. Modules without any are absent.
export function findAdaptations(van: VanSpec, items: readonly BoxedItem[]): Map<string, Adaptation[]> {
  const fit = analyzeFit(van, items);
  const result = new Map<string, Adaptation[]>();
  const push = (id: string, adaptation: Adaptation) => result.set(id, [...(result.get(id) ?? []), adaptation]);
  for (const [id, list] of fit.notches) {
    for (const { side, box, localBox, boards } of list) push(id, { kind: 'archNotch', side, box, localBox, boards });
  }
  const hosted = new Map<string, string[]>();
  for (const [deviceId, hostId] of fit.hostOf) {
    hosted.set(hostId, [...(hosted.get(hostId) ?? []), deviceId]);
    push(deviceId, { kind: 'nestedIn', hostId });
  }
  for (const [hostId, itemIds] of hosted) push(hostId, { kind: 'hosts', itemIds });
  return result;
}
