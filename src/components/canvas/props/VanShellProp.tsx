import { Suspense, useMemo, useRef } from 'react';
import { Vector3, type Group } from 'three';
import { useProjectStore } from '../../../store/useProjectStore';
import { wheelArchBoxes } from '../../../utils/collisionMath';
import { vanLayout } from '../../../utils/vanLayout';
import { ModelErrorBoundary } from '../ModelErrorBoundary';
import { ProceduralVanBody } from './van/ProceduralVanBody';
import { vanMaterials } from './van/vanMaterials';
import { VanModel } from './van/VanModel';
import { BoxPart } from './van/BoxPart';
import { useGhostChassis } from './van/ghostChassis';
import { useVanDoorMotion } from './van/vanDoorMotion';
import { InteriorLiningProp, liningArchMaterial } from './InteriorLiningProp';

// Our cargo floor slab under a .glb body. The model's own floor is calibrated flush with Y = 0
// (vanModelFit) but stays hidden, since it would z-fight with this slab. Furniture and collisions use Y = 0.
const MODEL_FLOOR_SLAB_M = 0.04;

// Vehicle body in van space (Z = 0 at the bulkhead, Y = 0 on the cargo floor). A catalogue
// van.modelUrl replaces the procedural body (uniform fit on the axles + section cut, VanModel),
// and the procedural body stays as loading and error fallback.
// The interior cargo box used by collisions is unaffected by anything drawn here.
// Everything under this group is chassis for the X-ray mode (ghostChassis); furniture is not.
export function VanShellProp() {
  const van = useProjectStore((state) => state.van);
  const interiorFinish = useProjectStore((state) => state.interiorFinish);
  const layout = useMemo(() => vanLayout(van), [van]);
  // Same boxes the collision engine tests against, so what you see is what collides
  const arches = useMemo(
    () =>
      wheelArchBoxes(van).map((box) => ({
        center: box.getCenter(new Vector3()).toArray(),
        size: box.getSize(new Vector3()).toArray(),
      })),
    [van],
  );
  const archMaterial = liningArchMaterial(interiorFinish) ?? vanMaterials.wheelArch();
  const root = useRef<Group | null>(null);
  useGhostChassis(root);
  // Cargo doors (useInteractionStore.vanDoors): eased progress and the interior cut of their openings
  useVanDoorMotion(root);

  const procedural = <ProceduralVanBody van={van} layout={layout} />;
  return (
    <group ref={root}>
      {van.modelUrl ? (
        <ModelErrorBoundary url={van.modelUrl} fallback={procedural}>
          <Suspense fallback={procedural}>
            <VanModel url={van.modelUrl} van={van} layout={layout} />
            <BoxPart
              min={[-layout.cargoW / 2, -MODEL_FLOOR_SLAB_M, 0]}
              max={[layout.cargoW / 2, 0, layout.cargoL]}
              material={vanMaterials.cargoFloor()}
            />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        procedural
      )}

      <InteriorLiningProp layout={layout} finish={interiorFinish} clipped={Boolean(van.modelUrl)} />

      {arches.map(({ center, size }, index) => (
        // Boxed in the wall lining's wood when the walls are lined
        <mesh key={index} position={center} material={archMaterial} castShadow receiveShadow>
          <boxGeometry args={size} />
        </mesh>
      ))}
    </group>
  );
}
