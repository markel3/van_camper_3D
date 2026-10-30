import { Html, Line } from '@react-three/drei';
import type { DimensionAnnotation, Vec3 } from '../../utils/clearanceMath';
import { OVERLAY_LAYERS } from './sceneLayers';

const LINE_COLOR = '#38bdf8';
const WARNING_COLOR = '#f59e0b';
// Drawn over modules and walls, like the CoG marker
const OVERLAY_ORDER = 998;
// Half-length of the end ticks, metres
const TICK_HALF_M = 0.04;

interface DimensionLineProps {
  annotation: DimensionAnnotation;
  // Unit direction of the end ticks, perpendicular to the line on screen
  tickAxis: Vec3;
}

const offset = (point: Vec3, axis: Vec3, scale: number): [number, number, number] => [
  point[0] + axis[0] * scale,
  point[1] + axis[1] * scale,
  point[2] + axis[2] * scale,
];

// One technical dimension: line, end ticks and the measured length in mm.
export function DimensionLine({ annotation, tickAxis }: DimensionLineProps) {
  const { start, end, lengthMM, warning, kind } = annotation;
  const color = warning ? WARNING_COLOR : LINE_COLOR;
  const middle: Vec3 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  const lineProps = { color, lineWidth: 1.5, depthTest: false, renderOrder: OVERLAY_ORDER, layers: OVERLAY_LAYERS } as const;

  return (
    <group>
      <Line points={[[...start], [...end]]} {...lineProps} />
      <Line points={[offset(start, tickAxis, -TICK_HALF_M), offset(start, tickAxis, TICK_HALF_M)]} {...lineProps} />
      <Line points={[offset(end, tickAxis, -TICK_HALF_M), offset(end, tickAxis, TICK_HALF_M)]} {...lineProps} />
      <Html position={[...middle]} center zIndexRange={[9, 0]}>
        <div
          data-dimension-kind={kind}
          data-dimension-mm={lengthMM}
          title={kind === 'aisle' ? 'Ancho libre de pasillo' : 'Altura libre'}
          className={`pointer-events-none whitespace-nowrap rounded border bg-slate-950/85 px-1.5 py-px font-mono text-[10px] ${
            warning ? 'border-amber-500/60 text-amber-300' : 'border-sky-500/50 text-sky-300'
          }`}
        >
          {lengthMM} mm
        </div>
      </Html>
    </group>
  );
}
