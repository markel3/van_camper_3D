import type { Box3 } from 'three';

// Compound collision shape of a catalogue module (utils/shapes): the solid parts that are actually
// drawn, so collisions, surface snap and magnets match what the user sees. Derived data, never saved.
// Module-local frame: metres, pivot at the centre of the base, front towards +Z, before the
// module's own rotation. Every part lies inside the module's dimensions envelope.

export interface ShapePart {
  id: string; // stable name within the module, e.g. 'post-3', 'mattress', 'worktop'
  box: Box3;
}

export interface ItemShape {
  parts: readonly ShapePart[];
  // Hollow volume a device can be installed in (open bays under a bed, inside a chest)
  openSpace?: Box3;
}
