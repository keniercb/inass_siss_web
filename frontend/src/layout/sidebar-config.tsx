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
  UserCog,
  FolderOpen,
  MapPin,
  Banknote,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  label: string;
  path: string;
  icon: LucideIcon;
  permiso: string;
  /** Sub-items para menús colapsables (ej. Catálogos con 16 tipos) */
  children?: SidebarItem[];
}

// Sub-menú de catálogos: 16 tipos uniformes + municipios + agencias
const catalogChildren: SidebarItem[] = [
  { label: 'Provincias', path: '/catalogos/provinces', icon: MapPin, permiso: 'catalogs.view' },
  { label: 'Tipos de agencia', path: '/catalogos/agency-types', icon: Banknote, permiso: 'catalogs.view' },
  { label: 'Organismos', path: '/catalogos/organizations', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de entidad', path: '/catalogos/entity-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de oficina', path: '/catalogos/office-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de base legal', path: '/catalogos/legal-basis-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Categorías científicas', path: '/catalogos/scientific-categories', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Niveles educacionales', path: '/catalogos/educational-levels', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Categorías ocupacionales', path: '/catalogos/occupational-categories', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de pensión', path: '/catalogos/pension-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de beneficiario', path: '/catalogos/beneficiary-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Razas', path: '/catalogos/races', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Cargos', path: '/catalogos/positions', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Régimenes de pensión', path: '/catalogos/pension-regimes', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Tipos de pago', path: '/catalogos/payment-types', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Conceptos de ingreso', path: '/catalogos/income-concepts', icon: FolderOpen, permiso: 'catalogs.view' },
  { label: 'Municipios', path: '/catalogos/municipios', icon: MapPin, permiso: 'catalogs.view' },
  { label: 'Agencias bancarias', path: '/catalogos/agencias', icon: Banknote, permiso: 'catalogs.view' },
];

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
    children: catalogChildren,
  },
  {
    label: 'Configuración general',
    path: '/configuracion-general',
    icon: Settings,
    permiso: 'settings.view',
  },
  {
    label: 'Usuarios',
    path: '/usuarios',
    icon: UserCog,
    permiso: 'users.view',
  },
];
