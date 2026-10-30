import { RoundedBox } from '@react-three/drei';
import { CylinderGeometry, TorusGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, safeRadius, useGeometries, type PropProps } from './propParts';
import { TANK_RIB_DEPTH_M, tankLayout } from '../../../utils/shapes/deviceShapes';

const RIB_DEPTH_M = TANK_RIB_DEPTH_M; // reinforcement ribs stand this far proud of the shell
const FILL_LEVEL = 0.7; // visible water level, as a share of the shell height
const THREAD_RINGS = 4;

// Fresh-water tank: rotomoulded translucent polyethylene shell (the water level shows through),
// horizontal reinforcement belts, vertical ribs on the long faces and a threaded inspection cap
// on top. Fixed look: the module's sheet material does not apply to a bought product.
export function WaterTankProp(props: PropProps) {
  return <TankBody {...props} tone="clean" />;
}

// Grey-water tank: same rotomoulded body in opaque dark grey with a black cap (no visible level)
export function GreyWaterTankProp(props: PropProps) {
  return <TankBody {...props} tone="grey" />;
}

function TankBody({ width: w, height: h, depth: d, tone }: PropProps & { tone: 'clean' | 'grey' }) {
  // Shared with the collision shape (utils/shapes/deviceShapes.ts)
  const { capH, shellH, capR, capX } = tankLayout(w, h, d);
  const shellW = w - 2 * RIB_DEPTH_M;
  const shellD = d - 2 * RIB_DEPTH_M;
  const radius = safeRadius(0.03, shellW, shellH, shellD);
  const ringR = capR * 0.92;
  const beltT = Math.min(0.018, shellH * 0.06);
  const ribW = Math.min(0.02, w * 0.03);
  const ribCount = Math.max(2, Math.round(w / 0.25));

  const geometries = useGeometries(
    () => ({
      collar: new CylinderGeometry(capR * 1.25, capR * 1.3, capH * 0.3, 32),
      cap: new CylinderGeometry(capR, capR, capH * 0.7, 32),
      thread: new TorusGeometry(ringR, (capH * 0.7) / (THREAD_RINGS * 4), 6, 32).rotateX(Math.PI / 2),
    }),
    [capR, capH, ringR],
  );

  const beltYs = [shellH / 3, (2 * shellH) / 3];
  const ribXs = Array.from({ length: ribCount }, (_, i) => -shellW / 2 + ((i + 1) * shellW) / (ribCount + 1));
  const grey = tone === 'grey';
  const shell = grey ? propMaterials.greyTankShell() : propMaterials.tankShell();
  const capMaterial = grey ? propMaterials.blackCap() : propMaterials.tankCap();
  return (
    <group>
      <RoundedBox args={[shellW, shellH, shellD]} radius={radius} smoothness={3} material={shell} position={[0, shellH / 2, 0]} />
      {/* Water inside the translucent shell (the opaque grey tank hides it) */}
      {!grey && (
        <mesh position={[0, (shellH * FILL_LEVEL) / 2 + 0.004, 0]} material={propMaterials.tankWater()}>
          <boxGeometry args={[shellW - 0.02, shellH * FILL_LEVEL - 0.008, shellD - 0.02]} />
        </mesh>
      )}
      {/* Horizontal reinforcement belts all around the shell */}
      {beltYs.map((y) => (
        <RoundedBox
          key={y}
          args={[w, beltT, d]}
          radius={safeRadius(radius + RIB_DEPTH_M, w, beltT, d)}
          smoothness={2}
          material={shell}
          position={[0, y, 0]}
        />
      ))}
      {/* Vertical ribs on both long faces */}
      {ribXs.map((x) =>
        ([1, -1] as const).map((side) => (
          <mesh key={`${x}:${side}`} position={[x, shellH / 2, side * (shellD / 2 + RIB_DEPTH_M / 2)]} material={shell}>
            <boxGeometry args={[ribW, shellH - 2 * radius, RIB_DEPTH_M]} />
          </mesh>
        )),
      )}
      {/* Threaded inspection cap */}
      <group position={[capX, shellH, 0]}>
        <Part geometry={geometries.collar} material={capMaterial} position={[0, capH * 0.15, 0]} />
        <Part geometry={geometries.cap} material={capMaterial} position={[0, capH * 0.3 + capH * 0.35, 0]} />
        {Array.from({ length: THREAD_RINGS }, (_, i) => (
          <Part
            key={i}
            geometry={geometries.thread}
            material={capMaterial}
            position={[0, capH * 0.3 + ((i + 0.5) * capH * 0.7) / THREAD_RINGS, 0]}
            castShadow={false}
          />
        ))}
      </group>
    </group>
  );
}
