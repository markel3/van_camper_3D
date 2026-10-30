import { Copy, RotateCw, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CamperItem, DimensionsMM, Vector3Tuple } from '../../../types/camper.types';
import { BOARD_HORIZONTAL, BOARD_VERTICAL, WOOD_SLAT, boardThicknessMM, isBoardPiece } from '../../../utils/boardPieces';
import { sizeLimits } from '../../../utils/resizeLimits';
import { canMoveVertically } from '../../../utils/verticalMove';
import { isSurfaceSnapped } from '../../../utils/surfaceSnap';
import { mmToM, mToMm } from '../../../utils/unitConverters';
import { ItemFlagsBar } from '../inspector/ItemFlagsBar';
import { NumberField } from '../inspector/NumberField';
import { AdaptationSection } from '../inspector/AdaptationSection';
import { CollisionWarning } from '../inspector/CollisionWarning';
import { MaterialField } from '../inspector/MaterialField';
import { OpenCloseButton } from '../inspector/OpenCloseButton';
import { WaterTapButton } from '../inspector/WaterTapButton';
import { BoardSection } from './BoardSection';
import { BoardOrientationButtons } from './BoardOrientation';
import { Section, StatRow } from '../../ui/Panel';
import { formatNumber } from '../telemetry/format';

const SUBTITLE = 'mb-1.5 mt-3 text-[11px] font-semibold uppercase tracking-wider text-cad-faint';
const BUTTON =
  'flex items-center gap-1.5 rounded-md border border-cad-border px-2 py-1 text-xs text-cad-text transition-colors hover:bg-cad-hover disabled:cursor-not-allowed disabled:opacity-40';

const CATEGORY_LABELS: Record<CamperItem['category'], string> = {
  structure: 'Carpintería',
  kitchen: 'Cocina',
  bathroom: 'Baño',
  electrical: 'Electricidad',
  water: 'Agua',
  openings: 'Aberturas y techo',
  decor: 'Decoración',
};

// Selected module: exact position, dimensions, material, rotation, open/close, lock/hide,
// collisions and delete (WORKFLOWS.md, Flow 3-4)
export function ItemInspector({ item }: { item: CamperItem }) {
  const moveItem = useProjectStore((state) => state.moveItem);
  const resizeItem = useProjectStore((state) => state.resizeItem);
  const rotateItemQuarterTurn = useProjectStore((state) => state.rotateItemQuarterTurn);
  const removeItem = useProjectStore((state) => state.removeItem);
  const duplicateItem = useProjectStore((state) => state.duplicateItem);
  const van = useProjectStore((state) => state.van);
  const limits = item.parametric ? sizeLimits(van, item.catalogId) : undefined;

  const setAxis = (axis: keyof Vector3Tuple, mm: number) => moveItem(item.id, { ...item.position, [axis]: mmToM(mm) });
  const setDimension = (key: keyof DimensionsMM, mm: number) => resizeItem(item.id, { [key]: mm });
  const rotationDeg = ((Math.round((item.rotation.y * 180) / Math.PI) % 360) + 360) % 360;
  const fixedSizeHint = item.parametric ? undefined : 'Módulo de medidas fijas';
  // Board pieces: the thickness (or batten section) is the material's, never a free dimension
  const lockedKeys: readonly (keyof DimensionsMM)[] =
    item.catalogId === BOARD_HORIZONTAL ? ['height'] : item.catalogId === BOARD_VERTICAL ? ['depth'] : item.catalogId === WOOD_SLAT ? ['height', 'depth'] : [];
  const lockedHint = item.catalogId === WOOD_SLAT ? 'Sección 40 × 40 mm' : `Grosor del material (${boardThicknessMM(item.materialId)} mm)`;
  const yHint = !canMoveVertically(item.catalogId)
    ? 'La altura la fija el techo'
    : isSurfaceSnapped(item.catalogId)
      ? 'Se apoya en la superficie libre más cercana (suelo, tablero, colchón)'
      : undefined;

  return (
    <Section title={CATEGORY_LABELS[item.category]} right={<ItemFlagsBar item={item} />}>
      <div data-inspector>
        <p className="text-[13px] font-medium text-white">{item.name}</p>
        {!item.visible && <p className="mt-1 text-[11px] text-sky-300/80">Oculto en el visor; sigue contando en peso y colisiones</p>}
        {item.hasCollision && (
          <div className="mt-2">
            <CollisionWarning itemId={item.id} />
          </div>
        )}

        <h4 className={SUBTITLE}>Dimensiones (mm)</h4>
        {isBoardPiece(item.catalogId) && <BoardOrientationButtons item={item} />}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['width', 'An'],
              ['height', 'Al'],
              ['depth', 'Pr'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <NumberField
                label={label}
                value={item.dimensions[key]}
                unit=""
                min={limits?.min[key] ?? 1}
                max={limits?.max[key]}
                disabled={item.locked || !item.parametric || lockedKeys.includes(key)}
                title={lockedKeys.includes(key) ? lockedHint : fixedSizeHint}
                onCommit={(mm) => setDimension(key, mm)}
              />
              {limits && !lockedKeys.includes(key) && (
                <p className="mt-0.5 pl-6 font-mono text-[10px] text-cad-faint">
                  {limits.min[key]}–{limits.max[key]}
                </p>
              )}
            </div>
          ))}
        </div>

        <h4 className={SUBTITLE}>Posición (mm)</h4>
        <div className="grid grid-cols-3 gap-1.5">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <NumberField
              key={axis}
              label={axis.toUpperCase()}
              value={Math.round(mToMm(item.position[axis]))}
              unit=""
              min={axis === 'y' ? 0 : undefined}
              disabled={item.locked || (axis === 'y' && !canMoveVertically(item.catalogId))}
              title={axis === 'y' ? yHint : undefined}
              onCommit={(mm) => setAxis(axis, mm)}
            />
          ))}
        </div>

        {item.parametric && <BoardSection item={item} />}

        <AdaptationSection item={item} />

        <h4 className={SUBTITLE}>Material</h4>
        <MaterialField item={item} />

        <h4 className={SUBTITLE}>Rotación</h4>
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-xs text-cad-text">{rotationDeg}°</span>
          <OpenCloseButton item={item} className={BUTTON} />
          <WaterTapButton item={item} className={BUTTON} />
          <button
            type="button"
            title="Rotar 90° sobre el eje vertical"
            disabled={item.locked}
            onClick={() => rotateItemQuarterTurn(item.id)}
            className={BUTTON}
          >
            <RotateCw size={13} />
            Rotar 90°
          </button>
        </div>

        <div className="mt-3 border-t border-cad-border pt-2">
          <StatRow label="Peso" value={`${formatNumber(item.weightKg, 1)} kg`} />
          <StatRow label="Precio" value={`${formatNumber(item.priceEur, 2)} €`} tone="ok" />
        </div>

        <button
          type="button"
          title="Duplicar (Ctrl+D)"
          disabled={item.locked}
          onClick={() => duplicateItem(item.id)}
          className={`${BUTTON} mt-3 w-full justify-center`}
        >
          <Copy size={13} />
          Duplicar (Ctrl+D)
        </button>

        <button
          type="button"
          title="Eliminar módulo"
          disabled={item.locked}
          onClick={() => removeItem(item.id)}
          className={`${BUTTON} mt-2 w-full justify-center border-red-900/60 text-red-300 hover:bg-red-950/40`}
        >
          <Trash2 size={13} />
          Eliminar
        </button>
      </div>
    </Section>
  );
}
