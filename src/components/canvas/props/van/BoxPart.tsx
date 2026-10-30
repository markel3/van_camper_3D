import type { Material } from 'three';

export type Vec3 = readonly [number, number, number];

interface BoxPartProps {
  min: Vec3;
  max: Vec3;
  material: Material;
  castShadow?: boolean;
}

// Axis-aligned box given by its corners (van space). R3F rebuilds the geometry only when the
// args change, so it is effectively memoised per dimensions.
export function BoxPart({ min, max, material, castShadow = true }: BoxPartProps) {
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  if (size.some((side) => side <= 1e-5)) return null;
  return (
    <mesh
      position={[(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]}
      material={material}
      castShadow={castShadow}
      receiveShadow
    >
      <boxGeometry args={size} />
    </mesh>
  );
}
