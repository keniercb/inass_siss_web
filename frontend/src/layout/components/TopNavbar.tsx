import { useTranslation } from 'react-i18next';
import { Menu, Search } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useLocation } from 'react-router-dom';
import { UserDropdown } from './UserDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';
import { cn } from '@/lib/utils';

// Mapa de rutas a claves de breadcrumb
const breadcrumbLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/personas': 'Personas',
  '/entidades': 'Entidades',
  '/expedientes': 'Expedientes',
  '/bases-legales': 'Base legal',
  '/pensionados': 'Pensionados',
  '/pagos': 'Pagos',
  '/reportes': 'Reportes',
  '/auditoria': 'Auditoría',
  '/catalogos': 'Catálogos',
};

export function TopNavbar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { t } = useTranslation('common');
  const location = useLocation();

  // Breadcrumb derivado de la ruta actual
  const currentLabel = breadcrumbLabels[location.pathname] ?? null;

  return (
    <header className="app-layout__topnavbar bg-white border-b border-border flex items-center justify-between px-4">
      {/* Izquierda: toggle + logo + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            SGP
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            {t('app.title')}
          </span>
        </div>

        {currentLabel && (
          <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground ml-4">
            <span>{t('app.title')}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground font-medium">{currentLabel}</span>
          </nav>
        )}
      </div>

      {/* Centro: búsqueda global (placeholder para futuro) */}
      <div className="flex-1 max-w-md hidden lg:flex mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`${t('actions.search')}…`}
            className={cn(
              'w-full pl-9 pr-3 py-1.5 text-sm rounded-md',
              'border border-input bg-muted',
              'focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary',
              'outline-none transition-colors',
            )}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-white border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Derecha: idioma + user dropdown */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <UserDropdown />
      </div>
    </header>
  );
}
