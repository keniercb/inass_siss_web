import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth-store';
import { FolderKanban, Users, Wallet, BarChart3, type LucideIcon } from 'lucide-react';

interface QuickCard {
  label: string;
  value: string;
  icon: LucideIcon;
  permiso: string;
  color: string;
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  void useTranslation('common');

  // Datos de ejemplo (placeholder hasta que el backend publique /dashboard endpoint)
  const cards: QuickCard[] = [
    {
      label: 'Expedientes pendientes',
      value: '12',
      icon: FolderKanban,
      permiso: 'cases.view',
      color: 'text-blue-600',
    },
    {
      label: 'Personas registradas',
      value: '3.478',
      icon: Users,
      permiso: 'people.view',
      color: 'text-emerald-600',
    },
    {
      label: 'Pensionados activos',
      value: '892',
      icon: Wallet,
      permiso: 'pensioners.view',
      color: 'text-amber-600',
    },
    {
      label: 'Reportes generados',
      value: '47',
      icon: BarChart3,
      permiso: 'reports.view',
      color: 'text-purple-600',
    },
  ];

  const visibleCards = cards.filter((c) => hasPermission(c.permiso));

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Bienvenido, {user?.name?.split(' ')[0] ?? ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rol: <span className="font-medium text-primary">{roles[0] ?? '—'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {visibleCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-lg border border-border p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold text-foreground mt-1">{card.value}</p>
              </div>
              <div className={`p-2 rounded-md bg-muted ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-sm font-medium text-foreground mb-4">
          Estado del sistema
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Frontend:</span>{' '}
            v1.0.0 (FE-S0 Setup) — listo para implementar módulos.
          </p>
          <p>
            <span className="font-medium text-foreground">Backend:</span>{' '}
            En construcción. Endpoints disponibles: Auth, Catalogs, Settings.
          </p>
          <p>
            <span className="font-medium text-foreground">Próximo sprint:</span>{' '}
            FE-S1 — Layout + Login + RBAC con roles del backend real.
          </p>
        </div>
      </div>
    </div>
  );
}
