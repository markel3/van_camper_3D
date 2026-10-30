import { useEffect, useMemo, type RefObject } from 'react';
import type { Group, Material } from 'three';
import type { VanLayout } from '../../../../utils/vanLayout';
import { BoxPart } from './BoxPart';
import { CAB_BEVEL_M, cabPoints, createCabCapGeometry, createCabGeometry, createSideWindowGeometry } from './cabGeometry';
import { vanMaterials } from './vanMaterials';

interface VanCabProps {
  layout: VanLayout;
  paint: Material;
  camperPro: boolean;
  groupRef: RefObject<Group | null>;
}

const GLASS_OFFSET_M = CAB_BEVEL_M + 0.004; // glazing sits just proud of the rounded panels

// Front cab (Z < 0): body shell, glazing, grille, bumper, headlights and double-arm mirrors.
export function VanCab({ layout, paint, camperPro, groupRef }: VanCabProps) {
  const geometries = useMemo(
    () => ({
      cab: createCabGeometry(layout),
      cap: createCabCapGeometry(layout),
      sideWindow: createSideWindowGeometry(layout),
    }),
    [layout],
  );
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);

  const { halfBody: hb, frontZ: f, sillY, cabRoofY, roofTop } = layout;
  const p = cabPoints(layout);
  // Windscreen: a plane along the raked edge, pushed out along the edge's outward normal
  const [bz, by] = p.windscreenBase;
  const [tz, ty] = p.windscreenTop;
  const length = Math.hypot(tz - bz, ty - by);
  const normalY = (tz - bz) / length;
  const normalZ = -(ty - by) / length;
  const windscreenPos: [number, number, number] = [
    0,
    (by + ty) / 2 + normalY * GLASS_OFFSET_M,
    (bz + tz) / 2 + normalZ * GLASS_OFFSET_M,
  ];
  const black = vanMaterials.blackPlastic();

  return (
    <group ref={groupRef}>
      <mesh geometry={geometries.cab} material={paint} castShadow receiveShadow />
      {/* Front face of the cargo box above the cab roof (also the upper bulkhead seen from inside) */}
      <BoxPart min={[-hb, cabRoofY - 0.03, -0.04]} max={[hb, roofTop, 0]} material={paint} />
      {camperPro && <mesh geometry={geometries.cap} material={paint} castShadow receiveShadow />}

      <mesh position={windscreenPos} rotation={[Math.atan2(-normalY, normalZ), 0, 0]} material={vanMaterials.glass()}>
        <planeGeometry args={[hb * 2 - 0.16, length - 0.06]} />
      </mesh>
      <mesh geometry={geometries.sideWindow} material={vanMaterials.glass()} position={[hb + 0.003, 0, 0]} />
      <mesh geometry={geometries.sideWindow} material={vanMaterials.glass()} position={[-hb - 0.003, 0, 0]} />

      {/* Matte black bumper and grille, glossy headlights */}
      <BoxPart min={[-hb + 0.02, sillY - 0.06, f]} max={[hb - 0.02, 0.16, f + 0.3]} material={black} />
      <BoxPart min={[-0.5, 0.2, f + 0.035]} max={[0.5, 0.46, f + 0.12]} material={black} />
      {[-1, 1].map((side) => (
        <group key={side} scale={[side, 1, 1]}>
          <BoxPart min={[0.56, 0.42, f + 0.06]} max={[0.92, 0.57, f + 0.2]} material={vanMaterials.headlight()} />
          {/* Double-arm mirror */}
          <BoxPart min={[hb - 0.01, 1.0, f + 0.97]} max={[hb + 0.13, 1.03, f + 1.0]} material={black} />
          <BoxPart min={[hb - 0.01, 1.22, f + 0.97]} max={[hb + 0.13, 1.25, f + 1.0]} material={black} />
          <BoxPart min={[hb + 0.12, 0.95, f + 0.94]} max={[hb + 0.24, 1.3, f + 1.04]} material={black} />
          {camperPro && (
            <BoxPart
              min={[hb, sillY, layout.frontAxleZ + p.archR]}
              max={[hb + 0.012, sillY + 0.14, p.rearU]}
              material={black}
            />
          )}
        </group>
      ))}
    </group>
  );
}
