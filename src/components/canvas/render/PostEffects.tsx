import { useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { AgXToneMapping, NoToneMapping } from 'three';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useViewStore } from '../../../store/useViewStore';
import { isOrthographicView } from '../../../utils/cameraViews';
import { useRenderQualityStore } from './renderQualityStore';
import { COMPOSER_PRIORITY, OverlayPass } from './OverlayPass';

// AO tuned for a 6 m van: world-space radius in metres (the library default of 5 m would
// darken whole walls); a bit tighter in the walkthrough, where surfaces are close.
const AO_RADIUS_M = 0.6;
const AO_RADIUS_WALKTHROUGH_M = 0.35;

// The part of n8ao's N8AOPostPass we touch (the package ships no type declarations)
interface AOPass {
  configuration: { gammaCorrection: boolean };
}

// Post-processing chain (HDR, half-float buffers):
// scene -> N8AO (ambient occlusion) -> Bloom (only HDR emissive/specular above the threshold:
// LED strips, lights) -> AgX tone mapping -> vignette -> SMAA.
// Orthographic technical views keep only tone mapping + SMAA, for flat readable drawings.
export function PostEffects() {
  const quality = useRenderQualityStore((state) => state.quality);
  const ortho = useViewStore((state) => isOrthographicView(state.view));
  const walkthrough = useViewStore((state) => state.isWalkthrough);
  const night = useViewStore((state) => state.isNight);
  const aoRef = useRef<AOPass | null>(null);
  const balanced = quality === 'balanced';
  const gl = useThree((state) => state.gl);

  // Tone mapping happens once: in the composer's AgX effect, or in the renderer when post is off
  useLayoutEffect(() => {
    gl.toneMapping = quality === 'low' ? AgXToneMapping : NoToneMapping;
  }, [gl, quality]);

  // The composer's final pass already converts to sRGB: N8AO must output linear colour
  useLayoutEffect(() => {
    const ao = aoRef.current;
    if (ao) ao.configuration.gammaCorrection = false;
  });

  if (quality === 'low') return null;
  return (
    <>
      <EffectComposer multisampling={0} renderPriority={COMPOSER_PRIORITY}>
        <N8AO
          ref={aoRef}
          enabled={!ortho}
          aoRadius={walkthrough ? AO_RADIUS_WALKTHROUGH_M : AO_RADIUS_M}
          distanceFalloff={0.6}
          intensity={night ? 1.4 : 2.2}
          quality={balanced ? 'low' : 'medium'}
          halfRes={balanced}
          depthAwareUpsampling
        />
        <Bloom
          mipmapBlur
          luminanceThreshold={night ? 0.7 : 1}
          luminanceSmoothing={0.25}
          intensity={ortho ? 0 : night ? 1.1 : 0.6}
          radius={0.7}
        />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <Vignette eskil={false} offset={0.25} darkness={ortho ? 0 : 0.55} />
        <SMAA />
      </EffectComposer>
      <OverlayPass />
    </>
  );
}
