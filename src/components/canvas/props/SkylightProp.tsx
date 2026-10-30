import { BoxGeometry } from 'three';
import { RoundedBox } from '@react-three/drei';
import { propMaterials } from './propMaterials';
import { Part, safeRadius, useGeometries, type PropProps } from './propParts';
import { SKYLIGHT_DOME_INSET, SKYLIGHT_FRAME_INSET, skylightLayout } from '../../../utils/shapes/fixtureShapes';

const FRAME_INSET = SKYLIGHT_FRAME_INSET; // frame footprint vs. flange
const DOME_INSET = SKYLIGHT_DOME_INSET; // dome footprint vs. flange

// Roof vent in the Dometic/Fiamma 40 × 40 style: sealing flange, raised frame, smoked dome.
export function SkylightProp({ width: w, height: h, depth: d }: PropProps) {
  // Shared with the collision shape (utils/shapes/fixtureShapes.ts)
  const { flangeT, frameH, domeH } = skylightLayout(h);
  const frameW = w * FRAME_INSET;
  const frameD = d * FRAME_INSET;
  const domeW = w * DOME_INSET;
  const domeD = d * DOME_INSET;

  const geometries = useGeometries(() => ({ flange: new BoxGeometry(w, flangeT, d) }), [w, d, flangeT]);

  return (
    <group>
      <Part geometry={geometries.flange} material={propMaterials.whiteAbs()} position={[0, flangeT / 2, 0]} />
      <RoundedBox
        args={[frameW, frameH, frameD]}
        radius={safeRadius(0.015, frameW, frameH, frameD)}
        smoothness={3}
        material={propMaterials.whiteAbs()}
        position={[0, flangeT + frameH / 2, 0]}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[domeW, domeH, domeD]}
        radius={safeRadius(0.04, domeW * 0.4, domeH * 0.9, domeD * 0.4)}
        smoothness={5}
        material={propMaterials.smokedDome()}
        position={[0, h - domeH / 2, 0]}
      />
    </group>
  );
}
