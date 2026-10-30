import { Suspense, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Mesh, Vector3, type Material } from 'three';
import { requestContactShadowRefresh } from '../../contactShadowRefresh';
import { ModelErrorBoundary } from '../../ModelErrorBoundary';
import type { Vec3Tuple } from '../propParts';

// CC0 decoration models (public/models/decor, see CREDITS.md), fitted uniformly into a target box
// so their proportions are kept. Loaded lazily per prop; while loading (or if a file is missing) the
// prop shows its procedural fallback, never suspending the whole scene.
export const DECOR_MODELS = {
  pottedPlant: '/models/decor/potted-plant.glb',
  trailingPlant: '/models/decor/trailing-plant.glb',
  cuttingBoard: '/models/decor/cutting-board.glb',
  books: '/models/decor/books.glb',
} as const;

interface FittedModelProps {
  url: string;
  // Target box (m): the model is scaled uniformly to fit inside it, base on y = 0, centred in X/Z
  size: Vec3Tuple;
  position?: Vec3Tuple;
  rotationY?: number;
  // Replaces every material of the model (e.g. linen on a cushion model)
  material?: Material;
}

function FittedModelInner({ url, size, position = [0, 0, 0], rotationY = 0, material }: FittedModelProps) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const object = scene.clone(true);
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (material) child.material = material;
    });
    object.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(object);
    return { object, size: bounds.getSize(new Vector3()), center: bounds.getCenter(new Vector3()), minY: bounds.min.y };
  }, [scene, material]);

  useLayoutEffect(() => {
    requestContactShadowRefresh();
  }, [model]);

  const s = Math.min(
    size[0] / Math.max(1e-4, model.size.x),
    size[1] / Math.max(1e-4, model.size.y),
    size[2] / Math.max(1e-4, model.size.z),
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={s} position={[-model.center.x * s, -model.minY * s, -model.center.z * s]}>
        <primitive object={model.object} />
      </group>
    </group>
  );
}

// A fitted model with its own Suspense/error boundary: `fallback` is drawn until it is ready
export function FittedModel(props: FittedModelProps & { fallback?: ReactNode }) {
  const fallback = props.fallback ?? null;
  return (
    <ModelErrorBoundary url={props.url} fallback={fallback}>
      <Suspense fallback={fallback}>
        <FittedModelInner {...props} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
