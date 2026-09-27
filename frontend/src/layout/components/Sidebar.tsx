import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermiso } from '@/hooks/use-permiso';
import { sidebarConfig } from '../sidebar-config';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const tienePermiso = usePermiso();
  const { t } = useTranslation('common');
  const items = sidebarConfig.filter((item) => tienePermiso(item.permiso));
  const location = useLocation();

  return (
    <aside className="app-layout__sidebar w-64 text-sidebar-fg flex flex-col">
      {/* Header del sidebar */}
      <div className="px-4 py-4 border-b border-white/10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
          {t('app.title')}
        </h2>
      </div>

      {/* Items de navegación filtrados por permiso */}
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                'border-l-2 border-transparent',
                isActive
                  ? 'bg-white/10 border-sidebar-active text-white font-medium'
                  : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive ? 'text-sidebar-active' : 'text-sidebar-muted',
                )}
              />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-4 py-2 border-t border-white/10 text-xs text-sidebar-muted">
        {t('app.version')}
      </div>
    </aside>
  );
}
