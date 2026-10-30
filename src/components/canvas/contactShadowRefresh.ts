import { useSyncExternalStore } from 'react';

// Contact shadows are only re-baked when the scene changes. Store changes are tracked directly;
// this signal covers changes the store doesn't see, such as a .glb model finishing loading.
let version = 0;
const listeners = new Set<() => void>();

export function requestContactShadowRefresh(): void {
  version++;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useContactShadowVersion = (): number => useSyncExternalStore(subscribe, () => version);
