import { useEffect, useMemo } from 'react';
import {
  CurvePath,
  CylinderGeometry,
  LineCurve3,
  MeshBasicMaterial,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  TubeGeometry,
  Vector3,
  type Curve,
} from 'three';
import type { SystemRoute } from '../../../types/camper.types';
import { NETWORKS } from '../../../utils/systems/systemsRouting';
import { OVERLAY_LAYERS } from '../sceneLayers';

// 3D generator shared by the water and electrical views: each route becomes a tube following its
// orthogonal polyline with rounded bends, plus a fitting (racor / prensaestopas) at both ports.
// Two passes per tube: the solid one, depth-tested, and a faint see-through one drawn on top, so
// runs hidden under furniture or behind the lining still read as a schematic (very legible with
// the X-ray chassis). Everything sits on the overlay layer: no contact shadows, no picking.

const BEND_RADIUS_M = 0.05;
const SEGMENTS_PER_M = 90;
const FITTING_LENGTH_M = 0.03;
const SEE_THROUGH_OPACITY = 0.3;
const SEE_THROUGH_ORDER = 20;
const noRaycast = (): void => undefined;

// Straight runs joined by quadratic bends of up to BEND_RADIUS_M (never more than half a run)
function roundedPath(points: readonly Vector3[]): CurvePath<Vector3> {
  const path = new CurvePath<Vector3>();
  let cursor = points[0]?.clone() ?? new Vector3();
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i] as Vector3;
    const prev = points[i - 1] as Vector3;
    const next = points[i + 1] as Vector3;
    const toPrev = prev.clone().sub(corner);
    const toNext = next.clone().sub(corner);
    const r = Math.min(BEND_RADIUS_M, toPrev.length() / 2, toNext.length() / 2);
    const start = corner.clone().add(toPrev.normalize().multiplyScalar(r));
    const end = corner.clone().add(toNext.normalize().multiplyScalar(r));
    if (cursor.distanceTo(start) > 1e-6) path.add(new LineCurve3(cursor, start) as Curve<Vector3>);
    path.add(new QuadraticBezierCurve3(start, corner.clone(), end) as Curve<Vector3>);
    cursor = end;
  }
  const last = points[points.length - 1];
  if (last && cursor.distanceTo(last) > 1e-6) path.add(new LineCurve3(cursor, last.clone()) as Curve<Vector3>);
  return path;
}

const materialCache = new Map<string, { solid: MeshStandardMaterial; ghost: MeshBasicMaterial }>();
function networkMaterials(color: string) {
  let entry = materialCache.get(color);
  if (!entry) {
    entry = {
      solid: new MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, emissive: color, emissiveIntensity: 0.12 }),
      ghost: new MeshBasicMaterial({ color, transparent: true, opacity: SEE_THROUGH_OPACITY, depthTest: false, depthWrite: false }),
    };
    materialCache.set(color, entry);
  }
  return entry;
}

const fittingMaterials = {
  water: new MeshStandardMaterial({ color: '#b48a4a', metalness: 0.85, roughness: 0.3 }), // brass
  electrical: new MeshStandardMaterial({ color: '#1b1d21', roughness: 0.6 }), // cable gland
};

const UP = new Vector3(0, 1, 0);

interface RouteTubeProps {
  route: SystemRoute;
}

function RouteTube({ route }: RouteTubeProps) {
  const def = NETWORKS[route.network];
  const { tube, fittings, fittingGeometry } = useMemo(() => {
    const points = route.points.map(({ x, y, z }) => new Vector3(x, y, z));
    const path = roundedPath(points);
    const segments = Math.max(12, Math.round(route.lengthM * SEGMENTS_PER_M));
    const tubeGeometry = new TubeGeometry(path, segments, def.radiusM, 10, false);
    // One fitting per port, aligned with the run leaving it
    const ends: { position: Vector3; quaternion: Quaternion }[] = [];
    const pairs: [Vector3 | undefined, Vector3 | undefined][] = [
      [points[0], points[1]],
      [points[points.length - 1], points[points.length - 2]],
    ];
    for (const [port, neighbour] of pairs) {
      if (!port || !neighbour) continue;
      const direction = neighbour.clone().sub(port).normalize();
      ends.push({
        position: port.clone().add(direction.clone().multiplyScalar(FITTING_LENGTH_M / 2)),
        quaternion: new Quaternion().setFromUnitVectors(UP, direction),
      });
    }
    const collar = new CylinderGeometry(def.radiusM * 1.9, def.radiusM * 1.9, FITTING_LENGTH_M, 16);
    return { tube: tubeGeometry, fittings: ends, fittingGeometry: collar };
  }, [route, def.radiusM]);
  useEffect(
    () => () => {
      tube.dispose();
      fittingGeometry.dispose();
    },
    [tube, fittingGeometry],
  );

  const { solid, ghost } = networkMaterials(def.color);
  const fitting = fittingMaterials[def.kind];
  return (
    <group>
      <mesh geometry={tube} material={solid} layers={OVERLAY_LAYERS} raycast={noRaycast} />
      <mesh geometry={tube} material={ghost} layers={OVERLAY_LAYERS} raycast={noRaycast} renderOrder={SEE_THROUGH_ORDER} />
      {fittings.map(({ position, quaternion }, index) => (
        <mesh
          key={index}
          geometry={fittingGeometry}
          material={fitting}
          position={position}
          quaternion={quaternion}
          layers={OVERLAY_LAYERS}
          raycast={noRaycast}
        />
      ))}
    </group>
  );
}

// Draws a set of routes (one network kind), van space
export function SystemsRouting3D({ routes }: { routes: readonly SystemRoute[] }) {
  return (
    <group>
      {routes.map((route) => (
        <RouteTube key={route.id} route={route} />
      ))}
    </group>
  );
}
