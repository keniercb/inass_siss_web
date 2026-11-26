import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, FileText, Users, Landmark, LayoutDashboard, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS: { to: string; end: boolean; icon: typeof FileText; key: 'index' | 'cases' | 'pensioners' | 'bank_controls' | 'dashboard' | 'exports' }[] = [
  { to: '/reportes', end: true, icon: LayoutDashboard, key: 'index' },
  { to: '/reportes/expedientes', end: false, icon: FileText, key: 'cases' },
  { to: '/reportes/pensionados', end: false, icon: Users, key: 'pensioners' },
  { to: '/reportes/controles-bancarios', end: false, icon: Landmark, key: 'bank_controls' },
  { to: '/reportes/tablero', end: false, icon: BarChart3, key: 'dashboard' },
  { to: '/reportes/exportaciones', end: false, icon: Download, key: 'exports' },
];

export function ReportsLayout() {
  const { t } = useTranslation('reports');
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('index.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('index.description')}</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
                )
              }
            >
              <Icon className="w-4 h-4" />
              {t(`nav.${tab.key}`)}
            </NavLink>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
