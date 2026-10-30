import { useRef, type RefObject } from 'react';
import { Color, type Object3D, type ShaderMaterial } from 'three';
import { DROP_BODY, DROP_GLINT, type DropletUniforms } from './dropletField';
import { useViewStore } from '../../../store/useViewStore';
import { useRenderQualityStore, type RenderQuality } from '../render/renderQualityStore';

// Per-fixture water timeline, advanced in the fixture's own useFrame:
// - time: seconds since the fixture last started from idle (keeps shader floats small);
// - on / off: when the water was opened / closed on that clock (off = OPEN_OFF while running);
// - wet: 0..1 wetness of the surfaces (fast to wet, slow to dry).
// The fixture is idle (nothing drawn, nothing updated) once the water is off, the last drops have
// landed and the surfaces are dry.

export const OPEN_OFF = 1e6;
const WET_RATE = 1 / 0.8; // per second
const DRY_RATE = 1 / 6;

export interface WaterClock {
  time: number;
  on: number;
  off: number;
  wet: number;
  running: boolean;
  idle: boolean;
}

export function useWaterClock(): RefObject<WaterClock> {
  return useRef<WaterClock>({ time: 0, on: 0, off: -1, wet: 0, running: false, idle: true });
}

// Advances the clock; returns false while idle. `settle`: seconds the water still needs after
// closing (last drop fall, stream tail)
export function advanceWaterClock(clock: WaterClock, running: boolean, delta: number, settle: number): boolean {
  const dt = Math.min(delta, 0.1);
  if (running && clock.idle) {
    clock.time = 0;
    clock.idle = false;
  }
  if (clock.idle) return false;
  clock.time += dt;
  if (running && !clock.running) {
    clock.on = clock.time;
    clock.off = OPEN_OFF;
  } else if (!running && clock.running) {
    clock.off = clock.time;
  }
  clock.running = running;
  clock.wet = running ? Math.min(1, clock.wet + dt * WET_RATE) : Math.max(0, clock.wet - dt * DRY_RATE);
  if (!running && clock.wet === 0 && clock.time - clock.off > settle) {
    clock.idle = true;
    return false;
  }
  return true;
}

// Whether the object and all its ancestors are visible (hidden module, hidden layer)
export function isShown(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

// Scene light reaching the water, as a 0..1+ factor for the unlit droplet shader: full in
// daylight, mostly the interior LEDs at night
export function waterLight(): number {
  const { isNight, ledIntensity } = useViewStore.getState();
  return isNight ? 0.12 + 0.55 * ledIntensity : 1;
}

// Droplet budget per render preset
export const DROPLET_SCALE: Record<RenderQuality, number> = { high: 1, balanced: 0.6, low: 0.3 };
export const dropletScale = (): number => DROPLET_SCALE[useRenderQualityStore.getState().quality];

// Per-frame view inputs of a droplet material: drawing-buffer height (pixel coverage) and light
// At night the drops catch the warm (≈ 3000 K) interior LEDs instead of the neutral studio light
const NIGHT_TINT = new Color(1, 0.78, 0.55);
export function updateDropletView(material: ShaderMaterial & { uniforms: DropletUniforms }, viewportHeightPx: number): void {
  const light = waterLight();
  const night = useViewStore.getState().isNight;
  material.uniforms.uViewportH.value = viewportHeightPx;
  material.uniforms.uBody.value.copy(DROP_BODY).multiplyScalar(light);
  material.uniforms.uGlint.value.copy(DROP_GLINT).multiplyScalar(light);
  if (night) {
    material.uniforms.uBody.value.multiply(NIGHT_TINT);
    material.uniforms.uGlint.value.multiply(NIGHT_TINT);
  }
}

// Never picked: the water is not part of the module (selection, [E] aim)
export const noRaycast = (): void => undefined;
