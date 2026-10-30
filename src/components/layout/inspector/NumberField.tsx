import type { FocusEvent, KeyboardEvent } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  title?: string;
  onCommit: (value: number) => void;
}

// Numeric input that commits on blur or Enter (one undo step per edit, not per keystroke).
// Escape or an invalid entry restores the current value. Accepts "," as decimal separator.
export function NumberField({ label, value, unit, min, max, disabled = false, title, onCommit }: NumberFieldProps) {
  const commit = (event: FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const parsed = Number(input.value.trim().replace(',', '.'));
    const valid = input.value.trim() !== '' && Number.isFinite(parsed) && (min === undefined || parsed >= min) && (max === undefined || parsed <= max);
    if (!valid) {
      input.value = String(value);
      return;
    }
    if (parsed !== value) onCommit(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      event.currentTarget.value = String(value);
      event.currentTarget.blur();
    }
  };

  return (
    <label className="flex items-center gap-2" title={title}>
      <span className="w-4 text-[11px] font-medium text-cad-muted">{label}</span>
      <span className="flex min-w-0 flex-1 items-center rounded-md border border-cad-border bg-cad-bg px-2 focus-within:border-cad-accent">
        <input
          // Remount when the store value changes so the field always shows the live value
          key={value}
          type="text"
          inputMode="decimal"
          defaultValue={value}
          disabled={disabled}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full min-w-0 bg-transparent py-1 font-mono text-xs text-cad-text focus:outline-none disabled:text-cad-faint"
        />
        <span className="font-mono text-[10px] text-cad-faint">{unit}</span>
      </span>
    </label>
  );
}
