import { Vector3, type Box3 } from 'three';
import type { CategoryType } from '../../../types/camper.types';
import { createMetricBoxGeometry } from '../../../utils/textures/metricBoxGeometry';
import { getCabinetFinish } from '../props/propMaterials';
import { Part, useGeometries } from '../props/propParts';

interface NotchBoxingProps {
  // Boxing boards of the module's wheel-arch notches, module-local frame (Adaptation 'archNotch'
  // boards, from utils/shapes/notchBoards.ts): the same boxes are solid parts of its shape
  boards: readonly Box3[];
  materialId: string;
  category: CategoryType;
}

// The carpentry that closes a notched carcass around a wheel arch, in the module's carcass board.
// Drawn outside the cut region, so the notch reads as a clean step around the arch.
export function NotchBoxing({ boards, materialId, category }: NotchBoxingProps) {
  const pieces = boards.map((board) => ({ size: board.getSize(new Vector3()), centre: board.getCenter(new Vector3()) }));
  const key = pieces.map((p) => [...p.size.toArray(), ...p.centre.toArray()].map((n) => n.toFixed(5)).join(',')).join(';');
  const geometries = useGeometries(
    () => Object.fromEntries(pieces.map((p, i) => [String(i), createMetricBoxGeometry(p.size.x, p.size.y, p.size.z)])),
    // The key captures every board size and position
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const material = getCabinetFinish(materialId, category).carcass;
  return (
    <group>
      {pieces.map((p, i) => (
        <Part key={i} geometry={geometries[String(i)]!} material={material} position={p.centre.toArray()} />
      ))}
    </group>
  );
}
