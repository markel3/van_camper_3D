import { useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { EngineeringMetrics } from '../types/camper.types';
import { computeEngineeringMetrics } from '../utils/engineeringMetrics';

// Derived metrics from the store. Recomputed only when items, the chassis or the insulation change.
export function useEngineeringMetrics(): EngineeringMetrics {
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);
  const insulation = useProjectStore((state) => state.interiorFinish.insulation);

  return useMemo(() => computeEngineeringMetrics(van, items, insulation), [van, items, insulation]);
}
