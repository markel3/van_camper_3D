import type {
  CamperItem,
  LateralBalance,
  LongitudinalBalance,
  MmaStatus,
  VanSpec,
  Vector3Tuple,
} from '../types/camper.types';

// Pure mass-engineering functions (WORKFLOWS.md, Flow 5).
// Convention: position is the pivot at the module base, centred on X and Z.
// Units: position in metres, dimensions in mm, weightKg in kg.

// Acceptable lateral balance limits (WORKFLOWS.md, Flow 5.2)
export const LATERAL_BALANCE_MIN_PCT = 45;
export const LATERAL_BALANCE_MAX_PCT = 55;

const MM_TO_M = 0.001;

// Accumulated equipment mass: Σ mᵢ (kg)
export function accumulatedMassKg(items: readonly CamperItem[]): number {
  return items.reduce((sum, item) => sum + item.weightKg, 0);
}

// Total mass = tare + Σ mᵢ (WORKFLOWS.md, 5.1)
export function totalMassKg(tareKg: number, items: readonly CamperItem[]): number {
  return tareKg + accumulatedMassKg(items);
}

// Centre of mass of the equipment (WORKFLOWS.md, 5.2):
//   X = Σ(mᵢ·xᵢ) / Σmᵢ,  Y = Σ(mᵢ·yᵢ) / Σmᵢ,  Z = Σ(mᵢ·zᵢ) / Σmᵢ
// For Y, the module's geometric centre is used: yᵢ + hᵢ/2.
// Returns null when there is no mass, because the centre is undefined.
export function centerOfGravity(items: readonly CamperItem[]): Vector3Tuple | null {
  const mass = accumulatedMassKg(items);
  if (mass <= 0) return null;

  const weighted = items.reduce(
    (acc, item) => {
      const m = item.weightKg;
      const centerY = item.position.y + item.dimensions.height * MM_TO_M / 2;
      return {
        x: acc.x + m * item.position.x,
        y: acc.y + m * centerY,
        z: acc.z + m * item.position.z,
      };
    },
    { x: 0, y: 0, z: 0 },
  );

  return { x: weighted.x / mass, y: weighted.y / mass, z: weighted.z / mass };
}

// Lateral split: x < 0 is the driver side (left), x > 0 the passenger side (right).
// A module exactly at x = 0 splits its mass equally.
// With no mass installed, the load is treated as balanced (50 % / 50 %).
export function lateralBalance(items: readonly CamperItem[]): LateralBalance {
  let leftKg = 0;
  let rightKg = 0;

  for (const item of items) {
    const m = item.weightKg;
    if (item.position.x < 0) {
      leftKg += m;
    } else if (item.position.x > 0) {
      rightKg += m;
    } else {
      leftKg += m / 2;
      rightKg += m / 2;
    }
  }

  const total = leftKg + rightKg;
  const leftPct = total > 0 ? (leftKg / total) * 100 : 50;
  const rightPct = 100 - leftPct;
  const isBalanced = leftPct >= LATERAL_BALANCE_MIN_PCT && leftPct <= LATERAL_BALANCE_MAX_PCT;

  return { leftKg, rightKg, leftPct, rightPct, isBalanced };
}

// MMA usage thresholds (WORKFLOWS.md, 5.1)
export const MMA_WARNING_PCT = 90;
export const MMA_CRITICAL_PCT = 100;

// MMA usage percentage: total mass / MMA · 100
export function mmaUsagePct(totalKg: number, mmaKg: number): number {
  return mmaKg > 0 ? (totalKg / mmaKg) * 100 : 0;
}

export function mmaStatus(pct: number): MmaStatus {
  if (pct > MMA_CRITICAL_PCT) return 'critical';
  if (pct > MMA_WARNING_PCT) return 'warning';
  return 'ok';
}

// Axle load split by the lever rule (static model, two supports):
//   carga delantera = M · (zTrasero − zCoG) / batalla
// Tare is assumed centred between axles (estimate until per-axle weight data is available).
// Z in metres, with Z = 0 at the bulkhead; the front axle sits at (rear axle − wheelbase).
export function longitudinalBalance(van: VanSpec, items: readonly CamperItem[]): LongitudinalBalance {
  const rearAxleZ = van.rearAxleZMM * MM_TO_M;
  const frontAxleZ = rearAxleZ - van.wheelbaseMM * MM_TO_M;
  const totalKg = totalMassKg(van.tareWeightKg, items);

  if (totalKg <= 0) return { frontKg: 0, rearKg: 0, frontPct: 50, rearPct: 50 };

  const tareZ = (frontAxleZ + rearAxleZ) / 2;
  const momentZ =
    van.tareWeightKg * tareZ + items.reduce((sum, item) => sum + item.weightKg * item.position.z, 0);
  const cogZ = momentZ / totalKg;

  const frontPct = ((rearAxleZ - cogZ) / (rearAxleZ - frontAxleZ)) * 100;
  const frontKg = (totalKg * frontPct) / 100;

  return { frontKg, rearKg: totalKg - frontKg, frontPct, rearPct: 100 - frontPct };
}
