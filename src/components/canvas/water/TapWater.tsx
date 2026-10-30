import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PlaneGeometry, Vector3, type Group, type Mesh } from 'three';
import type { Vec3Tuple } from '../props/propParts';
import { GRAVITY, createDropletGeometry, createDropletMaterial, dropletDrawCount, setDropletBounds } from './dropletField';
import { createFilmMaterial, createFilmUniforms, createStreamGeometry, createStreamMaterial, createStreamUniforms } from './waterSurface';
import { OPEN_OFF, advanceWaterClock, dropletScale, isShown, noRaycast, updateDropletView, useWaterClock } from './waterClock';

// Running kitchen tap (prop space of the kitchen block): a laminar jet from the spout outlet to the
// basin bottom, splash droplets around the impact and a thin rippling film on the basin floor.
// About 6 l/min through a ~15 mm aerator: exit speed ≈ 0.65 m/s, so the jet thins to roughly half
// its width over a 30 cm fall and hits the basin at ≈ 2.5 m/s.

const EXIT_SPEED_MPS = 0.65;
const OUTLET_R_M = 0.0072;
const SPLASH_GROUPS = 70;
const SPLASH_SPEED_MPS = 0.55;
const SPLASH_R_M = 0.0006;
const IMPACT_R_M = 0.012;
const FILM_INSET_M = 0.004;

// Distance fallen after `t` seconds from the outlet
const fallen = (t: number, length: number): number =>
  t <= 0 ? 0 : Math.min(length, EXIT_SPEED_MPS * t + 0.5 * GRAVITY * t * t);
const fallTime = (h: number): number =>
  (-EXIT_SPEED_MPS + Math.sqrt(EXIT_SPEED_MPS ** 2 + 2 * GRAVITY * Math.max(h, 0))) / GRAVITY;

interface TapWaterProps {
  running: boolean;
  outlet: Vec3Tuple; // spout mouth
  basinY: number; // basin floor
  // Basin floor rectangle (centre and size on X/Z)
  basin: { x: number; z: number; w: number; d: number };
  seed?: number;
}

export function TapWater({ running, outlet, basinY, basin, seed = 7 }: TapWaterProps) {
  const group = useRef<Group | null>(null);
  const streamMesh = useRef<Mesh | null>(null);
  const clock = useWaterClock();
  const runningRef = useRef(running);
  runningRef.current = running;

  const streamUniforms = useMemo(createStreamUniforms, []);
  const stream = useMemo(() => createStreamMaterial(streamUniforms), [streamUniforms]);
  const streamGeometry = useMemo(() => createStreamGeometry(20), []);
  const filmUniforms = useMemo(createFilmUniforms, []);
  const film = useMemo(() => createFilmMaterial(filmUniforms), [filmUniforms]);
  const filmW = Math.max(0.01, basin.w - 2 * FILM_INSET_M);
  const filmD = Math.max(0.01, basin.d - 2 * FILM_INSET_M);
  const filmGeometry = useMemo(() => new PlaneGeometry(filmW, filmD).rotateX(-Math.PI / 2), [filmW, filmD]);
  const droplets = useMemo(createDropletMaterial, []);
  const dropGeometry = useMemo(() => createDropletGeometry(SPLASH_GROUPS, 0, 1, seed), [seed]);
  useEffect(
    () => () => [stream, streamGeometry, film, droplets, dropGeometry].forEach((resource) => resource.dispose()),
    [stream, streamGeometry, film, droplets, dropGeometry],
  );
  useEffect(() => () => filmGeometry.dispose(), [filmGeometry]);

  const [outX, outY, outZ] = outlet;
  const length = Math.max(0.02, outY - basinY);
  const impact = useMemo(() => new Vector3(outX, basinY, outZ), [outX, basinY, outZ]);
  useEffect(() => {
    setDropletBounds(dropGeometry, impact, 0.15);
    const u = droplets.uniforms;
    u.uPointMode.value = 1;
    u.uImpact.value.copy(impact);
    u.uImpactR.value = IMPACT_R_M;
    u.uSplashR.value = SPLASH_R_M;
    u.uSplashSpeed.value = SPLASH_SPEED_MPS;
    streamUniforms.uLength.value = length;
    streamUniforms.uR0.value = OUTLET_R_M;
    streamUniforms.uV0.value = EXIT_SPEED_MPS;
    filmUniforms.uSteady.value = 1;
    filmUniforms.uRippleCentre.value.set(outX - basin.x, outZ - basin.z);
    filmUniforms.uRippleSpread.value.set(0.015, 0.015);
  }, [dropGeometry, droplets, impact, length, outX, outZ, basin.x, basin.z, streamUniforms, filmUniforms]);

  useFrame((state, delta) => {
    const root = group.current;
    if (!root) return;
    const c = clock.current;
    const active = advanceWaterClock(c, runningRef.current, delta, fallTime(length) + 0.5);
    if (root.visible !== active) root.visible = active;
    if (!active || !isShown(root)) return;

    const t = c.time;
    const head = fallen(t - c.on, length);
    const tail = c.off < OPEN_OFF ? fallen(t - c.off, length) : 0;
    streamUniforms.uTime.value = t;
    streamUniforms.uHead.value = head;
    streamUniforms.uTail.value = tail;
    if (streamMesh.current) streamMesh.current.visible = head - tail > 1e-4;

    // The basin reacts once the jet reaches it, and stops when its tail has landed
    const arrive = fallTime(length);
    const u = droplets.uniforms;
    u.uTime.value = t;
    u.uOn.value = c.on + arrive;
    u.uOff.value = c.off < OPEN_OFF ? c.off + arrive : OPEN_OFF;
    updateDropletView(droplets, state.size.height * state.viewport.dpr);
    dropGeometry.setDrawRange(0, dropletDrawCount(Math.ceil(SPLASH_GROUPS * dropletScale()), 0, 1));

    filmUniforms.uTime.value = t;
    filmUniforms.uOn.value = u.uOn.value;
    filmUniforms.uOff.value = u.uOff.value;
    filmUniforms.uWaterAlpha.value = c.wet;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={streamMesh} geometry={streamGeometry} material={stream} position={[outX, outY, outZ]} raycast={noRaycast} renderOrder={2} />
      <mesh geometry={dropGeometry} material={droplets} raycast={noRaycast} renderOrder={3} />
      <mesh geometry={filmGeometry} material={film} position={[basin.x, basinY + 0.0015, basin.z]} raycast={noRaycast} renderOrder={1} />
    </group>
  );
}
