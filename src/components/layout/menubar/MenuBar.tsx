import { useCallback, useRef, useState } from 'react';
import { Caravan, CircleHelp, Wallet } from 'lucide-react';
import { useMenuDismiss } from '../../../hooks/useMenuDismiss';
import { useEngineeringMetrics } from '../../../hooks/useEngineeringMetrics';
import { MenuList } from '../../ui/MenuList';
import { Popover } from '../../ui/Popover';
import type { MenuEntry } from '../../ui/menuTypes';
import { formatNumber } from '../telemetry/format';
import { useEditMenu, useExportMenu, useFileMenu } from './useFileEditMenus';
import { useRenderMenu, useToolsMenu } from './useToolsRenderMenus';
import { useUiStatus } from './projectActions';
import { HelpPanel } from './HelpPanel';

// Desktop-style menu bar: logo, Archivo · Editar · Herramientas · Render · Exportar, status and budget
export function MenuBar() {
  const menus: { label: string; entries: MenuEntry[] }[] = [
    { label: 'Archivo', entries: useFileMenu() },
    { label: 'Editar', entries: useEditMenu() },
    { label: 'Herramientas', entries: useToolsMenu() },
    { label: 'Render', entries: useRenderMenu() },
    { label: 'Exportar', entries: useExportMenu() },
  ];
  const [open, setOpen] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setOpen(null), []);
  useMenuDismiss(open !== null, close, rootRef);
  const status = useUiStatus((state) => state.status);
  const budgetEur = useEngineeringMetrics().budgetEur;

  return (
    <header className="flex h-10 shrink-0 items-center gap-3 border-b border-cad-border bg-cad-chrome px-3">
      <div className="flex items-center gap-2 pr-2">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-cad-accent text-white">
          <Caravan size={15} strokeWidth={2} />
        </span>
        <span className="whitespace-nowrap text-[13px] font-semibold tracking-wide text-white">CamperStudio 3D</span>
      </div>

      <nav ref={rootRef} className="flex h-full items-center" aria-label="Menú principal">
        {menus.map(({ label, entries }, index) => (
          <div key={label} className="relative h-full">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open === index}
              data-menu={label}
              onClick={() => setOpen(open === index ? null : index)}
              // Desktop behaviour: once a menu is open, hovering another title switches to it
              onMouseEnter={() => open !== null && setOpen(index)}
              className={`flex h-full items-center px-3 text-[14px] transition-colors ${
                open === index ? 'bg-cad-hover text-white' : 'text-cad-text hover:bg-cad-hover/60'
              }`}
            >
              {label}
            </button>
            {open === index && (
              <div className="absolute left-0 top-full z-50 mt-px">
                <MenuList entries={entries} onClose={close} label={label} />
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1 text-center">
        {status && (
          <span
            role="status"
            title={status.text}
            className={`inline-block max-w-full truncate text-xs ${status.tone === 'ok' ? 'text-cad-ok-hi' : 'text-red-400'}`}
          >
            {status.text}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-2 rounded px-2 py-1 text-[13px] text-cad-muted"
        title="Presupuesto acumulado (módulos + aislamiento)"
        data-menubar-budget
      >
        <Wallet size={16} />
        <span className="hidden lg:inline">Presupuesto</span>
        <span className="font-mono text-cad-ok-hi">{formatNumber(budgetEur)} €</span>
      </div>
      <Popover
        placement="bottom-end"
        trigger={(isOpen, toggle) => (
          <button
            type="button"
            aria-label="Ayuda y atajos de teclado"
            title="Ayuda y atajos de teclado"
            aria-expanded={isOpen}
            onClick={toggle}
            className={`flex h-7 w-7 items-center justify-center rounded-full ${isOpen ? 'bg-cad-hover text-white' : 'text-cad-muted hover:text-white'}`}
          >
            <CircleHelp size={17} />
          </button>
        )}
      >
        {() => <HelpPanel />}
      </Popover>
    </header>
  );
}
