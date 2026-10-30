import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, Vector3 } from 'three';
import { requestContactShadowRefresh } from './contactShadowRefresh';

// Below this extent an axis is treated as flat and not stretched
const MIN_EXTENT_M = 1e-4;

interface FurnitureModelProps {
  url: string;
  width: number; // metres
  height: number;
  depth: number;
}

const axisScale = (target: number, size: number): number =>
  Number.isFinite(size) && size > MIN_EXTENT_M ? target / size : 1;

// A catalogue .glb fitted to the module's box: each axis scaled to width/height/depth,
// centred in X and Z, base on the pivot (Y = 0), so collisions (its shape is the module box,
// utils/shapes/itemShape.ts) match what is drawn. Picked through its own meshes (FurnitureItem).
export function FurnitureModel({ url, width, height, depth }: FurnitureModelProps) {
  const { scene } = useGLTF(url);

  // One clone per instance: the cached glTF scene can only have one parent.
  // Geometry and materials stay shared with the cache (they are never mutated here).
  const model = useMemo(() => {
    const object = scene.clone(true);
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(object);
    return { object, size: bounds.getSize(new Vector3()), center: bounds.getCenter(new Vector3()), minY: bounds.min.y };
  }, [scene]);

  // The baked contact shadow still shows the fallback box until it is re-rendered
  useLayoutEffect(() => {
    requestContactShadowRefresh();
  }, [model]);

  const sx = axisScale(width, model.size.x);
  const sy = axisScale(height, model.size.y);
  const sz = axisScale(depth, model.size.z);

  return (
    <group scale={[sx, sy, sz]} position={[-model.center.x * sx, -model.minY * sy, -model.center.z * sz]}>
      <primitive object={model.object} />
    </group>
  );
}
