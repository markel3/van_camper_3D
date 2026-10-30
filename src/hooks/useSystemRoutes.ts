import { useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { SystemRoutes } from '../types/camper.types';
import { computeSystemRoutes } from '../utils/systems/systemsRouting';

// Installation networks derived from the project (memoised on van, modules and lining)
export function useSystemRoutes(): SystemRoutes {
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);
  const finish = useProjectStore((state) => state.interiorFinish);
  return useMemo(() => computeSystemRoutes(van, items, finish), [van, items, finish]);
}
