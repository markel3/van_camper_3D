import { Euro } from 'lucide-react';
import { TelemetrySection } from './TelemetrySection';
import { formatNumber } from './format';

interface BudgetSectionProps {
  budgetEur: number;
}

// Accumulated budget of all placed modules.
export function BudgetSection({ budgetEur }: BudgetSectionProps) {
  return (
    <TelemetrySection title="Presupuesto" icon={Euro} iconTooltip="Coste acumulado de los módulos">
      <p className="font-mono text-lg leading-none text-slate-100">{formatNumber(budgetEur, 2)} €</p>
      <p className="text-xs text-cad-faint">Acumulado de todos los módulos</p>
    </TelemetrySection>
  );
}
