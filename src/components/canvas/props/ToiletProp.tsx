import { RoundedBox } from '@react-three/drei';
import { BoxGeometry, CylinderGeometry } from 'three';
import { propMaterials } from './propMaterials';
import { Part, safeRadius, useGeometries, type PropProps } from './propParts';

// Portable / dry toilet (Porta Potti style): lower waste tank and upper fresh-water body in white
// rounded plastic, a light grey seat lid, a flush button on top and the grey tank latch on the
// front (+Z).
export function ToiletProp({ width: w, height: h, depth: d }: PropProps) {
  const tankH = h * 0.44;
  const bodyH = h * 0.47;
  const lidH = h - tankH - bodyH;
  const g = useGeometries(
    () => ({
      latch: new BoxGeometry(w * 0.3, tankH * 0.18, 0.012),
      flush: new CylinderGeometry(0.018, 0.018, 0.012, 20),
      seam: new BoxGeometry(w * 0.96, 0.006, d * 0.96),
    }),
    [w, d, tankH],
  );
  const white = propMaterials.whiteAbs();
  return (
    <group>
      <RoundedBox
        args={[w, tankH, d - 0.012]}
        radius={safeRadius(0.035, w, tankH, d)}
        smoothness={3}
        material={white}
        position={[0, tankH / 2, -0.006]}
        castShadow
        receiveShadow
      />
      <Part geometry={g.seam} material={propMaterials.gasket()} position={[0, tankH + 0.002, -0.006]} castShadow={false} />
      <RoundedBox
        args={[w * 0.97, bodyH, d * 0.94]}
        radius={safeRadius(0.045, w, bodyH, d)}
        smoothness={3}
        material={white}
        position={[0, tankH + bodyH / 2, -d * 0.03]}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[w * 0.9, lidH, d * 0.82]}
        radius={safeRadius(0.03, w, lidH, d)}
        smoothness={3}
        material={propMaterials.labelPanel()}
        position={[0, tankH + bodyH + lidH / 2, 0.0]}
        castShadow
      />
      <Part geometry={g.flush} material={propMaterials.pumpGrey()} position={[w * 0.3, h - 0.004, -d * 0.36]} castShadow={false} />
      <Part geometry={g.latch} material={propMaterials.pumpGrey()} position={[0, tankH * 0.45, d / 2 - 0.006]} />
    </group>
  );
}
