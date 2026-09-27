import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { useLocation } from 'react-router-dom';
import { UserDropdown } from './UserDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';

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
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
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
          className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
          title={sidebarCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
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

      {/* Centro: vacío (sin búsqueda global — eliminada por decisión del cliente en FE-S0) */}
      <div className="flex-1" />

      {/* Derecha: idioma + user dropdown */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <UserDropdown />
      </div>
    </header>
  );
}
