import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { MOUSE, TOUCH } from 'three';
import { useViewStore } from '../../store/useViewStore';
import { DEFAULT_PERSPECTIVE_POSE, isOrthographicView } from '../../utils/cameraViews';
import { useRef } from 'react';
import { useViewTransition } from './useViewTransition';
import { WalkthroughController } from './walkthrough/WalkthroughController';
import { VIEW_LAYERS } from './sceneLayers';

const FOV_DEG = 45;
const NEAR_M = 0.05;
const FAR_M = 200;
const ORTHO_START_POSITION: [number, number, number] = [0, 10, 0];
const PERSPECTIVE_START_POSITION: [number, number, number] = [...DEFAULT_PERSPECTIVE_POSE.position];

// Orthographic views are 2D drawings: any drag pans, wheel zooms, no rotation
const ORTHO_MOUSE = { LEFT: MOUSE.PAN, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN };
const ORTHO_TOUCH = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
// Perspective: left orbits, middle (wheel button) or right drag pans around the space, wheel zooms
const ORBIT_MOUSE = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: MOUSE.PAN,
  RIGHT: MOUSE.PAN,
};
const ORBIT_TOUCH = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

// Active camera (perspective or orthographic) plus the OrbitControls bound to it.
// Swapping the makeDefault camera makes drei rebuild OrbitControls (and TransformControls)
// for the new camera; useViewTransition then hands the framing over and animates to the preset.
export function CameraRig() {
  const view = useViewStore((state) => state.view);
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  // The design camera is frozen while walking: the walkthrough camera restores it on exit, so it
  // must not be swapped underneath (a view change requested meanwhile applies afterwards)
  const frozenView = useRef(view);
  if (!isWalkthrough) frozenView.current = view;
  const ortho = isOrthographicView(frozenView.current);

  useViewTransition();

  return (
    <>
      {ortho ? (
        <OrthographicCamera
          makeDefault
          layers={VIEW_LAYERS}
          near={NEAR_M}
          far={FAR_M}
          position={ORTHO_START_POSITION}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          // Default layer plus overlays (gizmo, CoG, dimensions)
          layers={VIEW_LAYERS}
          fov={FOV_DEG}
          near={NEAR_M}
          far={FAR_M}
          position={PERSPECTIVE_START_POSITION}
        />
      )}

      {isWalkthrough ? (
        <WalkthroughController />
      ) : (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          enableRotate={!ortho}
          mouseButtons={ortho ? ORTHO_MOUSE : ORBIT_MOUSE}
          touches={ortho ? ORTHO_TOUCH : ORBIT_TOUCH}
          minDistance={1}
          maxDistance={30}
          minZoom={5}
          maxZoom={3000}
          // Elevations sit exactly at the horizon, so the floor clamp only applies in perspective
          maxPolarAngle={ortho ? Math.PI : Math.PI / 2 - 0.02}
        />
      )}
    </>
  );
}
