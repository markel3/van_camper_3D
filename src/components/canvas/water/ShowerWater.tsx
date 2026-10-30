import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PlaneGeometry, Vector3, type Group } from 'three';
import { GRAVITY, createDropletGeometry, createDropletMaterial, dropletDrawCount, setDropletBounds } from './dropletField';
import { createFilmMaterial, createFilmUniforms } from './waterSurface';
import { OPEN_OFF, advanceWaterClock, dropletScale, isShown, noRaycast, updateDropletView, useWaterClock } from './waterClock';

// Running shower (prop space of the shower cabin): rain from the head's nozzle disc, splash
// droplets where each drop lands (tray or the toilet lid), and a wet, rippling film on the tray.
// A low-flow camper head: drops leave at ≈ 2.4 m/s in a ±22° cone and reach the tray at
// √(v0² + 2gh) ≈ 6 m/s; at that speed the eye sees streaks of about 13 cm.

const EXIT_SPEED_MPS = 2.4;
const SPREAD_TAN = Math.tan((22 * Math.PI) / 180);
const DROP_GROUPS = 1600; // drops in flight at full quality (each with two splash droplets)
const SPLASH_PER_DROP = 2;
const DROP_R_M = 0.0007;
const SPLASH_R_M = 0.00045;
const SPLASH_SPEED_MPS = 1.1;
const WALL_MARGIN_M = 0.01;

export interface Rect2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface ShowerWaterProps {
  running: boolean;
  nozzle: { x: number; y: number; z: number; r: number }; // centre and radius of the nozzle disc
  tray: Rect2 & { y: number }; // wet floor inside the cabin
  obstacle?: Rect2 & { top: number }; // raised surface on the tray (toilet)
  seed?: number;
}

export function ShowerWater({ running, nozzle, tray, obstacle, seed = 11 }: ShowerWaterProps) {
  const group = useRef<Group | null>(null);
  const clock = useWaterClock();
  const runningRef = useRef(running);
  runningRef.current = running;

  const droplets = useMemo(createDropletMaterial, []);
  const dropGeometry = useMemo(() => createDropletGeometry(DROP_GROUPS, 1, SPLASH_PER_DROP, seed), [seed]);
  const filmUniforms = useMemo(createFilmUniforms, []);
  const film = useMemo(() => createFilmMaterial(filmUniforms), [filmUniforms]);
  const trayW = tray.maxX - tray.minX;
  const trayD = tray.maxZ - tray.minZ;
  const filmGeometry = useMemo(() => new PlaneGeometry(trayW, trayD).rotateX(-Math.PI / 2), [trayW, trayD]);
  useEffect(() => () => [droplets, dropGeometry, film].forEach((resource) => resource.dispose()), [droplets, dropGeometry, film]);
  useEffect(() => () => filmGeometry.dispose(), [filmGeometry]);

  const height = nozzle.y - tray.y;
  const trayCx = (tray.minX + tray.maxX) / 2;
  const trayCz = (tray.minZ + tray.maxZ) / 2;
  const { minX, maxX, minZ, maxZ } = tray;
  const obstacleKey = obstacle ? [obstacle.minX, obstacle.maxX, obstacle.minZ, obstacle.maxZ, obstacle.top].join(',') : '';
  useEffect(() => {
    const u = droplets.uniforms;
    u.uPointMode.value = 0;
    u.uOrigin.value.set(nozzle.x, nozzle.y, nozzle.z);
    u.uNozzleR.value = nozzle.r;
    u.uSpeed.value = EXIT_SPEED_MPS;
    u.uSpread.value = SPREAD_TAN;
    u.uBoxMin.value.set(minX + WALL_MARGIN_M, minZ + WALL_MARGIN_M);
    u.uBoxMax.value.set(maxX - WALL_MARGIN_M, maxZ - WALL_MARGIN_M);
    u.uFloorY.value = tray.y;
    if (obstacle) {
      u.uObstacle.value.set(obstacle.minX, obstacle.minZ, obstacle.maxX, obstacle.maxZ);
      u.uObstacleY.value = obstacle.top;
    } else {
      u.uObstacle.value.set(1e3, 1e3, -1e3, -1e3);
    }
    u.uDropR.value = DROP_R_M;
    u.uSplashR.value = SPLASH_R_M;
    u.uSplashSpeed.value = SPLASH_SPEED_MPS;
    setDropletBounds(dropGeometry, new Vector3(trayCx, (nozzle.y + tray.y) / 2, trayCz), Math.hypot(maxX - minX, height, maxZ - minZ) / 2 + 0.1);
    // Rings fall mostly under the head, inside the tray
    filmUniforms.uSteady.value = 0;
    const reach = nozzle.r + height * SPREAD_TAN * 0.7;
    filmUniforms.uRippleCentre.value.set(nozzle.x - trayCx, nozzle.z - trayCz);
    filmUniforms.uRippleSpread.value.set(Math.min(reach, (maxX - minX) / 2), Math.min(reach, (maxZ - minZ) / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droplets, dropGeometry, filmUniforms, nozzle.x, nozzle.y, nozzle.z, nozzle.r, minX, maxX, minZ, maxZ, tray.y, obstacleKey, height, trayCx, trayCz]);

  // Slowest drop: straight down at the lowest exit speed
  const settle = (-EXIT_SPEED_MPS * 0.8 + Math.sqrt((EXIT_SPEED_MPS * 0.8) ** 2 + 2 * GRAVITY * height)) / GRAVITY + 0.4;

  useFrame((state, delta) => {
    const root = group.current;
    if (!root) return;
    const c = clock.current;
    const active = advanceWaterClock(c, runningRef.current, delta, settle);
    if (root.visible !== active) root.visible = active;
    if (!active || !isShown(root)) return;

    const u = droplets.uniforms;
    u.uTime.value = c.time;
    u.uOn.value = c.on;
    u.uOff.value = c.off;
    updateDropletView(droplets, state.size.height * state.viewport.dpr);
    dropGeometry.setDrawRange(0, dropletDrawCount(Math.ceil(DROP_GROUPS * dropletScale()), 1, SPLASH_PER_DROP));

    // Rings start when the first drops land and stop with the last ones
    const firstFall = settle - 0.4;
    filmUniforms.uTime.value = c.time;
    filmUniforms.uOn.value = c.on + firstFall * 0.6;
    filmUniforms.uOff.value = c.off < OPEN_OFF ? c.off + firstFall : OPEN_OFF;
    filmUniforms.uWaterAlpha.value = c.wet;
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={dropGeometry} material={droplets} raycast={noRaycast} renderOrder={3} />
      <mesh geometry={filmGeometry} material={film} position={[trayCx, tray.y + 0.0015, trayCz]} raycast={noRaycast} renderOrder={1} />
    </group>
  );
}
