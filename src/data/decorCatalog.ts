import type { CatalogItemDef } from '../types/camper.types';

// Decoration and soft furnishings (category 'decor', drawn on the Decoration layer). They count
// in mass, CoG, budget and collisions like any module. Non-parametric: bought-in items.
// WARNING: dimensions, weights and prices are approximate Spanish retail references (2026).
export const DECOR_CATALOG: readonly CatalogItemDef[] = [
  {
    catalogId: 'decor-hanging-plant',
    mount: 'overhead',
    name: 'Planta colgante en macramé',
    category: 'decor',
    // Ceiling hook to the bottom of the trailing stems
    dimensions: { width: 280, height: 750, depth: 280 },
    parametric: false,
    weightKg: 1.8,
    priceEur: 38,
    materialId: 'ceramica',
  },
  {
    catalogId: 'decor-potted-plant',
    name: 'Planta en maceta',
    category: 'decor',
    dimensions: { width: 180, height: 280, depth: 190 },
    parametric: false,
    weightKg: 1.3,
    priceEur: 22,
    materialId: 'ceramica',
  },
  {
    catalogId: 'decor-linen-cushions',
    name: 'Cojines de lino (2 uds.)',
    category: 'decor',
    dimensions: { width: 900, height: 450, depth: 300 },
    parametric: false,
    weightKg: 1.2,
    priceEur: 58,
    materialId: 'lino-natural',
  },
  {
    catalogId: 'decor-led-string',
    mount: 'overhead',
    name: 'Luces LED cálidas (guirnalda 12V)',
    category: 'decor',
    dimensions: { width: 1500, height: 200, depth: 60 },
    parametric: false,
    weightKg: 0.3,
    priceEur: 24,
    materialId: 'plastico-abs',
    // 3 W for ~5 h a day
    electricalSpecs: { dailyConsumptionWh: 15 },
  },
  {
    catalogId: 'decor-coffee-set',
    name: 'Cafetera y menaje',
    category: 'decor',
    dimensions: { width: 460, height: 310, depth: 260 },
    parametric: false,
    weightKg: 2.6,
    priceEur: 85,
    materialId: 'ceramica',
  },
  {
    catalogId: 'decor-jute-rug',
    name: 'Alfombra de yute',
    category: 'decor',
    dimensions: { width: 1200, height: 10, depth: 600 },
    parametric: false,
    weightKg: 1.6,
    priceEur: 45,
    materialId: 'yute',
  },
  {
    catalogId: 'decor-surfboard',
    // Carried flat under the ceiling on two straps
    mount: 'overhead',
    name: 'Tabla de surf 6\'0" (en techo)',
    category: 'decor',
    dimensions: { width: 530, height: 130, depth: 1830 },
    parametric: false,
    weightKg: 3.2,
    priceEur: 450,
    materialId: 'hdpe',
  },
  {
    catalogId: 'decor-books',
    name: 'Libros',
    category: 'decor',
    dimensions: { width: 260, height: 240, depth: 170 },
    parametric: false,
    weightKg: 3,
    priceEur: 40,
    // Paper: wood fibre, the closest catalogue material
    materialId: 'chopo-15mm',
  },
];
