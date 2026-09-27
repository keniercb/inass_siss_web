import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  Scale,
  Wallet,
  Landmark,
  BarChart3,
  ShieldCheck,
  Library,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permiso: string;
}

// Definición de entradas del sidebar por permiso (sección 2.2 matriz rol×módulo×acción)
export const sidebarConfig: SidebarItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permiso: 'cases.view',
  },
  {
    label: 'Personas',
    path: '/personas',
    icon: Users,
    permiso: 'people.view',
  },
  {
    label: 'Entidades',
    path: '/entidades',
    icon: Building2,
    permiso: 'organizations.view',
  },
  {
    label: 'Expedientes',
    path: '/expedientes',
    icon: FolderKanban,
    permiso: 'cases.view',
  },
  {
    label: 'Base legal',
    path: '/bases-legales',
    icon: Scale,
    permiso: 'legalbases.view',
  },
  {
    label: 'Pensionados',
    path: '/pensionados',
    icon: Wallet,
    permiso: 'pensioners.view',
  },
  {
    label: 'Pagos',
    path: '/pagos',
    icon: Landmark,
    permiso: 'payments.view',
  },
  {
    label: 'Reportes',
    path: '/reportes',
    icon: BarChart3,
    permiso: 'reports.view',
  },
  {
    label: 'Auditoría',
    path: '/auditoria',
    icon: ShieldCheck,
    permiso: 'audit.view',
  },
  {
    label: 'Catálogos',
    path: '/catalogos',
    icon: Library,
    permiso: 'catalogs.view',
  },
  {
    label: 'Configuración general',
    path: '/configuracion-general',
    icon: Settings,
    permiso: 'settings.view',
  },
];
