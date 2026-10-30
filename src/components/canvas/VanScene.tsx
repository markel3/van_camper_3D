import { useProjectStore } from '../../store/useProjectStore';
import { mmToM } from '../../utils/unitConverters';
import { VanShellProp } from './props/VanShellProp';
import { FurnitureLayer } from './FurnitureLayer';
import { CenterOfGravityMarker } from './CenterOfGravityMarker';
import { DimensionLayer } from './DimensionLayer';
import { ContactShadowLayer } from './ContactShadowLayer';
import { WaterSystem3D } from './systems/WaterSystem3D';
import { ElectricalSystem3D } from './systems/ElectricalSystem3D';

// Van space (Z = 0 at the bulkhead) shifted so the cargo box is centred on the world origin.
// Children keep using store coordinates as-is.
export function VanScene() {
  const lengthM = useProjectStore((state) => mmToM(state.van.interiorLengthMM));

  return (
    <group position={[0, 0, -lengthM / 2]}>
      <VanShellProp />
      <FurnitureLayer />
      <ContactShadowLayer />
      <CenterOfGravityMarker />
      <DimensionLayer />
      {/* Outside the van shell: never ghosted nor cut, so they read through the X-ray chassis */}
      <WaterSystem3D />
      <ElectricalSystem3D />
    </group>
  );
}
