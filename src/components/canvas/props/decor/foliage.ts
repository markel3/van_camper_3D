import { Shape, ShapeGeometry, TubeGeometry, type BufferGeometry, type Matrix4 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { VINE_STEM_R_M, growVines, type VineOptions } from '../../../../utils/shapes/vines';

export type { VineOptions };

// Procedural trailing foliage (pothos-like vines) for hanging and shelf plants: thin stems merged
// into one geometry and leaf transforms for a single InstancedMesh.

// Heart-shaped leaf, 1 unit long along +Y from the petiole, lying in the XY plane, slightly cupped
export function createLeafGeometry(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.45, -0.05, 0.6, 0.45, 0.25, 0.75);
  shape.bezierCurveTo(0.12, 0.88, 0.04, 0.95, 0, 1);
  shape.bezierCurveTo(-0.04, 0.95, -0.12, 0.88, -0.25, 0.75);
  shape.bezierCurveTo(-0.6, 0.45, -0.45, -0.05, 0, 0);
  const geometry = new ShapeGeometry(shape, 6);
  // Cup the blade along its midrib
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    position.setZ(i, x * x * 0.35);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface VineSet {
  stems: BufferGeometry;
  leaves: Matrix4[];
}

// Vines spilling over a pot rim and hanging down (paths from utils/shapes/vines.ts, shared with
// the collision shape): thin stems merged into one geometry, leaf transforms for an InstancedMesh
export function createVines(options: VineOptions): VineSet {
  const { curves, leaves } = growVines(options);
  const stems = curves.map((curve) => new TubeGeometry(curve, 24, VINE_STEM_R_M, 4));
  const merged = mergeGeometries(stems) ?? stems[0]!;
  stems.forEach((stem) => stem !== merged && stem.dispose());
  return { stems: merged, leaves };
}
