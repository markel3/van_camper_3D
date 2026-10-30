import { useViewStore } from '../../../store/useViewStore';

// Day/night lighting numbers shared by the studio rig and by anything that glows (interior LEDs).
export interface LightingMood {
  isNight: boolean;
  // scene.environmentIntensity of the studio HDRI (reflections and image-based fill)
  envIntensity: number;
  // Key (sun / studio soft box) directional light intensity
  sunIntensity: number;
  // Secondary rim/fill directional lights
  fillIntensity: number;
  // Multiplier for interior LED lights: already includes the user's ledIntensity slider (0..1).
  // Use it to scale point/rect light intensities of LED fixtures.
  ledBoost: number;
  // Suggested emissiveIntensity for LED strip materials (emissive colour = LED colour,
  // toneMapped left on). Values above ~1 cross the bloom threshold and glow.
  ledEmissiveIntensity: number;
  // Backdrop gradient (top, horizon, bottom) and fog colour, sRGB hex
  backdrop: { top: string; horizon: string; bottom: string; fog: string };
}

const DAY_BACKDROP = { top: '#2a313b', horizon: '#566070', bottom: '#1c222b', fog: '#3a4350' };
const NIGHT_BACKDROP = { top: '#05070b', horizon: '#111824', bottom: '#04060a', fog: '#0a0f17' };

// Pure: day keeps LEDs subtle (they would wash out in daylight), night lets them dominate
export function getLightingMood(isNight: boolean, ledIntensity: number): LightingMood {
  const led = Math.min(1, Math.max(0, ledIntensity));
  return isNight
    ? {
        isNight,
        envIntensity: 0.06,
        sunIntensity: 0.12,
        fillIntensity: 0.08,
        ledBoost: led * 2.5,
        ledEmissiveIntensity: 0.4 + led * 4.6,
        backdrop: NIGHT_BACKDROP,
      }
    : {
        isNight,
        envIntensity: 0.9,
        sunIntensity: 2.2,
        fillIntensity: 0.5,
        ledBoost: led,
        ledEmissiveIntensity: 0.2 + led * 1.8,
        backdrop: DAY_BACKDROP,
      };
}

// Reactive mood from useViewStore (isNight + ledIntensity). Object identity changes only when inputs do.
const cache = new Map<string, LightingMood>();
export function useLightingMood(): LightingMood {
  const isNight = useViewStore((state) => state.isNight);
  const ledIntensity = useViewStore((state) => state.ledIntensity);
  const key = `${isNight}:${ledIntensity}`;
  let mood = cache.get(key);
  if (!mood) {
    if (cache.size > 64) cache.clear();
    mood = getLightingMood(isNight, ledIntensity);
    cache.set(key, mood);
  }
  return mood;
}

// Non-reactive read for useFrame loops
export const readLightingMood = (): LightingMood => {
  const { isNight, ledIntensity } = useViewStore.getState();
  return getLightingMood(isNight, ledIntensity);
};
