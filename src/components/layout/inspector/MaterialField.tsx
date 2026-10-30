import type { ChangeEvent } from 'react';
import { useProjectStore } from '../../../store/useProjectStore';
import type { CamperItem } from '../../../types/camper.types';
import { findMaterial } from '../../../data/materialsCatalog';
import { BOARD_MATERIALS } from '../../../utils/itemPricing';

// Board material of a parametric module. Bought-in equipment shows its material read-only.
export function MaterialField({ item }: { item: CamperItem }) {
  const setItemMaterial = useProjectStore((state) => state.setItemMaterial);
  const material = findMaterial(item.materialId);
  const editable = item.parametric && !item.locked;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => setItemMaterial(item.id, event.target.value);

  return (
    <div className="space-y-1.5">
      {item.parametric ? (
        <select
          aria-label="Material del tablero"
          value={item.materialId}
          disabled={!editable}
          onChange={handleChange}
          className="w-full rounded-md border border-cad-border bg-cad-bg px-2 py-1 text-xs text-cad-text focus:border-cad-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {BOARD_MATERIALS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-xs text-slate-300" title="Equipo comprado: material fijo">
          {material?.name ?? item.materialId}
        </p>
      )}
      {material && (
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-cad-faint">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-slate-700"
            style={{ backgroundColor: material.texture.baseColor }}
          />
          {material.thicknessMM} mm · {material.densityKgM3} kg/m³ · {material.priceEurM2} €/m²
        </p>
      )}
    </div>
  );
}
