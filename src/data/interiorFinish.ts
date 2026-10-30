import type { CeilingFinish, FloorFinish, VanInteriorFinish, WallFinish } from '../types/camper.types';

// Interior lining options (Interior menu). New projects (and files saved before the menu existed)
// start fully lined: warm pine tongue-and-groove walls, pine slat ceiling with warm LEDs, oak floor.
export const DEFAULT_INTERIOR_FINISH: VanInteriorFinish = {
  ceiling: 'woodSlats',
  floor: 'oak',
  walls: 'warmWood',
  ledStrips: true,
  insulation: [],
};

export const CEILING_FINISHES: readonly { id: CeilingFinish; label: string }[] = [
  { id: 'bare', label: 'Chapa desnuda' },
  { id: 'woodSlats', label: 'Listones de madera natural' },
];

export const FLOOR_FINISHES: readonly { id: FloorFinish; label: string }[] = [
  { id: 'bare', label: 'Suelo de carga' },
  { id: 'oak', label: 'Tarima laminada roble' },
  { id: 'pine', label: 'Tarima laminada pino' },
];

export const WALL_FINISHES: readonly { id: WallFinish; label: string }[] = [
  { id: 'bare', label: 'Chapa desnuda' },
  { id: 'warmWood', label: 'Friso de pino machihembrado' },
  { id: 'lightWood', label: 'Madera clara' },
  { id: 'offWhite', label: 'Panelado blanco roto' },
];
