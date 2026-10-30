import { useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import type { Adaptation } from '../types/adaptation.types';
import { findAdaptations } from '../utils/fitAdaptation';

// Memoized fit adaptations of the whole project (same derivation as FurnitureLayer)
export function useAdaptations(): Map<string, Adaptation[]> {
  const van = useProjectStore((state) => state.van);
  const items = useProjectStore((state) => state.items);
  return useMemo(() => findAdaptations(van, items), [van, items]);
}
