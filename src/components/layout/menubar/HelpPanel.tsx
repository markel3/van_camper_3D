const SHORTCUTS: readonly [string, string][] = [
  ['Ctrl+Z', 'Deshacer'],
  ['Ctrl+Y / Ctrl+Shift+Z', 'Rehacer'],
  ['Ctrl+S', 'Guardar proyecto'],
  ['Supr / Retroceso', 'Eliminar módulo seleccionado'],
  ['Esc', 'Deseleccionar'],
  ['Clic izq. + arrastrar', 'Orbitar la cámara'],
  ['Clic der. + arrastrar', 'Desplazar la vista'],
  ['Rueda', 'Zoom'],
];

// Help popover of the menu bar: keyboard and mouse shortcuts
export function HelpPanel() {
  return (
    <div className="w-80 rounded-md border border-cad-border bg-cad-panel p-3 text-[13px] shadow-2xl shadow-black/50">
      <p className="mb-2 font-medium text-white">Atajos de teclado y ratón</p>
      <dl className="space-y-1">
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className="flex justify-between gap-3">
            <dt className="font-mono text-[11.5px] text-cad-accent-hi">{keys}</dt>
            <dd className="text-right text-cad-muted">{action}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-cad-border pt-2 text-xs text-cad-faint">
        Selecciona un módulo del catálogo para insertarlo; muévelo con el gizmo o escribe sus medidas en Propiedades.
      </p>
    </div>
  );
}
