import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Matrix4,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { finishMaterials } from '../finishMaterials';
import { Part, useGeometries, type PropProps } from '../propParts';
import { createLeafGeometry, createVines } from './foliage';
import { DECOR_MODELS, FittedModel } from './DecorModel';
import { hangingPlantLayout } from '../../../../utils/shapes/decorShapes';

const CORD_R_M = 0.0028;
const CORDS = 4;

// Leaves of one plant as a single instanced draw call
export function LeafCloud({ matrices }: { matrices: Matrix4[] }) {
  const ref = useRef<InstancedMesh | null>(null);
  const geometry = useMemo(() => createLeafGeometry(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, finishMaterials.leaf(), matrices.length]}
      castShadow
      receiveShadow
    />
  );
}

// Glazed planter profile (radius, height) for LatheGeometry: rounded belly, rolled rim, open top
function planterProfile(radius: number, height: number): Vector2[] {
  const points: Vector2[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = radius * (0.62 + 0.38 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5));
    points.push(new Vector2(Math.max(0.001, i === 0 ? 0.001 : r), t * height));
  }
  points.push(new Vector2(radius * 1.02, height + 0.004));
  points.push(new Vector2(radius * 0.94, height + 0.004));
  points.push(new Vector2(radius * 0.92, height * 0.85));
  return points;
}

// Hanging plant (planta colgante): cotton macramé hanger from a ceiling ring, white glazed planter
// cradled in a diamond net with a gathering knot and tassel, a leafy crown (CC0 model, procedural
// fallback) and pothos-like vines trailing down. Pivot at the base of the module box; the ring
// sits at the top (ceiling).
export function HangingPlantProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/decorShapes.ts)
  const { potR, potH, potTop, potBottom, knotY, gatherY, ringR, vines: vineOptions } = hangingPlantLayout(w, h, d);

  const g = useGeometries((): Record<string, BufferGeometry> => {
    const cords: BufferGeometry[] = [];
    const tube = (points: Vector3[]) => cords.push(new TubeGeometry(new CatmullRomCurve3(points), 12, CORD_R_M, 5));
    const at = (angle: number, r: number, y: number) => new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
    for (let i = 0; i < CORDS; i++) {
      const a = (i / CORDS) * Math.PI * 2;
      const next = ((i + 0.5) / CORDS) * Math.PI * 2;
      const prev = ((i - 0.5) / CORDS) * Math.PI * 2;
      const rim = at(a, potR + 0.006, potTop - 0.01);
      const midY = potBottom + potH * 0.45;
      // Two strands from the knot that split around the rim and cross into diamonds
      tube([at(a, 0.004, knotY), at(a, potR * 0.6, (knotY + potTop) / 2), rim]);
      tube([rim, at(next, potR * 0.98 + 0.004, midY), at(next, potR * 0.4, gatherY + 0.01), at(0, 0.002, gatherY)]);
      tube([rim, at(prev, potR * 0.98 + 0.004, midY)]);
    }
    const merged = mergeGeometries(cords) ?? cords[0]!;
    cords.forEach((cord) => cord !== merged && cord.dispose());
    return {
      cords: merged,
      ring: new TorusGeometry(0.022, 0.0035, 8, 28),
      knot: new CylinderGeometry(0.01, 0.012, 0.03, 10),
      gather: new CylinderGeometry(0.012, 0.01, 0.028, 10),
      tassel: new CylinderGeometry(0.006, 0.02, Math.min(0.13, gatherY - 0.02), 14, 1, true),
      pot: new LatheGeometry(planterProfile(potR, potH), 32),
      soil: new CylinderGeometry(potR * 0.9, potR * 0.9, 0.006, 24),
    };
  }, [potR, potH, potTop, potBottom, knotY, gatherY]);

  // Same deterministic vines as the collision shape (utils/shapes/decorShapes.ts)
  const vines = useMemo(
    () => createVines(vineOptions),
    // The options are derived from these values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [potR, potTop, w, d],
  );
  useLayoutEffect(() => () => vines.stems.dispose(), [vines]);

  const rope = finishMaterials.rope();
  // Procedural crown shown while the CC0 plant model loads (or if it is missing)
  const crownLeaves = useMemo(() => {
    const set = createVines({ count: 5, rimRadius: potR * 0.4, rimY: potTop + 0.12, minY: potTop + 0.02, maxRadius: potR * 1.4, leafSize: 0.045, seed: 5 });
    set.stems.dispose();
    return set.leaves;
  }, [potR, potTop]);
  const crown = <LeafCloud matrices={crownLeaves} />;
  return (
    <group>
      {/* Upright ring: its top touches the ceiling */}
      <Part geometry={g.ring!} material={finishMaterials.oak()} position={[0, h - ringR, 0]} />
      <Part geometry={g.knot!} material={rope} position={[0, knotY, 0]} />
      <Part geometry={g.cords!} material={rope} position={[0, 0, 0]} />
      <Part geometry={g.gather!} material={rope} position={[0, gatherY, 0]} />
      <Part geometry={g.tassel!} material={rope} position={[0, gatherY - Math.min(0.13, gatherY - 0.02) / 2 - 0.01, 0]} />
      <Part geometry={g.pot!} material={finishMaterials.ceramicWhite()} position={[0, potBottom, 0]} />
      <Part geometry={g.soil!} material={finishMaterials.soil()} position={[0, potTop - 0.012, 0]} castShadow={false} />
      <FittedModel
        url={DECOR_MODELS.trailingPlant}
        size={[potR * 2.6, 0.2, potR * 2.6]}
        position={[0, potTop - 0.015, 0]}
        fallback={crown}
      />
      <Part geometry={vines.stems} material={finishMaterials.leaf()} position={[0, 0, 0]} castShadow={false} />
      <LeafCloud matrices={vines.leaves} />
    </group>
  );
}
