import { useViewStore } from '../../../store/useViewStore';
import { useSystemRoutes } from '../../../hooks/useSystemRoutes';
import { NETWORKS } from '../../../utils/systems/systemsRouting';
import { SystemsRouting3D } from './SystemsRouting3D';

// Water installation (toolbar «Agua»): cold Ø12 (blue), hot Ø12 (red) and grey Ø25 (slate) pipes
// run on the floor between the clean tank, the pump/boiler kit, the taps and the grey tank.
export function WaterSystem3D() {
  // Both the Water toggle and the Layers panel's "Instalaciones" group must be on
  const visible = useViewStore((state) => state.showWater && state.layers.systems);
  const { routes } = useSystemRoutes();
  if (!visible) return null;
  return <SystemsRouting3D routes={routes.filter((route) => NETWORKS[route.network].kind === 'water')} />;
}
