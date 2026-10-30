import { useSyncExternalStore } from 'react';

// Tiny subscribable stores for the walkthrough, outside Zustand so the 60 fps pose updates never
// re-render React: the minimap subscribes imperatively and writes SVG attributes directly.

// Player pose in van space (X across, Z = 0 at the bulkhead), yaw 0 = looking towards the cab (−Z)
export interface PlayerPose {
  x: number;
  z: number;
  yaw: number;
}

type Listener = () => void;

function createSignal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: (): T => value,
    set: (next: T): void => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type WalkSignal<T> = ReturnType<typeof createSignal<T>>;

// Mutated in place each frame, then `bump` notifies (no allocation per frame)
export const playerPose: PlayerPose = { x: 0, z: 0, yaw: Math.PI };
const poseListeners = new Set<Listener>();
export const notifyPose = (): void => poseListeners.forEach((listener) => listener());
export const subscribePose = (listener: Listener): (() => void) => {
  poseListeners.add(listener);
  return () => poseListeners.delete(listener);
};

// Contextual [E] hint under the crosshair ('' = none)
export const aimHint = createSignal('');
// Pointer captured (pointer lock or drag fallback active)
export const pointerLocked = createSignal(false);
// "Interacción de Puertas" switch: [E] opens/closes articulated modules
export const doorInteraction = createSignal(true);

export function useWalkSignal<T>(signal: WalkSignal<T>): T {
  return useSyncExternalStore(signal.subscribe, signal.get, signal.get);
}
