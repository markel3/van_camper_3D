import type { Box3 } from 'three';

// Fit adaptations (utils/fitAdaptation.ts): how a module adapts to its surroundings instead of
// colliding. Derived data: recomputed from the project, never stored or saved.

export type ArchSide = 'left' | 'right'; // driver side (−X) / passenger side (+X)

export type Adaptation =
  // The carcass is notched around a wheel arch. `box` is the removed region in van space (m);
  // `localBox` is the same region in the module-local frame (pivot at the base centre, before the
  // module's rotation), as used by the 3D notch. `boards`: the boxing boards closing the notch
  // (module-local), solid parts of the module drawn by canvas/adapt/NotchBoxing.
  | { kind: 'archNotch'; side: ArchSide; box: Box3; localBox: Box3; boards: Box3[] }
  // This container holds devices inside its open space (battery under the bed, tank in a chest)
  | { kind: 'hosts'; itemIds: string[] }
  // This device is installed inside the open space of `hostId`
  | { kind: 'nestedIn'; hostId: string };
