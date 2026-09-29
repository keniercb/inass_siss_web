import { z } from 'zod';

// Schema para crear/editar un rol personalizado
export const roleSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-z][a-z0-9_]*$/, 'El nombre debe ser un slug en minúsculas (ej: supervisor_territorial)'),
  description: z.string().max(255, 'La descripción no puede exceder 255 caracteres').optional().nullable(),
  permissions: z.array(z.string()).min(1, 'Debe asignar al menos un permiso'),
});

export type RoleInput = z.infer<typeof roleSchema>;

// Módulos del sistema (para agrupar permisos en el formulario)
export const PERMISSION_MODULES: Record<string, string> = {
  people: 'Personas',
  organizations: 'Entidades',
  legalbases: 'Base legal',
  cases: 'Expedientes',
  pensioners: 'Pensionados',
  payments: 'Pagos',
  reports: 'Reportes',
  audit: 'Auditoría',
  catalogs: 'Catálogos',
  settings: 'Configuración',
  users: 'Usuarios',
  roles: 'Roles',
};

// Labels legibles para acciones
export const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  manage: 'Gestionar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  review: 'Revisar',
  calculate: 'Calcular',
  export: 'Exportar',
};
