import { useEffect, useMemo, useRef } from 'react';
import { useProjectStore } from '../../../store/useProjectStore';
import { findCatalogDef } from '../../../utils/catalogLookup';
import { isRoofMounted } from '../../../utils/roofMount';
import { cargoBox, itemBox, wheelArchBoxes } from '../../../utils/collisionMath';
import { vanLayout } from '../../../utils/vanLayout';
import type { CategoryType } from '../../../types/camper.types';
import { playerPose, subscribePose } from '../../canvas/walkthrough/walkStore';

// Floor plan seen from above, cab to the right (map x = −Z, map y = X, metres).
// Static parts re-render only when the project changes; the player marker is moved imperatively
// on every pose update, so the 60 fps walk never re-renders React.

const CATEGORY_FILL: Record<CategoryType, string> = {
  structure: '#b45309',
  kitchen: '#059669',
  bathroom: '#0891b2',
  electrical: '#ca8a04',
  water: '#2563eb',
  openings: '#64748b',
  decor: '#db2777',
};

const PAD_M = 0.15;
const CONE_RADIUS_M = 1.3;
const CONE_HALF_ANGLE = Math.PI / 4;
const CONE_PATH = (() => {
  const x = Math.cos(CONE_HALF_ANGLE) * CONE_RADIUS_M;
  const y = Math.sin(CONE_HALF_ANGLE) * CONE_RADIUS_M;
  return `M0 0 L${x} ${-y} A${CONE_RADIUS_M} ${CONE_RADIUS_M} 0 0 1 ${x} ${y} Z`;
})();

interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Van-space XZ footprint → map rectangle
const footprint = (minX: number, maxX: number, minZ: number, maxZ: number): MapRect => ({
  x: -maxZ,
  y: minX,
  width: maxZ - minZ,
  height: maxX - minX,
});

export function WalkthroughMinimap() {
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);
  const marker = useRef<SVGGElement>(null);

  const plan = useMemo(() => {
    const layout = vanLayout(van);
    const cargo = cargoBox(van);
    const body = footprint(-layout.halfBody, layout.halfBody, layout.frontZ, layout.rearZ);
    return {
      body,
      cabFront: body.x + body.width,
      cargo: footprint(cargo.min.x, cargo.max.x, cargo.min.z, cargo.max.z),
      arches: wheelArchBoxes(van).map((b) => footprint(b.min.x, b.max.x, b.min.z, b.max.z)),
      viewBox: `${body.x - PAD_M} ${body.y - PAD_M} ${body.width + 2 * PAD_M} ${body.height + 2 * PAD_M}`,
    };
  }, [van]);

  const modules = useMemo(
    () =>
      items
        .filter((item) => item.visible && !isRoofMounted(item.catalogId))
        .map((item) => {
          const box = itemBox(item);
          const category = findCatalogDef(item.catalogId)?.category ?? item.category;
          return {
            id: item.id,
            rect: footprint(box.min.x, box.max.x, box.min.z, box.max.z),
            fill: CATEGORY_FILL[category] ?? '#64748b',
            overhead: box.min.y > 1.2,
          };
        }),
    [items],
  );

  useEffect(() => {
    const update = () => {
      const deg = (-playerPose.yaw * 180) / Math.PI;
      marker.current?.setAttribute('transform', `translate(${-playerPose.z} ${playerPose.x}) rotate(${deg})`);
    };
    update();
    return subscribePose(update);
  }, []);

  const { body, cargo } = plan;
  // Cab: the part of the body ahead of the bulkhead (map x > 0), with a rounded nose
  const cabLength = plan.cabFront;
  return (
    <svg viewBox={plan.viewBox} className="block h-auto w-full" role="img" aria-label="Minimapa de la furgoneta">
      <rect {...body} rx={0.25} fill="#0f172a" stroke="#94a3b8" strokeWidth={0.03} />
      <rect x={0} y={body.y + 0.08} width={cabLength - 0.08} height={body.height - 0.16} rx={0.3} fill="#1e293b" stroke="#475569" strokeWidth={0.02} />
      <rect {...cargo} fill="#334155" stroke="#cbd5e1" strokeWidth={0.025} />
      {plan.arches.map((arch, index) => (
        <rect key={index} {...arch} fill="#0f172a" stroke="#64748b" strokeWidth={0.015} />
      ))}
      {modules.map(({ id, rect, fill, overhead }) => (
        <rect
          key={id}
          {...rect}
          rx={0.03}
          fill={fill}
          fillOpacity={overhead ? 0.25 : 0.75}
          stroke={fill}
          strokeWidth={0.02}
          strokeDasharray={overhead ? '0.06 0.04' : undefined}
        />
      ))}
      <g ref={marker} data-walk-marker="">
        <path d={CONE_PATH} fill="#22c55e" fillOpacity={0.45} stroke="#4ade80" strokeWidth={0.02} />
        <circle r={0.09} fill="#3b82f6" stroke="#f8fafc" strokeWidth={0.025} />
      </g>
    </svg>
  );
}
