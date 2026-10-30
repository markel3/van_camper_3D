import { useEffect } from 'react';
import {
  Color,
  DoubleSide,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
  type Material,
  type Plane,
} from 'three';
import type { InsulationMaterialDef } from '../../../../types/camper.types';
import { getLiningTextures, getLighteningHoleMask, type LiningSetKey } from '../../../../utils/textures/liningTextures';
import { STEEL_TILE_M, FLOOR_RIB_PITCH_M, getPaintedSteelMaps, getRibbedFloorMaps } from '../../../../utils/textures/steelTextures';
import { SECTION_PLANES } from '../van/sectionCut';
import { patchDoorCut } from './doorCutPatch';

// Materials of the interior surfaces (bare shell, insulation, lining). They are owned here and never
// shared with other props, since the X-ray ghost (ghostChassis) and the section cut rewrite them.

const registry = new Map<string, Material>();
export function interiorMaterial<T extends Material>(key: string, create: () => T): T {
  let material = registry.get(key);
  if (!material) {
    material = create();
    // Open cargo doors cut every interior layer out of their opening
    patchDoorCut(material);
    registry.set(key, material);
  }
  return material as T;
}

// Section planes on every interior material (or none), keeping the X-ray backup in sync
function applyClipping(planes: readonly Plane[] | null): void {
  for (const material of registry.values()) {
    const data = material.userData as { ghost?: boolean; ghostBackup?: { clippingPlanes: Plane[] | null } };
    const target = planes ? [...planes] : null;
    if (data.ghost && data.ghostBackup) {
      data.ghostBackup.clippingPlanes = target;
      continue;
    }
    if ((material.clippingPlanes?.length ?? 0) !== (target?.length ?? 0)) material.needsUpdate = true;
    material.clippingPlanes = target;
    material.clipIntersection = true;
  }
}

// Every interior material (including ones created during this render) follows the .glb section cut
export function useInteriorClipping(clipped: boolean): void {
  useEffect(() => applyClipping(clipped ? SECTION_PLANES : null));
}

// ---- Wood (lining) ----

export interface WoodOptions {
  tint?: string; // multiplies the photo (values above white brighten through a Color > 1)
  brightness?: number;
  roughness?: number;
  vertexColors?: boolean; // per-board tone variation baked in the geometry
}

export function woodMaterial(key: LiningSetKey, grainAlong: 'u' | 'v', options: WoodOptions = {}): MeshStandardMaterial {
  const { tint = '#ffffff', brightness = 1, roughness = 1, vertexColors = false } = options;
  return interiorMaterial(`wood:${key}:${grainAlong}:${tint}:${brightness}:${roughness}:${vertexColors}`, () => {
    const set = getLiningTextures(key, grainAlong);
    return new MeshStandardMaterial({
      color: new Color(tint).multiplyScalar(brightness),
      map: set.map,
      normalMap: set.normalMap,
      normalScale: new Vector2(0.8, 0.8),
      roughnessMap: set.roughnessMap,
      roughness,
      aoMap: set.aoMap,
      vertexColors,
    });
  });
}

// ---- Painted steel (bare shell) ----

// Light grey factory paint (OEM interior primer/paint), semi-matt
export const SHELL_PAINT = '#b9bec2';

export function paintedSteel(variant: 'skin' | 'frame' | 'floor' = 'skin'): MeshStandardMaterial {
  return interiorMaterial(`steel:${variant}`, () => {
    const maps = variant === 'floor' ? getRibbedFloorMaps() : getPaintedSteelMaps();
    const normalMap = maps.normalMap.clone();
    const roughnessMap = maps.roughnessMap.clone();
    if (variant === 'floor') {
      // One rib per tile across the van (U = X), noise stretched along it
      normalMap.repeat.set(1 / FLOOR_RIB_PITCH_M, 1);
      roughnessMap.repeat.set(1 / FLOOR_RIB_PITCH_M, 0.5);
    } else {
      normalMap.repeat.setScalar(1 / STEEL_TILE_M);
      roughnessMap.repeat.setScalar(1 / STEEL_TILE_M);
    }
    normalMap.needsUpdate = true;
    roughnessMap.needsUpdate = true;
    return new MeshStandardMaterial({
      color: variant === 'floor' ? '#9da3a8' : variant === 'frame' ? '#c4c8cb' : SHELL_PAINT,
      metalness: 0.05,
      roughness: variant === 'floor' ? 0.62 : 0.48,
      normalMap,
      normalScale: new Vector2(variant === 'floor' ? 1 : 0.35, variant === 'floor' ? 1 : 0.35),
      roughnessMap,
      side: variant === 'skin' ? DoubleSide : FrontSide,
    });
  });
}

// Frame flanges with oval lightening holes (alpha cut-out). `along`: axis of the hole row.
export function perforatedSteel(along: 'u' | 'v' | 'panel', pitchM: number, widthM: number): MeshStandardMaterial {
  return interiorMaterial(`steel:holes:${along}:${pitchM}:${widthM}`, () => {
    const material = paintedSteel('frame').clone();
    const holes = getLighteningHoleMask(along).clone();
    if (along !== 'v') holes.repeat.set(1 / pitchM, 1 / widthM);
    else holes.repeat.set(1 / widthM, 1 / pitchM);
    holes.needsUpdate = true;
    material.alphaMap = holes;
    material.alphaTest = 0.5;
    material.side = DoubleSide;
    return material;
  });
}

// ---- Insulation ----

export function insulationMaterial(def: InsulationMaterialDef): Material {
  return interiorMaterial(`insul:${def.id}`, () => {
    switch (def.kind) {
      case 'closedCellFoam': {
        // Elastomeric foam: deep black, soft sheen, fine closed-cell relief
        const set = getLiningTextures('kaiflex');
        return new MeshPhysicalMaterial({
          color: def.color,
          normalMap: set.normalMap,
          normalScale: new Vector2(1.4, 1.4),
          roughness: 0.62,
          sheen: 0.35,
          sheenRoughness: 0.6,
          sheenColor: new Color('#3a3a3e'),
        });
      }
      case 'mineralWool': {
        const set = getLiningTextures('rockwool');
        return new MeshStandardMaterial({
          color: def.color,
          map: set.map,
          normalMap: set.normalMap,
          normalScale: new Vector2(2, 2),
          roughnessMap: set.roughnessMap,
          roughness: 1,
          aoMap: set.aoMap,
        });
      }
      case 'reflective':
      case 'tape': {
        // Aluminium facing: satin metal, softly crinkled (bubble foil a bit duller than tape). Kept
        // rough enough that the crinkles do not sparkle under bloom.
        const tape = def.kind === 'tape';
        const set = getLiningTextures('foil', 'v', tape ? 0.8 : 1.8);
        return new MeshStandardMaterial({
          color: tape ? '#d9dde1' : '#c9ced3',
          metalness: tape ? 0.9 : 0.75,
          roughness: tape ? 0.42 : 0.58,
          normalMap: set.normalMap,
          normalScale: new Vector2(tape ? 0.25 : 0.45, tape ? 0.25 : 0.45),
        });
      }
      case 'barrier': {
        // Translucent PE film: glossy, slightly milky, wrinkled
        const set = getLiningTextures('foil', 'v', 2);
        return new MeshPhysicalMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.38,
          depthWrite: false,
          roughness: 0.25,
          normalMap: set.normalMap,
          normalScale: new Vector2(0.4, 0.4),
          side: DoubleSide,
        });
      }
      case 'felt': {
        const set = getLiningTextures('felt');
        return new MeshStandardMaterial({
          color: def.color,
          normalMap: set.normalMap,
          normalScale: new Vector2(1.2, 1.2),
          roughness: 1,
        });
      }
    }
  });
}

export function battenMaterial(): MeshStandardMaterial {
  return woodMaterial('pine', 'v', { tint: '#f6e2c8', brightness: 1.15 });
}
