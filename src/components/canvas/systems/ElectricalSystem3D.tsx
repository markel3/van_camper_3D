import { useViewStore } from '../../../store/useViewStore';
import { useSystemRoutes } from '../../../hooks/useSystemRoutes';
import { NETWORKS } from '../../../utils/systems/systemsRouting';
import { SystemsRouting3D } from './SystemsRouting3D';

// Electrical installation (toolbar «Electricidad»): solar line from the roof panel down a wall
// corner to the battery, 12 V feeds to fridge, pump, skylight and LED strips, and the battery →
// inverter → 230 V sockets line, all running along the wall/floor and wall/ceiling edges.
export function ElectricalSystem3D() {
  // Both the Electricity toggle and the Layers panel's "Instalaciones" group must be on
  const visible = useViewStore((state) => state.showElectrical && state.layers.systems);
  const { routes } = useSystemRoutes();
  if (!visible) return null;
  return <SystemsRouting3D routes={routes.filter((route) => NETWORKS[route.network].kind === 'electrical')} />;
}
