import { AppWindow, BatteryCharging, BedDouble, CookingPot, Droplets, ShowerHead, Sprout, type LucideIcon } from 'lucide-react';
import type { CatalogItemDef, CategoryType } from '../../../types/camper.types';
import { formatNumber } from '../telemetry/format';
import { Thumbnail } from './Thumbnail';

export const CATEGORY_ICONS: Record<CategoryType, LucideIcon> = {
  structure: BedDouble,
  kitchen: CookingPot,
  bathroom: ShowerHead,
  electrical: BatteryCharging,
  water: Droplets,
  openings: AppWindow,
  decor: Sprout,
};

interface CardProps {
  def: CatalogItemDef;
  onInsert: (def: CatalogItemDef) => void;
}

const sizeLabel = (def: CatalogItemDef) =>
  `${def.dimensions.width}×${def.dimensions.height}×${def.dimensions.depth} mm · ${formatNumber(def.weightKg, 1)} kg · ${formatNumber(def.priceEur)} €`;

// Grid card: thumbnail + name. Click inserts the module (WORKFLOWS.md, Flow 2).
export function CatalogCard({ def, onInsert }: CardProps) {
  return (
    <button
      type="button"
      data-catalog-item={def.catalogId}
      title={`Añadir ${def.name}\n${sizeLabel(def)}`}
      onClick={() => onInsert(def)}
      className="group flex flex-col overflow-hidden rounded-md border border-cad-line bg-cad-raised text-left transition-colors hover:border-cad-accent focus-visible:border-cad-accent focus-visible:outline-none"
    >
      <Thumbnail id={def.catalogId} alt={def.name} fallbackIcon={CATEGORY_ICONS[def.category]} className="aspect-square w-full rounded-none" />
      <span className="line-clamp-2 min-h-[2.4em] px-1.5 pt-1 text-center text-[12.5px] leading-tight text-cad-text group-hover:text-white">
        {def.name}
      </span>
      <span className="pb-1.5 text-center font-mono text-[10.5px] text-cad-faint">{formatNumber(def.priceEur)} €</span>
    </button>
  );
}

// List row (Instalaciones): thumbnail on the left, name, weight and price
export function CatalogRow({ def, onInsert }: CardProps) {
  return (
    <button
      type="button"
      data-catalog-item={def.catalogId}
      title={`Añadir ${def.name}\n${sizeLabel(def)}`}
      onClick={() => onInsert(def)}
      className="group flex w-full items-stretch gap-2.5 rounded-md border border-cad-line bg-cad-raised p-1.5 text-left transition-colors hover:border-cad-accent focus-visible:border-cad-accent focus-visible:outline-none"
    >
      <Thumbnail id={def.catalogId} alt={def.name} fallbackIcon={CATEGORY_ICONS[def.category]} className="h-16 w-16 shrink-0" />
      <span className="flex min-w-0 flex-col justify-center gap-0.5">
        <span className="line-clamp-2 text-[13px] leading-tight text-cad-text group-hover:text-white">{def.name}</span>
        <span className="font-mono text-[11px] text-cad-muted">{formatNumber(def.weightKg, 1)} kg</span>
        <span className="font-mono text-[11px] text-cad-muted">{formatNumber(def.priceEur, 2)} €</span>
      </span>
    </button>
  );
}
