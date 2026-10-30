import type { CamperItem, EnergyBalance } from '../types/camper.types';

// Electrical engineering assumptions (PENDING validation by @CamperExpert)
// Nominal voltage of a 12 V LiFePO4 battery.
export const BATTERY_NOMINAL_V = 12.8;
// Usable fraction of capacity (typical depth of discharge for LiFePO4).
export const BATTERY_USABLE_RATIO = 0.8;

// Accumulated budget: Σ priceEur
export function totalPriceEur(items: readonly CamperItem[]): number {
  return items.reduce((sum, item) => sum + item.priceEur, 0);
}

// Energy balance: installed capacity, solar and daily consumption
// Autonomy without sun = usable Ah / Ah consumed per day
export function energyBalance(items: readonly CamperItem[]): EnergyBalance {
  let batteryAh = 0;
  let solarWatts = 0;
  let dailyConsumptionWh = 0;

  for (const item of items) {
    batteryAh += item.electricalSpecs?.batteryCapacityAh ?? 0;
    solarWatts += item.electricalSpecs?.solarWatts ?? 0;
    dailyConsumptionWh += item.electricalSpecs?.dailyConsumptionWh ?? 0;
  }

  const usableAh = batteryAh * BATTERY_USABLE_RATIO;
  const dailyConsumptionAh = dailyConsumptionWh / BATTERY_NOMINAL_V;
  const autonomyDays = dailyConsumptionAh > 0 ? usableAh / dailyConsumptionAh : null;

  return { batteryAh, usableAh, solarWatts, dailyConsumptionWh, dailyConsumptionAh, autonomyDays };
}
