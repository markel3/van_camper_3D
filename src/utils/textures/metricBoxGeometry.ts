import { BoxGeometry } from 'three';

// Box whose UVs are measured in metres instead of 0-1 per face, so a tiled texture keeps its
// physical scale on any module size (textures set repeat = 1 / tile size). Without this the grain
// of a 2 m bed and a 0.3 m drawer would be stretched to the same number of rings.
export function createMetricBoxGeometry(width: number, height: number, depth: number): BoxGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute('uv');
  // BoxGeometry face order (4 vertices each): +X, −X, +Y, −Y, +Z, −Z, as [U size, V size].
  // On ±X faces U runs along Z, on ±Y faces V runs along Z.
  const faceSizes: readonly (readonly [number, number])[] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  faceSizes.forEach(([uSize, vSize], face) => {
    for (let vertex = face * 4; vertex < face * 4 + 4; vertex++) {
      uv.setXY(vertex, uv.getX(vertex) * uSize, uv.getY(vertex) * vSize);
    }
  });
  uv.needsUpdate = true;
  return geometry;
}
