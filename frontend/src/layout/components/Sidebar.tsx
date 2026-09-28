import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useUIStore } from '@/store/ui-store';
import { sidebarConfig, type SidebarItem } from '../sidebar-config';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const tienePermiso = usePermiso();
  const { t } = useTranslation('common');
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const items = sidebarConfig.filter((item) => tienePermiso(item.permiso));
  const location = useLocation();

  // Estado local: cuáles submenús están expandidos.
  // Por defecto, expandir el submenú cuyo hijo coincide con la ruta actual.
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    items.forEach((item) => {
      if (item.children) {
        const childMatch = item.children.some(
          (child) =>
            location.pathname === child.path ||
            location.pathname.startsWith(`${child.path}/`),
        );
        if (childMatch) expanded.add(item.path);
      }
    });
    return expanded;
  });

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'app-layout__sidebar text-sidebar-fg flex flex-col transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Navegación lateral"
    >
      {/* Header del sidebar */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-center">
        {collapsed ? (
          <span className="text-xs font-semibold text-sidebar-active" title={t('app.title')}>
            SGP
          </span>
        ) : (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
            {t('app.title')}
          </h2>
        )}
      </div>

      {/* Items de navegación */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {items.map((item) => (
          <SidebarItemRender
            key={item.path}
            item={item}
            collapsed={collapsed}
            expanded={expandedMenus.has(item.path)}
            onToggle={() => toggleMenu(item.path)}
            currentPath={location.pathname}
          />
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div
        className={cn(
          'px-4 py-2 border-t border-white/10 text-xs text-sidebar-muted',
          collapsed ? 'text-center' : 'text-left',
        )}
        title={collapsed ? t('app.version') : undefined}
      >
        {collapsed ? 'v1' : t('app.version')}
      </div>
    </aside>
  );
}

interface SidebarItemRenderProps {
  item: SidebarItem;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  currentPath: string;
}

function SidebarItemRender({ item, collapsed, expanded, onToggle, currentPath }: SidebarItemRenderProps) {
  const isActive =
    currentPath === item.path || currentPath.startsWith(`${item.path}/`);

  // Si tiene hijos y NO está colapsado, renderiza como submenú colapsable
  if (item.children && !collapsed) {
    return (
      <div>
        {/* Botón padre (toggle, no navega) */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
            'border-l-2 border-transparent',
            'whitespace-nowrap',
            isActive
              ? 'bg-white/10 border-sidebar-active text-white font-medium'
              : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
          )}
          aria-expanded={expanded}
        >
          <item.icon
            className={cn(
              'w-4 h-4 shrink-0',
              isActive ? 'text-sidebar-active' : 'text-sidebar-muted',
            )}
          />
          <span className="truncate flex-1 text-left">{item.label}</span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )}
        </button>

        {/* Hijos (animados) */}
        {expanded && (
          <div className="bg-black/20">
            {item.children.map((child) => {
              const childActive =
                currentPath === child.path ||
                currentPath.startsWith(`${child.path}/`);
              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={cn(
                    'flex items-center gap-3 py-2 text-sm transition-colors',
                    'border-l-2 border-transparent',
                    'whitespace-nowrap pl-8 pr-4',
                    childActive
                      ? 'border-sidebar-active text-white font-medium bg-white/5'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
                  )}
                >
                  <child.icon
                    className={cn(
                      'w-3.5 h-3.5 shrink-0',
                      childActive ? 'text-sidebar-active' : 'text-sidebar-muted',
                    )}
                  />
                  <span className="truncate">{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Sin hijos o colapsado: renderiza como link simple
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
        'border-l-2 border-transparent whitespace-nowrap',
        collapsed && 'justify-center px-0',
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
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
