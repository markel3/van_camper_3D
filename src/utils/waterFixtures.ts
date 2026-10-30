// Modules with running water that the user can turn on (kitchen tap, shower). Catalogue ids only:
// the water itself is drawn by canvas/water/* and toggled through useInteractionStore.

export type WaterFixtureKind = 'tap' | 'shower';

const WATER_FIXTURES: Readonly<Record<string, WaterFixtureKind>> = {
  'kitchen-block-1000': 'tap',
  'shower-cabin-800': 'shower',
};

export const waterFixtureOf = (catalogId: string): WaterFixtureKind | null => WATER_FIXTURES[catalogId] ?? null;

// Spanish UI labels: [noun, open verb, close verb]
export const WATER_FIXTURE_LABEL: Record<WaterFixtureKind, { noun: string; on: string; off: string }> = {
  tap: { noun: 'grifo', on: 'Abrir grifo', off: 'Cerrar grifo' },
  shower: { noun: 'ducha', on: 'Abrir ducha', off: 'Cerrar ducha' },
};
