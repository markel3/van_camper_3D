import type { VanLayout } from '../../../../utils/vanLayout';
import { vanMaterials } from './vanMaterials';

const TYRE_WIDTH_M = 0.215; // 225/75 R16-class tyre, REFERENCE
const RIM_RATIO = 0.6; // 16" rim inside a ~0.7 m tyre
const HUB_RATIO = 0.22;
const SEGMENTS = 40;
// Cylinders are built along Y; a quarter turn about Z lays them along X (the axle)
const AXLE_ROTATION: [number, number, number] = [0, 0, Math.PI / 2];

interface VanWheelsProps {
  layout: VanLayout;
}

// Four wheels on the real axles: front at rearAxle − wheelbase, rear at rearAxleZ (same Z as the
// interior wheel arches). Black tyres with silver alloy rims, never auto-hidden.
export function VanWheels({ layout }: VanWheelsProps) {
  const { wheelR: r, wheelY, wheelX } = layout;
  const wheels = [layout.frontAxleZ, layout.rearAxleZ].flatMap((z) => [-1, 1].map((side) => ({ z, side })));

  return (
    <group>
      {wheels.map(({ z, side }) => (
        <group key={`${z}:${side}`} position={[side * wheelX, wheelY, z]}>
          <mesh rotation={AXLE_ROTATION} material={vanMaterials.tyre()} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, TYRE_WIDTH_M, SEGMENTS]} />
          </mesh>
          {/* Rim and hub stand slightly proud of the outer sidewall */}
          <mesh position={[side * 0.004, 0, 0]} rotation={AXLE_ROTATION} material={vanMaterials.rim()}>
            <cylinderGeometry args={[r * RIM_RATIO, r * RIM_RATIO, TYRE_WIDTH_M, SEGMENTS]} />
          </mesh>
          <mesh position={[side * 0.008, 0, 0]} rotation={AXLE_ROTATION} material={vanMaterials.hub()}>
            <cylinderGeometry args={[r * HUB_RATIO, r * HUB_RATIO, TYRE_WIDTH_M, 20]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
