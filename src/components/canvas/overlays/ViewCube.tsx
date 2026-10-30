import { GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { useViewStore } from '../../../store/useViewStore';
import { useRenderQualityStore } from '../render';

// Hud priority: after the EffectComposer (2) and the overlay pass (3) so the cube is drawn on top of
// the post-processed image. Without post-processing ('low') the Hud must use priority 1, where it
// also renders the main scene itself.
const AFTER_COMPOSER_PRIORITY = 4;

// Dark navigation cube in the top-right corner of the viewport. Clicking a face orbits the default
// OrbitControls to that side. Hidden during the first-person walkthrough.
export function ViewCube() {
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  const lowQuality = useRenderQualityStore((state) => state.quality === 'low');
  if (isWalkthrough) return null;
  return (
    <GizmoHelper alignment="top-right" margin={[64, 64]} renderPriority={lowQuality ? 1 : AFTER_COMPOSER_PRIORITY}>
      <GizmoViewcube
        faces={['Der.', 'Izq.', 'Arriba', 'Abajo', 'Tras.', 'Frente']}
        color="#243447"
        hoverColor="#1d6fd8"
        textColor="#d7dfea"
        strokeColor="#3b4c63"
        opacity={0.95}
      />
    </GizmoHelper>
  );
}
