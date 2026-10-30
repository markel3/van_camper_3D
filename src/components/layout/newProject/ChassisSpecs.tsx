import type { VanSpec } from '../../../types/camper.types';
import { formatNumber } from '../telemetry/format';

// «Especificaciones del chasis» table (new-project dialog and the model phase)
export function ChassisSpecs({ van, compact = false }: { van: VanSpec; compact?: boolean }) {
  const rows: [string, string][] = [
    ['Longitud interior', `${formatNumber(van.interiorLengthMM)} mm`],
    ['Altura interior', `${formatNumber(van.interiorHeightMM)} mm`],
    ['Ancho interior', `${formatNumber(van.interiorWidthMM)} mm`],
    ['MMA (Masa Máxima Autorizada)', `${formatNumber(van.mmaKg)} kg`],
    ['Tara', `${formatNumber(van.tareWeightKg)} kg`],
    ['Carga útil disponible', `${formatNumber(van.mmaKg - van.tareWeightKg)} kg`],
  ];
  return (
    <dl className="divide-y divide-cad-border" data-chassis-specs={van.id}>
      {rows.map(([label, value]) => (
        <div key={label} className={`flex items-center justify-between gap-3 ${compact ? 'py-1' : 'px-2 py-2.5'}`}>
          <dt className={`${compact ? 'text-[13px] text-cad-muted' : 'text-[15px] text-cad-text'}`}>{label}</dt>
          <dd className={`shrink-0 font-mono ${compact ? 'text-[12.5px] text-cad-text' : 'text-[14px] text-white'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
