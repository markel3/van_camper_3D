import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import type { PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import { useProjectStore } from '../../../store/useProjectStore';
import { mmToM } from '../../../utils/unitConverters';
import {
  CEILING_CLEARANCE_M,
  EYE_HEIGHT_M,
  RUN_SPEED_MPS,
  VELOCITY_RESPONSE,
  WALK_FAR_M,
  WALK_FOV_DEG,
  WALK_NEAR_M,
  WALK_SPEED_MPS,
  AIM_REFRESH_MS,
} from './walkConstants';
import { buildWalkWorld, findSpawn, floorHeightAt, resolvePosition, type WalkWorld } from './walkCollision';
import { aimHint, notifyPose, playerPose } from './walkStore';
import { aimTarget, hintFor, interact } from './walkInteraction';
import { useWalkInput } from './useWalkInput';

const START_YAW = Math.PI; // looking towards the rear doors (+Z)
const FLOOR_RESPONSE = 10; // eye follows step-ups smoothly

// Builds the collision world from the store and keeps it current while walking
function useWalkWorld(): RefObject<WalkWorld> {
  const initial = useMemo(() => {
    const { van, items } = useProjectStore.getState();
    return buildWalkWorld(van, items);
  }, []);
  const world = useRef(initial);
  useEffect(
    () =>
      useProjectStore.subscribe((state, previous) => {
        if (state.van !== previous.van || state.items !== previous.items) {
          world.current = buildWalkWorld(state.van, state.items);
        }
      }),
    [],
  );
  return world;
}

// The selection gizmo must not appear in the walkthrough: clicks used for looking around would
// otherwise select modules
function useSuspendSelection(): void {
  useEffect(() => {
    useProjectStore.getState().select(null);
    return useProjectStore.subscribe((state) => {
      if (state.selectedId) state.select(null);
    });
  }, []);
}

// First-person walkthrough camera (CameraRig mounts it instead of the OrbitControls).
// The player lives in van space; VanScene shifts van space by −L/2 on Z into world space.
export function WalkthroughController() {
  const cameraRef = useRef<ThreePerspectiveCamera>(null);
  const scene = useThree((state) => state.scene);
  const world = useWalkWorld();
  const input = useWalkInput(START_YAW);
  const motion = useRef({ vx: 0, vz: 0, floor: 0, handledInteract: 0, lastAimMs: -Infinity });

  useSuspendSelection();

  // Spawn in the centre aisle by the sliding door, looking towards the rear
  useEffect(() => {
    const spawn = findSpawn(world.current);
    playerPose.x = spawn.x;
    playerPose.z = spawn.z;
    playerPose.yaw = START_YAW;
    input.current.yaw = START_YAW;
    input.current.pitch = 0;
    notifyPose();
    return () => aimHint.set('');
  }, [world, input]);

  useFrame((_, rawDelta) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const dt = Math.min(rawDelta, 0.1);
    const { keys, yaw, pitch } = input.current;
    const m = motion.current;

    const forward =
      (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe =
      (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN_SPEED_MPS : WALK_SPEED_MPS;
    const length = Math.hypot(forward, strafe) || 1;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    // forward = (−sin, −cos), right = (cos, −sin) in XZ
    const targetVx = ((-sin * forward + cos * strafe) / length) * speed;
    const targetVz = ((-cos * forward - sin * strafe) / length) * speed;
    const blend = 1 - Math.exp(-VELOCITY_RESPONSE * dt);
    m.vx += (targetVx - m.vx) * blend;
    m.vz += (targetVz - m.vz) * blend;

    const next = { x: playerPose.x + m.vx * dt, z: playerPose.z + m.vz * dt };
    resolvePosition(next, world.current);
    // Kill the velocity component a wall absorbed, so sliding does not build up against it
    if (dt > 0) {
      m.vx = (next.x - playerPose.x) / dt;
      m.vz = (next.z - playerPose.z) / dt;
    }
    playerPose.x = next.x;
    playerPose.z = next.z;
    playerPose.yaw = yaw;

    const { van } = useProjectStore.getState();
    const cargoH = mmToM(van.interiorHeightMM);
    const floor = floorHeightAt(next.x, next.z, world.current);
    m.floor += (floor - m.floor) * (1 - Math.exp(-FLOOR_RESPONSE * dt));
    const eye = Math.min(m.floor + EYE_HEIGHT_M, cargoH - CEILING_CLEARANCE_M);
    camera.position.set(next.x, eye, next.z - mmToM(van.interiorLengthMM) / 2);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
    notifyPose();

    // [E] presses and the aim hint (throttled raycast)
    const now = performance.now();
    if (input.current.interactRequests !== m.handledInteract) {
      m.handledInteract = input.current.interactRequests;
      interact(aimTarget(camera, scene));
      m.lastAimMs = -Infinity;
    }
    if (now - m.lastAimMs >= AIM_REFRESH_MS) {
      m.lastAimMs = now;
      aimHint.set(hintFor(aimTarget(camera, scene)));
    }
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      // Default layer only: gizmo, CoG marker and dimension overlays stay hidden from inside
      fov={WALK_FOV_DEG}
      near={WALK_NEAR_M}
      far={WALK_FAR_M}
    />
  );
}
