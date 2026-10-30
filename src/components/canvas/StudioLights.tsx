import { useLightingMood } from './render/lightingMood';

const SHADOW_EXTENT_M = 7;

// Direct lights on top of the HDRI image-based lighting: one shadow-casting key (studio soft box /
// sun) plus a cool rim and a warm back light for volume. Night mode dims them to a moonlit rig, so
// the interior LEDs dominate. Intensities are physical (three r155+ lighting units).
export function StudioLights() {
  const { sunIntensity, fillIntensity, isNight } = useLightingMood();
  return (
    <>
      <hemisphereLight args={[isNight ? '#1e293b' : '#dbe4f0', '#0b1018', isNight ? 0.08 : 0.25]} />

      <directionalLight
        position={[5, 8, 4]}
        intensity={sunIntensity}
        color={isNight ? '#9fb4d9' : '#fff6ea'}
        castShadow
        // Frustum sized for the whole 6 m vehicle down to the ground plane
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-SHADOW_EXTENT_M}
        shadow-camera-right={SHADOW_EXTENT_M}
        shadow-camera-top={SHADOW_EXTENT_M}
        shadow-camera-bottom={-SHADOW_EXTENT_M}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        // Soft PCF penumbra
        shadow-radius={6}
        shadow-blurSamples={16}
      />
      <directionalLight position={[-6, 3, -3]} intensity={fillIntensity} color="#bcd4ff" />
      <directionalLight position={[0, 4, -7]} intensity={fillIntensity * 0.8} color="#ffe2b0" />
    </>
  );
}
