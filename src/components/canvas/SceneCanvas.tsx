import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { AgXToneMapping } from 'three';
import { useProjectStore } from '../../store/useProjectStore';
import { StudioLights } from './StudioLights';
import { StudioEnvironment } from './StudioEnvironment';
import { FloorGrid } from './FloorGrid';
import { VanScene } from './VanScene';
import { ResizeHandles3D } from './ResizeHandles3D';
import { GizmoControl, isGizmoHandleActive, type GizmoHandle } from './GizmoControl';
import { CameraRig } from './CameraRig';
import { ViewCube } from './overlays/ViewCube';
import { mmToM } from '../../utils/unitConverters';
import { PostEffects, QUALITY_DPR, StudioBackdrop, TONE_MAPPING_EXPOSURE, useRenderQualityStore } from './render';


// Main R3F canvas. 3D objects only; no HTML here.
export function SceneCanvas() {
  const gizmoRef = useRef<GizmoHandle | null>(null);
  const quality = useRenderQualityStore((state) => state.quality);
  // Studio floor = real ground: cargo floor height below Y = 0, where the tyres touch down
  const groundY = useProjectStore((state) => -mmToM(state.van.floorHeightMM));

  // Clicking empty space deselects, except when the click lands on a gizmo handle
  // (handles have no R3F handlers, so R3F reports those clicks as "missed").
  const handlePointerMissed = () => {
    if (isGizmoHandleActive(gizmoRef.current)) return;
    useProjectStore.getState().select(null);
  };

  return (
    <Canvas
      // PCF shadows: three r186 removed PCFSoftShadowMap, which `shadows` alone would request
      shadows="percentage"
      dpr={QUALITY_DPR[quality]}
      // MSAA only matters without post-processing ('low'); the composer path uses SMAA
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        // Section cut of the .glb van body (per-material clipping planes, VanModel)
        gl.localClippingEnabled = true;
        // Exposure shared by the renderer (post-processing off) and the composer's AgX effect;
        // the tone mapping operator itself is chosen per quality preset in render/PostEffects
        gl.toneMapping = AgXToneMapping;
        gl.toneMappingExposure = TONE_MAPPING_EXPOSURE;
      }}
      onPointerMissed={handlePointerMissed}
    >
      {/* Studio gradient background + fog, studio HDRI reflections, lights (day/night mood) */}
      <StudioBackdrop />
      <StudioLights />
      <Suspense fallback={null}>
        <StudioEnvironment />
      </Suspense>
      <group position={[0, groundY, 0]}>
        <FloorGrid />
      </group>
      <VanScene />
      <GizmoControl gizmoRef={gizmoRef} />
      <ResizeHandles3D />
      <CameraRig />
      <PostEffects />
      <ViewCube />
    </Canvas>
  );
}
