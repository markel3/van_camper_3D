import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CatmullRomCurve3, Matrix4, SphereGeometry, TubeGeometry, Vector3, type InstancedMesh } from 'three';
import { finishMaterials } from '../finishMaterials';
import { Part, useGeometries, type PropProps } from '../propParts';
import { useLightingMood } from '../../render/lightingMood';
import { LED_BULB_R_M, LED_CLIP_R_M, ledStringLayout } from '../../../../utils/shapes/decorShapes';

const BULB_PITCH_M = 0.1;
const BULB_R_M = LED_BULB_R_M;

// Warm LED string (luces LED cálidas): a dark cable clipped under the ceiling at both ends (and
// every ~0.75 m), sagging in swags, with warm bulbs every 10 cm. The bulbs glow with the LED
// intensity slider and the day/night mood (bloom picks them up at night).
export function LedStringProp({ width: w, height: h }: PropProps) {
  // Shared with the collision shape (utils/shapes/decorShapes.ts)
  const { swags, sag, topY } = ledStringLayout(w, h);
  // The end clips stay inside the module box
  const clipSpan = (w / 2 - LED_CLIP_R_M) / (w / 2);

  const curve = useMemo(() => {
    const points: Vector3[] = [];
    const steps = 12 * swags;
    for (let i = 0; i <= steps; i++) {
      const x = -w / 2 + (w * i) / steps;
      const local = ((i % 12) / 12) * 2 - 1; // −1..1 within the swag
      const y = topY - sag * (1 - local * local) * (i % 12 === 0 ? 0 : 1);
      // Slight random-looking wobble in Z so the cable does not read as a perfect arc
      points.push(new Vector3(x, y, Math.sin(i * 1.7) * 0.006));
    }
    return new CatmullRomCurve3(points);
  }, [w, swags, sag, topY]);

  const g = useGeometries(
    () => ({
      cable: new TubeGeometry(curve, 24 * swags, 0.0015, 5),
      bulb: new SphereGeometry(BULB_R_M, 12, 10).scale(1, 1.35, 1),
      clip: new SphereGeometry(LED_CLIP_R_M, 8, 6),
    }),
    [curve, swags],
  );

  const bulbs = useMemo(() => {
    const count = Math.max(2, Math.floor(curve.getLength() / BULB_PITCH_M));
    return Array.from({ length: count }, (_, i) => {
      const p = curve.getPointAt((i + 0.5) / count);
      return new Matrix4().makeTranslation(p.x, p.y - BULB_R_M * 1.2, p.z);
    });
  }, [curve]);

  const ref = useRef<InstancedMesh | null>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    bulbs.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [bulbs]);

  const { ledEmissiveIntensity } = useLightingMood();
  useEffect(() => {
    finishMaterials.bulbWarm().emissiveIntensity = ledEmissiveIntensity * 1.6;
  }, [ledEmissiveIntensity]);

  return (
    <group>
      <Part geometry={g.cable} material={finishMaterials.cable()} position={[0, 0, 0]} castShadow={false} />
      {Array.from({ length: swags + 1 }, (_, i) => (
        <Part key={i} geometry={g.clip} material={finishMaterials.cable()} position={[(-w / 2 + (w * i) / swags) * clipSpan, topY, 0]} castShadow={false} />
      ))}
      <instancedMesh
        // Re-create when the bulb count changes (instance count is fixed at construction)
        key={bulbs.length}
        ref={ref}
        args={[g.bulb, finishMaterials.bulbWarm(), bulbs.length]}
      />
    </group>
  );
}
