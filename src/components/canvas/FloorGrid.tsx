import { useEffect, useMemo } from 'react';
import { Grid } from '@react-three/drei';
import { MeshPhysicalMaterial } from 'three';
import { useLightingMood } from './render/lightingMood';

// Studio floor: dark blue-slate satin epoxy with a fine metric grid (1 unit = 1 m).
// 0.5 m tiles with brighter blue section lines every 2.5 m, fading with distance into the fog.
const CELL_SIZE_M = 0.5;
const SECTION_SIZE_M = 2.5;
const FLOOR_SIZE_M = 120;
// Gap between the shaded floor and the grid lines; at grazing camera angles 1 mm was lost to depth precision
const FLOOR_DROP_M = 0.01;

export function FloorGrid() {
  const { isNight } = useLightingMood();
  // Satin clearcoat picks up soft blurred reflections of the studio HDRI (no extra scene render)
  const floorMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: '#121924',
        roughness: 0.5,
        metalness: 0,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        // Keeps the floor dark slate from every angle (top views reflect the bright studio ceiling)
        envMapIntensity: 0.3,
      }),
    [],
  );
  useEffect(() => () => floorMaterial.dispose(), [floorMaterial]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -FLOOR_DROP_M, 0]} material={floorMaterial} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE_M, FLOOR_SIZE_M]} />
      </mesh>

      <Grid
        args={[FLOOR_SIZE_M, FLOOR_SIZE_M]}
        cellSize={CELL_SIZE_M}
        cellThickness={0.7}
        cellColor={isNight ? '#1c2636' : '#3a4a5f'}
        sectionSize={SECTION_SIZE_M}
        sectionThickness={1.2}
        sectionColor={isNight ? '#1e3a66' : '#3d79c9'}
        fadeDistance={34}
        fadeStrength={2.2}
        followCamera={false}
        infiniteGrid
      />
    </group>
  );
}
