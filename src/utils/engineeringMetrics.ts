import type { CamperItem, EngineeringMetrics, InsulationMaterialId, VanSpec } from '../types/camper.types';
import {
  accumulatedMassKg,
  centerOfGravity,
  lateralBalance,
  longitudinalBalance,
  mmaStatus,
  mmaUsagePct,
  totalMassKg,
} from './physicsMath';
import { energyBalance, totalPriceEur } from './energyMath';
import { computeInsulationMetrics } from './insulationMetrics';

const MM_TO_M = 0.001;

// Insulation mass as a zero-size point at the cargo box centroid (X = 0, Y = H/2, Z = L/2, metres).
// Being a CamperItem with zero height, the existing CoG and lever-rule functions take it unchanged.
function insulationAsItems(van: VanSpec, massKg: number): CamperItem[] {
  if (massKg <= 0) return [];
  return [
    {
      id: 'insulation',
      catalogId: 'insulation',
      name: 'Aislamiento',
      category: 'structure',
      position: { x: 0, y: (van.interiorHeightMM * MM_TO_M) / 2, z: (van.interiorLengthMM * MM_TO_M) / 2 },
      rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 0, height: 0, depth: 0 },
      parametric: false,
      weightKg: massKg,
      priceEur: 0,
      materialId: 'insulation',
      locked: true,
      visible: false,
    },
  ];
}

// Aggregates all engineering metrics of the project. Pure function: does not touch the store.
// Insulation (interiorFinish.insulation) adds mass at the cargo centroid and its cost to the budget.
export function computeEngineeringMetrics(
  van: VanSpec,
  items: readonly CamperItem[],
  insulation: readonly InsulationMaterialId[] = [],
): EngineeringMetrics {
  const insulationMetrics = computeInsulationMetrics(van, insulation);
  const massed = [...items, ...insulationAsItems(van, insulationMetrics.massKg)];
  const totalKg = totalMassKg(van.tareWeightKg, massed);
  const mmaPct = mmaUsagePct(totalKg, van.mmaKg);

  return {
    totalMassKg: totalKg,
    mmaPct,
    mmaStatus: mmaStatus(mmaPct),
    cog: accumulatedMassKg(massed) > 0 ? centerOfGravity(massed) : null,
    lateral: lateralBalance(massed),
    longitudinal: longitudinalBalance(van, massed),
    budgetEur: totalPriceEur(items) + insulationMetrics.costEur,
    energy: energyBalance(items),
  };
}
