import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, Fog, LinearFilter, SRGBColorSpace } from 'three';
import { useLightingMood } from './lightingMood';

const FOG_NEAR_M = 14;
const FOG_FAR_M = 48;
// Where the bright horizon band sits on screen (0 = top, 1 = bottom)
const HORIZON_STOP = 0.55;

// Vertical studio gradient (screen-space background): dark ceiling, soft grey-blue horizon glow,
// dark floor edge. The floor fades into the horizon through matching fog.
function createGradient(top: string, horizon: string, bottom: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, top);
    gradient.addColorStop(HORIZON_STOP, horizon);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Owns scene.background and scene.fog, following the day/night mood
export function StudioBackdrop() {
  const scene = useThree((state) => state.scene);
  const { backdrop } = useLightingMood();
  const texture = useMemo(
    () => createGradient(backdrop.top, backdrop.horizon, backdrop.bottom),
    [backdrop.top, backdrop.horizon, backdrop.bottom],
  );
  useEffect(() => {
    scene.background = texture;
    scene.fog = new Fog(backdrop.fog, FOG_NEAR_M, FOG_FAR_M);
    return () => {
      scene.background = null;
      scene.fog = null;
      texture.dispose();
    };
  }, [scene, texture, backdrop.fog]);
  return null;
}
