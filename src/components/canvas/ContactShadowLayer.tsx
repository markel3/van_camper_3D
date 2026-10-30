import { useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useProjectStore } from '../../store/useProjectStore';
import { mmToM } from '../../utils/unitConverters';
import { vanLayout } from '../../utils/vanLayout';
import { useContactShadowVersion } from './contactShadowRefresh';

// Lifted above the floor slab top (Y = 0) to avoid z-fighting with it
const SHADOW_LIFT_M = 0.002;
// Ground shadow lift above the studio floor grid
const GROUND_LIFT_M = 0.004;
// Margin of the ground shadow around the vehicle footprint, so the penumbra fades out inside it
const GROUND_MARGIN_M = 1.8;
// Frames baked after each change; one is enough, the second covers a late-committed child
const SETTLE_FRAMES = 2;

// Soft contact shadows on the cargo floor, in van space (child of VanScene).
// drei restarts its `frames` count on every render, so the shadow is re-baked only when this
// component re-renders: modules or van changed, a model loaded, or a gizmo drag started/ended.
// During a drag (live preview active) it bakes every frame so the shadow follows the module.
// Overlays live on OVERLAY_LAYER, which the shadow camera does not see (sceneLayers.ts).
function CargoFloorShadow() {
  const lengthM = useProjectStore((state) => mmToM(state.van.interiorLengthMM));
  const widthM = useProjectStore((state) => mmToM(state.van.interiorWidthMM));
  // Cargo floor footprint only, so body panels outside it never print onto a floating plane.
  // Memoised: drei rebuilds its render targets whenever the `scale` array identity changes.
  const scale = useMemo<[number, number]>(() => [widthM, lengthM], [widthM, lengthM]);
  // Subscriptions only: a new array/object triggers the re-render that re-bakes the shadow
  useProjectStore((state) => state.items);
  useProjectStore((state) => state.van);
  useContactShadowVersion();
  const dragging = useProjectStore((state) => state.dragCollisionIds !== null);

  return (
    <ContactShadows
      position={[0, SHADOW_LIFT_M, lengthM / 2]}
      opacity={0.65}
      scale={scale}
      blur={1.8}
      far={1.5}
      frames={dragging ? Infinity : SETTLE_FRAMES}
    />
  );
}

// Soft ambient-occlusion shadow of the whole vehicle on the studio floor (the body itself does not
// cast directional shadows, see vanModelFit). Re-baked only when the van or its model changes.
function GroundShadow() {
  const van = useProjectStore((state) => state.van);
  useContactShadowVersion();
  const layout = useMemo(() => vanLayout(van), [van]);
  const scale = useMemo<[number, number]>(
    () => [layout.halfBody * 2 + GROUND_MARGIN_M, layout.rearZ - layout.frontZ + GROUND_MARGIN_M],
    [layout],
  );
  return (
    <ContactShadows
      position={[0, layout.groundY + GROUND_LIFT_M, (layout.frontZ + layout.rearZ) / 2]}
      opacity={0.9}
      scale={scale}
      resolution={1024}
      blur={2.6}
      far={layout.roofTop - layout.groundY}
      color="#02040a"
      frames={SETTLE_FRAMES}
    />
  );
}

export function ContactShadowLayer() {
  return (
    <>
      <CargoFloorShadow />
      <GroundShadow />
    </>
  );
}
