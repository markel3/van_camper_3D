import { useEffect, useMemo, type DependencyList } from 'react';
import type { BufferGeometry, Material } from 'three';
import type { CategoryType } from '../../../types/camper.types';

// Inputs shared by every procedural prop, in metres. The pivot is the centre of the module's base:
// a prop must stay within [−w/2, w/2] × [0, h] × [−d/2, d/2].
export interface PropProps {
  width: number;
  height: number;
  depth: number;
  materialId: string;
  category: CategoryType;
  // Articulated modules: doors, lids or drawers drawn open (CamperItem.isOpen)
  open?: boolean;
  // Container holding devices in its open space (fitAdaptation.ts): the prop opens up or
  // ghosts the panels that would hide them
  hosting?: boolean;
  // Water fixtures (kitchen tap, shower): water running (useInteractionStore.runningWater)
  waterRunning?: boolean;
}

export type Vec3Tuple = [number, number, number];

// Geometries built once per set of dimensions and disposed when they change or the prop unmounts
export function useGeometries<T extends Record<string, BufferGeometry>>(factory: () => T, deps: DependencyList): T {
  const geometries = useMemo(factory, deps);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);
  return geometries;
}

interface PartProps {
  geometry: BufferGeometry;
  material: Material;
  position: Vec3Tuple;
  castShadow?: boolean;
}

// One static piece of a prop. Props have no pointer handlers of their own: the module's group
// (FurnitureItem) picks through these visible meshes.
export function Part({ geometry, material, position, castShadow = true }: PartProps) {
  return <mesh geometry={geometry} material={material} position={position} castShadow={castShadow} receiveShadow />;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

// RoundedBox needs a radius below half the smallest side
export const safeRadius = (radius: number, ...sides: number[]): number =>
  Math.max(0.0005, Math.min(radius, Math.min(...sides) / 2 - 0.0005));
