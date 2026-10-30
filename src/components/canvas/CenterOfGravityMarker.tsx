import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useEngineeringMetrics } from '../../hooks/useEngineeringMetrics';
import { useViewStore } from '../../store/useViewStore';
import { mToMm } from '../../utils/unitConverters';
import { OVERLAY_LAYERS } from './sceneLayers';

const MARKER_COLOR = '#f43f5e';
// Drawn on top of everything so the CoG stays visible even when it falls inside a module.
const OVERLAY_ORDER = 999;
// Frames the canvas must stay settled before the HTML label mounts
const LABEL_SETTLE_FRAMES = 3;

// Combined centre of mass of the installed equipment (WORKFLOWS.md, Flow 5.2), in van space.
export function CenterOfGravityMarker() {
  const { cog } = useEngineeringMetrics();
  // The HTML label would cover the first-person view
  const isWalkthrough = useViewStore((state) => state.isWalkthrough);
  // <Html> attaches its own React root to the event target when it mounts. During startup the
  // target, default camera and OrbitControls are still being swapped (CameraRig), and a remount
  // mid-render leaves the label empty — notably for a project restored with modules in place.
  // Mount it once the canvas has rendered a few frames with events and controls in place; it stays.
  const [labelReady, setLabelReady] = useState(false);
  const settledFrames = useRef(0);
  useFrame((state) => {
    if (labelReady) return;
    const settled = state.events.connected !== undefined && state.controls !== null;
    settledFrames.current = settled ? settledFrames.current + 1 : 0;
    if (settledFrames.current >= LABEL_SETTLE_FRAMES) setLabelReady(true);
  });
  if (!cog) return null;

  return (
    <group position={[cog.x, 0, cog.z]}>
      <mesh position={[0, cog.y, 0]} renderOrder={OVERLAY_ORDER} layers={OVERLAY_LAYERS}>
        <sphereGeometry args={[0.05, 24, 16]} />
        <meshBasicMaterial color={MARKER_COLOR} depthTest={false} transparent />
      </mesh>

      {/* Plumb line and floor ring: projection of the CoG onto the cargo floor */}
      <Line
        points={[[0, 0.002, 0], [0, cog.y, 0]]}
        color={MARKER_COLOR}
        lineWidth={1.5}
        dashed
        dashSize={0.04}
        gapSize={0.03}
        depthTest={false}
        renderOrder={OVERLAY_ORDER}
        layers={OVERLAY_LAYERS}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} renderOrder={OVERLAY_ORDER} layers={OVERLAY_LAYERS}>
        <ringGeometry args={[0.07, 0.09, 40]} />
        <meshBasicMaterial color={MARKER_COLOR} depthTest={false} transparent />
      </mesh>

      {labelReady && !isWalkthrough && (
        <Html position={[0, cog.y + 0.12, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="pointer-events-none whitespace-nowrap rounded border border-rose-500/50 bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] text-rose-300">
            CoG X {Math.round(mToMm(cog.x))} · Y {Math.round(mToMm(cog.y))} · Z {Math.round(mToMm(cog.z))} mm
          </div>
        </Html>
      )}
    </group>
  );
}
