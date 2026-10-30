import { Environment, Lightformer } from '@react-three/drei';
import { DoubleSide } from 'three';
import { useLightingMood } from './render/lightingMood';

// Poly Haven "Studio Small 09" (CC0, https://polyhaven.com/a/studio_small_09), 1k equirect HDR
export const STUDIO_HDRI_URL = `${import.meta.env.BASE_URL}hdri/studio_small_09_1k.hdr`;

// Image-based lighting: the studio HDRI drives reflections (car paint, chrome, glass) and the
// diffuse fill, while the visible background stays the dark studio gradient (StudioBackdrop).
// A dark ground disc and two extra Lightformer strips are baked into the cube map once, so the clearcoat paint shows
// the long soft-box highlights of a car studio. Night mode only dims it (scene.environmentIntensity).
export function StudioEnvironment() {
  const { envIntensity } = useLightingMood();
  return (
    <Environment
      files={STUDIO_HDRI_URL}
      resolution={512}
      frames={1}
      background={false}
      environmentIntensity={envIntensity}
      environmentRotation={[0, Math.PI / 3, 0]}
    >
      {/* Dark slate ground disc hiding the HDRI's white cyclorama floor: lower body panels reflect
          the dark studio floor, as in a car studio, instead of glowing white */}
      <mesh position={[0, -1.2, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[60, 48]} />
        <meshBasicMaterial color="#141a24" side={DoubleSide} />
      </mesh>
      {/* Long overhead strip: the horizontal highlight along the van's roof line and flanks */}
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 1.2, 1]} />
      {/* Cool side panel, the soft vertical sheen on the body sides */}
      <Lightformer form="rect" intensity={1.2} color="#dbe7ff" position={[-7, 2, 2]} rotation-y={Math.PI / 2} scale={[10, 2.5, 1]} />
    </Environment>
  );
}
