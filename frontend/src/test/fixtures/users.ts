/**
 * Fixtures de usuarios autenticados para los 5 roles del SGP.
 * Usados por los handlers MSW para simular respuestas de /auth/login y /auth/me.
 *
 * Permisos según matriz de la sección 2.2 del documento de arquitectura.
 * Nota: admin tiene todos los permisos implícitamente (auth-store.hasPermission),
 * por lo que su array permissions puede estar vacío.
 */

export interface MockUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface MockAuthUser extends MockUser {
  /** Token Sanctum simulado */
  token: string;
  token_type: 'Bearer';
}

// Permisos por rol (sin admin — admin los tiene todos implícitamente)
const DIRECTOR_PERMISSIONS = [
  'cases.view', 'cases.review', 'cases.approve', 'cases.reject', 'cases.calculate',
  'pensioners.view', 'pensioners.manage',
  'reports.view', 'reports.export',
  'audit.view',
  'people.view', 'organizations.view', 'legalbases.view',
  'catalogs.view', 'settings.view',
] as const;

const SPECIALIST_PERMISSIONS = [
  'cases.view', 'cases.edit', 'cases.review', 'cases.calculate',
  'people.view', 'people.manage',
  'organizations.view',
  'legalbases.view', 'legalbases.manage',
  'reports.view',
  'catalogs.view', 'settings.view',
] as const;

const OPERATOR_PERMISSIONS = [
  'cases.view', 'cases.create', 'cases.edit',
  'people.view', 'people.manage',
  'organizations.view', 'organizations.manage',
  'legalbases.view', 'legalbases.manage',
  'catalogs.view', 'catalogs.manage',
  'reports.view',
] as const;

const AUDITOR_PERMISSIONS = [
  'cases.view', 'people.view', 'organizations.view', 'legalbases.view',
  'pensioners.view', 'payments.view',
  'reports.view', 'reports.export',
  'audit.view',
  'catalogs.view', 'settings.view',
] as const;

export const MOCK_USERS: Record<string, MockAuthUser> = {
  admin: {
    id: 1,
    name: 'SGP Demo Admin',
    email: 'admin@sgp.local',
    roles: ['admin'],
    permissions: [], // admin tiene todos los permisos implícitamente
    token: 'mock-token-admin-1|9QsTjXxaYl2nW8kJ',
    token_type: 'Bearer',
  },
  director: {
    id: 2,
    name: 'Ana Pérez Directora',
    email: 'director@sgp.local',
    roles: ['director'],
    permissions: [...DIRECTOR_PERMISSIONS],
    token: 'mock-token-director-2|Dkt7Vx3qJn8mLp2Z',
    token_type: 'Bearer',
  },
  specialist: {
    id: 3,
    name: 'Carlos Especialista',
    email: 'specialist@sgp.local',
    roles: ['specialist'],
    permissions: [...SPECIALIST_PERMISSIONS],
    token: 'mock-token-specialist-3|ZyR2c1pTn4oVmKwE',
    token_type: 'Bearer',
  },
  operator: {
    id: 4,
    name: 'Ana Pérez Operadora',
    email: 'operator@sgp.local',
    roles: ['operator'],
    permissions: [...OPERATOR_PERMISSIONS],
    token: 'mock-token-operator-4|JnP8tRsYqX3bLdCw',
    token_type: 'Bearer',
  },
  auditor: {
    id: 5,
    name: 'Roberto Auditor',
    email: 'auditor@sgp.local',
    roles: ['auditor'],
    permissions: [...AUDITOR_PERMISSIONS],
    token: 'mock-token-auditor-5|KzW4sNvYpL2xFqMe',
    token_type: 'Bearer',
  },
};

// Credenciales de prueba (cualquier password funciona en mock)
export const MOCK_CREDENTIALS = {
  admin: { email: 'admin@sgp.local', password: 'password' },
  director: { email: 'director@sgp.local', password: 'password' },
  specialist: { email: 'specialist@sgp.local', password: 'password' },
  operator: { email: 'operator@sgp.local', password: 'password' },
  auditor: { email: 'auditor@sgp.local', password: 'password' },
} as const;

/**
 * Dado un token, encuentra el usuario mock correspondiente.
 * Usado por el handler de /auth/me.
 */
export function findUserByToken(token: string): MockAuthUser | null {
  for (const user of Object.values(MOCK_USERS)) {
    if (user.token === token) return user;
  }
  return null;
}

/**
 * Dado un email, encuentra el usuario mock correspondiente.
 * Usado por el handler de /auth/login.
 */
export function findUserByEmail(email: string): MockAuthUser | null {
  for (const user of Object.values(MOCK_USERS)) {
    if (user.email === email) return user;
  }
  return null;
}
