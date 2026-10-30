import { useRef } from 'react';
import { useFrame, type RootState } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, Quaternion, Vector3, type Camera } from 'three';
import { useViewStore } from '../../store/useViewStore';
import { useProjectStore } from '../../store/useProjectStore';
import { vehicleBoundsWorld } from '../../utils/vanLayout';
import {
  computeViewPose,
  easeInOutCubic,
  perspectiveDistanceForHeight,
  perspectiveVisibleHeight,
} from '../../utils/cameraViews';

const TRANSITION_MS = 500;
const MIN_PERSPECTIVE_DISTANCE_M = 1;
const MAX_PERSPECTIVE_DISTANCE_M = 30;

// Runtime members of three-stdlib's OrbitControls this hook relies on
interface OrbitLike {
  object: Camera;
  target: Vector3;
}

interface PoseSnapshot {
  position: Vector3;
  target: Vector3;
  zoom: number;
  // Height in metres visible at the target plane; hands framing over between camera types
  visibleHeightM: number;
}

interface Transition {
  startMs: number;
  from: PoseSnapshot;
  to: PoseSnapshot;
}

const newSnapshot = (): PoseSnapshot => ({ position: new Vector3(), target: new Vector3(), zoom: 1, visibleHeightM: 1 });

function capture(camera: Camera, orbit: OrbitLike, out: PoseSnapshot): PoseSnapshot {
  out.position.copy(camera.position);
  out.target.copy(orbit.target);
  if (camera instanceof OrthographicCamera) {
    out.zoom = camera.zoom;
    out.visibleHeightM = (camera.top - camera.bottom) / camera.zoom;
  } else if (camera instanceof PerspectiveCamera) {
    out.zoom = 1;
    out.visibleHeightM = perspectiveVisibleHeight(camera.position.distanceTo(orbit.target), camera.fov);
  }
  return out;
}

// Places a freshly activated camera where the previous one was, with matching framing
function adopt(camera: Camera, orbit: OrbitLike, previous: PoseSnapshot, viewportHeightPx: number): void {
  orbit.target.copy(previous.target);
  if (camera instanceof OrthographicCamera) {
    camera.position.copy(previous.position);
    camera.zoom = viewportHeightPx / previous.visibleHeightM;
    camera.updateProjectionMatrix();
  } else if (camera instanceof PerspectiveCamera) {
    const distance = Math.min(
      MAX_PERSPECTIVE_DISTANCE_M,
      Math.max(MIN_PERSPECTIVE_DISTANCE_M, perspectiveDistanceForHeight(previous.visibleHeightM, camera.fov)),
    );
    const direction = previous.position.clone().sub(previous.target).normalize();
    camera.position.copy(previous.target).addScaledVector(direction, distance);
  }
  camera.lookAt(orbit.target);
}

function goalSnapshot(state: RootState): PoseSnapshot {
  const { view } = useViewStore.getState();
  const { van } = useProjectStore.getState();
  const pose = computeViewPose(view, vehicleBoundsWorld(van), state.size);
  const snapshot = newSnapshot();
  snapshot.position.set(...pose.position);
  snapshot.target.set(...pose.target);
  snapshot.zoom = pose.zoom;
  return snapshot;
}

const scratchFromDir = new Vector3();
const scratchToDir = new Vector3();
const IDENTITY = new Quaternion();
const fullTurn = new Quaternion();
const stepTurn = new Quaternion();

// Writes the eased in-between pose: target lerp, view direction slerp, distance lerp, log-zoom lerp
function applyStep(camera: Camera, orbit: OrbitLike, { from, to }: Transition, eased: number): void {
  orbit.target.lerpVectors(from.target, to.target, eased);
  scratchFromDir.subVectors(from.position, from.target);
  scratchToDir.subVectors(to.position, to.target);
  const distance = scratchFromDir.length() + (scratchToDir.length() - scratchFromDir.length()) * eased;
  scratchFromDir.normalize();
  fullTurn.setFromUnitVectors(scratchFromDir, scratchToDir.normalize());
  // slerpQuaternions copies its first argument into `this` first, so source and result must differ
  stepTurn.slerpQuaternions(IDENTITY, fullTurn, eased);
  camera.position.copy(orbit.target).addScaledVector(scratchFromDir.applyQuaternion(stepTurn), distance);
  if (camera instanceof OrthographicCamera) {
    camera.zoom = from.zoom * (to.zoom / from.zoom) ** eased;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(orbit.target);
}

// Drives the camera to the active view preset. Runs after OrbitControls' own update (priority -1),
// so the pose written here is what gets rendered this frame.
export function useViewTransition(): void {
  const handledCamera = useRef<Camera | null>(null);
  const handledOrbit = useRef<OrbitLike | null>(null);
  const handledRequestId = useRef(-1);
  const lastPose = useRef<PoseSnapshot | null>(null);
  const transition = useRef<Transition | null>(null);

  useFrame((state) => {
    const { camera } = state;
    const orbit = state.controls as unknown as OrbitLike | null;
    // Wait until OrbitControls has re-bound to the active camera (it is set in a passive effect)
    if (!orbit || orbit.object !== camera) return;

    // OrbitControls rebuilt on the same camera (e.g. after the walkthrough, which unmounts them):
    // a fresh instance targets the origin, so put back the pose the camera had before
    if (orbit !== handledOrbit.current) {
      if (handledOrbit.current && camera === handledCamera.current && lastPose.current) {
        orbit.target.copy(lastPose.current.target);
        camera.position.copy(lastPose.current.position);
        camera.lookAt(orbit.target);
      }
      handledOrbit.current = orbit;
    }

    const { viewRequestId } = useViewStore.getState();
    const cameraChanged = camera !== handledCamera.current;
    if (cameraChanged || viewRequestId !== handledRequestId.current) {
      const firstFrame = handledCamera.current === null;
      if (cameraChanged && lastPose.current) adopt(camera, orbit, lastPose.current, state.size.height);
      handledCamera.current = camera;
      handledRequestId.current = viewRequestId;
      const to = goalSnapshot(state);
      const from = capture(camera, orbit, newSnapshot());
      transition.current = { startMs: performance.now(), from, to };
      // On mount, snap straight to the default pose instead of animating from drei's defaults
      if (firstFrame) transition.current.startMs = -Infinity;
    }

    const active = transition.current;
    if (active) {
      const progress = Math.min(1, (performance.now() - active.startMs) / TRANSITION_MS);
      applyStep(camera, orbit, active, easeInOutCubic(progress));
      if (progress >= 1) transition.current = null;
    }

    lastPose.current = capture(camera, orbit, lastPose.current ?? newSnapshot());
  });
}
