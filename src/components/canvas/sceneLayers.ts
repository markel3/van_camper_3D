import { Layers } from 'three';

// Overlays (gizmo, CoG marker, dimension lines) live only on this layer. Cameras that should draw
// them enable it; the contact-shadow camera keeps the default layer 0, so overlays never cast.
export const OVERLAY_LAYER = 1;

const layersOf = (...channels: number[]): Layers => {
  const layers = new Layers();
  layers.disableAll();
  channels.forEach((channel) => layers.enable(channel));
  return layers;
};

// R3F copies the mask of a Layers prop, so these shared instances are never mutated by objects
export const OVERLAY_LAYERS = layersOf(OVERLAY_LAYER);
export const VIEW_LAYERS = layersOf(0, OVERLAY_LAYER);
