import { useFrame } from '@react-three/fiber';
import { OVERLAY_LAYER } from '../sceneLayers';

// Render priorities around the EffectComposer (any priority > 0 takes over R3F's own render)
// Negative priorities run before the default (0) callbacks and do not take over rendering
const RESTORE_AUTOCLEAR_PRIORITY = -100;
export const HIDE_OVERLAYS_PRIORITY = 1;
export const COMPOSER_PRIORITY = 2;
export const DRAW_OVERLAYS_PRIORITY = 3;

let cameraHadOverlays = false;

// Overlays (gizmo, CoG marker, dimension lines: OVERLAY_LAYER, sceneLayers.ts) skip the
// post-processing chain: AO halos, bloom, tone mapping and vignette would make these technical
// drawings unreadable. They are hidden from the composer's camera, then drawn straight on top of
// the final image with their own colours (they are depthTest = false anyway).
// Mounted only while the EffectComposer is.
export function OverlayPass() {
  // EffectComposer leaves gl.autoClear = false between frames (autoClearGuard). Render-to-texture
  // work done in regular useFrame hooks (drei ContactShadows bakes) needs its targets cleared,
  // or nothing passes the depth test: restore it before every other frame callback.
  useFrame(({ gl }) => {
    gl.autoClear = true;
  }, RESTORE_AUTOCLEAR_PRIORITY);

  useFrame(({ camera }) => {
    cameraHadOverlays = camera.layers.isEnabled(OVERLAY_LAYER);
    if (cameraHadOverlays) camera.layers.disable(OVERLAY_LAYER);
  }, HIDE_OVERLAYS_PRIORITY);

  useFrame(({ gl, scene, camera }) => {
    if (!cameraHadOverlays) return;
    const mask = camera.layers.mask;
    const background = scene.background;
    const autoClear = gl.autoClear;
    const shadowAutoUpdate = gl.shadowMap.autoUpdate;
    camera.layers.set(OVERLAY_LAYER);
    scene.background = null;
    gl.autoClear = false;
    // The shadow maps were already rendered this frame by the composer's render pass
    gl.shadowMap.autoUpdate = false;
    gl.setRenderTarget(null);
    gl.clearDepth();
    gl.render(scene, camera);
    gl.shadowMap.autoUpdate = shadowAutoUpdate;
    gl.autoClear = autoClear;
    scene.background = background;
    camera.layers.mask = mask;
    camera.layers.enable(OVERLAY_LAYER);
  }, DRAW_OVERLAYS_PRIORITY);

  return null;
}
