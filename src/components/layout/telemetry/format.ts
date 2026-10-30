// Number formatting for telemetry readouts (es-ES style: "3.500" and "1.234,5").
// Grouping is done by hand so the output does not depend on runtime ICU data.

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';

  const fixed = value.toFixed(decimals);
  const negative = fixed.startsWith('-');
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [intPart = '0', fracPart] = unsigned.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative ? '-' : '';

  return fracPart === undefined ? `${sign}${grouped}` : `${sign}${grouped},${fracPart}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)} %`;
}

// Clamps a value to the 0-100 range, for drawing bar widths only.
export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
