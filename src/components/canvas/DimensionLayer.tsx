import { useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useViewStore } from '../../store/useViewStore';
import { aisleAnnotations, headroomAnnotations, type Vec3 } from '../../utils/clearanceMath';
import { DimensionLine } from './DimensionLine';

const TICK_ALONG_X: Vec3 = [1, 0, 0];
const TICK_ALONG_Z: Vec3 = [0, 0, 1];

// Technical dimensions of the orthographic drawings, in van space (child of VanScene):
// aisle widths on the plan, free heights on the side and rear elevations.
// They follow the committed store state, so a gizmo drag updates them on release.
export function DimensionLayer() {
  const view = useViewStore((state) => state.view);
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);

  const annotations = useMemo(() => {
    if (view === 'top') return aisleAnnotations(van, items);
    if (view === 'side') return headroomAnnotations(van, items, 'z');
    if (view === 'rear') return headroomAnnotations(van, items, 'x');
    return [];
  }, [view, van, items]);

  // Ticks run across the line in the drawing plane
  const tickAxis = view === 'side' ? TICK_ALONG_Z : view === 'rear' ? TICK_ALONG_X : TICK_ALONG_Z;

  return (
    <group>
      {annotations.map((annotation) => (
        <DimensionLine key={annotation.id} annotation={annotation} tickAxis={tickAxis} />
      ))}
    </group>
  );
}
