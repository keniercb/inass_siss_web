import { z } from 'zod';

// 5 roles del sistema SGP (sección 2.2 del diseño)
export const SYSTEM_ROLES = ['admin', 'director', 'specialist', 'operator', 'auditor'] as const;

// Schema para crear usuario (incluye password)
// NOTA: roles NO se valida con Zod (se gestiona por estado local).
export const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  email: z.string().min(1, 'El email es obligatorio').email('El email no es válido').max(100),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  office_id: z.number().int().positive('La oficina es obligatoria'),
  roles: z.array(z.string()).optional(),
});

// Schema para editar usuario (sin password, roles editables)
export const updateUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  office_id: z.number().int().positive('La oficina es obligatoria'),
  roles: z.array(z.string()).optional(),
});

// Schema para restablecer contraseña
export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Labels legibles para los roles
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  director: 'Director',
  specialist: 'Especialista',
  operator: 'Operador',
  auditor: 'Auditor',
};
