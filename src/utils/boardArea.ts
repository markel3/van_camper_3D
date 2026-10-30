import { Vector3 } from 'three';
import type { CamperItem } from '../types/camper.types';
import { MATERIALS_CATALOG } from '../data/materialsCatalog';
import { localShape } from './shapes/itemShape';

// Board cut list of a module from its real parts (utils/shapes): every part thin enough to be a
// panel counts with the area of its two largest sides. Upholstery, mattresses and hardware are
// skipped. Used by the Inspector's board breakdown (m²) for DIY carpentry.

// Thickest part still read as a board (a 40 mm worktop is a board, a 120 mm mattress is not)
const MAX_BOARD_M = 0.045;
const NOT_BOARD = /^(mattress|duvet|pillow|seat|backrest|back$|cushion|pull|handle|kick|gasket|tray|bowl|tap|glass)/;

// Spanish names of the part families (part id without its index or side)
const FAMILY_LABEL: Record<string, string> = {
  side: 'Laterales',
  back: 'Trasera',
  backboard: 'Respaldo (tablero)',
  top: 'Tapa / encimera',
  lid: 'Tapa',
  door: 'Puertas / frentes',
  front: 'Frentes',
  bottom: 'Fondo',
  shelf: 'Baldas',
  divider: 'Divisores',
  slats: 'Somier (listones)',
  rail: 'Largueros',
  post: 'Patas',
  frame: 'Bastidor',
  board: 'Tablero',
  slat: 'Listón',
  panel: 'Paneles',
  wall: 'Paredes',
  drawer: 'Cajones',
};

export interface BoardRow {
  family: string;
  label: string;
  count: number;
  areaM2: number;
}

export interface BoardBreakdown {
  rows: BoardRow[];
  totalM2: number;
  thicknessMM: number | null; // nominal thickness of the module's board material
}

const familyOf = (id: string): string => id.replace(/(-(left|right|front|rear|top|bottom|\d+))+$/, '').split('-')[0] ?? id;

export function boardBreakdown(item: Pick<CamperItem, 'catalogId' | 'dimensions' | 'materialId'>): BoardBreakdown {
  const material = MATERIALS_CATALOG.find((m) => m.id === item.materialId);
  const rows = new Map<string, BoardRow>();
  const size = new Vector3();
  for (const { id, box } of localShape(item.catalogId, item.dimensions, material?.thicknessMM).parts) {
    if (NOT_BOARD.test(id)) continue;
    const [a, b, c] = box.getSize(size).toArray().sort((x, y) => x - y);
    if (a > MAX_BOARD_M) continue;
    const family = familyOf(id);
    const row = rows.get(family) ?? { family, label: FAMILY_LABEL[family] ?? family, count: 0, areaM2: 0 };
    row.count += 1;
    row.areaM2 += b * c;
    rows.set(family, row);
  }
  const list = [...rows.values()]
    .map((row) => ({ ...row, areaM2: Math.round(row.areaM2 * 1000) / 1000 }))
    .sort((x, y) => y.areaM2 - x.areaM2);
  const totalM2 = Math.round(list.reduce((sum, row) => sum + row.areaM2, 0) * 1000) / 1000;
  return { rows: list, totalM2, thicknessMM: material?.thicknessMM ?? null };
}
