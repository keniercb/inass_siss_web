import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Role = components['schemas']['Role'];
type Permission = components['schemas']['Permission'];

const API_BASE = 'http://localhost:8000/api/v1';

// Catálogo completo de permisos (de la matriz sección 2.2)
const ALL_PERMISSIONS: Permission[] = [
  { name: 'people.view', module: 'people', action: 'view', institutional_roles: ['admin', 'director', 'specialist', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'people.create', module: 'people', action: 'create', institutional_roles: ['admin', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'people.manage', module: 'people', action: 'manage', institutional_roles: ['admin', 'specialist', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'organizations.view', module: 'organizations', action: 'view', institutional_roles: ['admin', 'director', 'specialist', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'organizations.manage', module: 'organizations', action: 'manage', institutional_roles: ['admin', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'legalbases.view', module: 'legalbases', action: 'view', institutional_roles: ['admin', 'director', 'specialist', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'legalbases.manage', module: 'legalbases', action: 'manage', institutional_roles: ['admin', 'specialist', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'cases.view', module: 'cases', action: 'view', institutional_roles: ['admin', 'director', 'specialist', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'cases.create', module: 'cases', action: 'create', institutional_roles: ['admin', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'cases.edit', module: 'cases', action: 'edit', institutional_roles: ['admin', 'specialist', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'cases.review', module: 'cases', action: 'review', institutional_roles: ['admin', 'director', 'specialist'], custom_roles: [], users_count: 0 },
  { name: 'cases.approve', module: 'cases', action: 'approve', institutional_roles: ['admin', 'director'], custom_roles: [], users_count: 0 },
  { name: 'cases.reject', module: 'cases', action: 'reject', institutional_roles: ['admin', 'director'], custom_roles: [], users_count: 0 },
  { name: 'cases.calculate', module: 'cases', action: 'calculate', institutional_roles: ['admin', 'director', 'specialist'], custom_roles: [], users_count: 0 },
  { name: 'pensioners.view', module: 'pensioners', action: 'view', institutional_roles: ['admin', 'director', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'pensioners.manage', module: 'pensioners', action: 'manage', institutional_roles: ['admin', 'director'], custom_roles: [], users_count: 0 },
  { name: 'payments.view', module: 'payments', action: 'view', institutional_roles: ['admin', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'payments.manage', module: 'payments', action: 'manage', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
  { name: 'reports.view', module: 'reports', action: 'view', institutional_roles: ['admin', 'director', 'specialist', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'reports.export', module: 'reports', action: 'export', institutional_roles: ['admin', 'director', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'audit.view', module: 'audit', action: 'view', institutional_roles: ['admin', 'director', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'catalogs.view', module: 'catalogs', action: 'view', institutional_roles: ['admin', 'operator', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'catalogs.manage', module: 'catalogs', action: 'manage', institutional_roles: ['admin', 'operator'], custom_roles: [], users_count: 0 },
  { name: 'settings.view', module: 'settings', action: 'view', institutional_roles: ['admin', 'director', 'auditor'], custom_roles: [], users_count: 0 },
  { name: 'settings.manage', module: 'settings', action: 'manage', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
  { name: 'users.view', module: 'users', action: 'view', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
  { name: 'users.manage', module: 'users', action: 'manage', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
  { name: 'roles.view', module: 'roles', action: 'view', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
  { name: 'roles.manage', module: 'roles', action: 'manage', institutional_roles: ['admin'], custom_roles: [], users_count: 0 },
];

// Roles sembrados (5 institucionales + 1 personalizado de demo)
const roles = new Map<number, Role>([
  [1, { id: 1, name: 'admin', description: 'Administrador del sistema', is_system: true, permissions: ALL_PERMISSIONS.map((p) => p.name!), users_count: 1 }],
  [2, { id: 2, name: 'director', description: 'Director provincial/municipal', is_system: true, permissions: ['cases.view', 'cases.review', 'cases.approve', 'cases.reject', 'cases.calculate', 'pensioners.view', 'pensioners.manage', 'reports.view', 'reports.export', 'audit.view', 'people.view', 'organizations.view', 'legalbases.view', 'catalogs.view', 'settings.view'], users_count: 1 }],
  [3, { id: 3, name: 'specialist', description: 'Especialista que revisa y calcula', is_system: true, permissions: ['cases.view', 'cases.edit', 'cases.review', 'cases.calculate', 'people.view', 'people.manage', 'organizations.view', 'legalbases.view', 'legalbases.manage', 'reports.view', 'catalogs.view', 'settings.view'], users_count: 1 }],
  [4, { id: 4, name: 'operator', description: 'Operador que registra datos', is_system: true, permissions: ['cases.view', 'cases.create', 'cases.edit', 'people.view', 'people.manage', 'organizations.view', 'organizations.manage', 'legalbases.view', 'legalbases.manage', 'catalogs.view', 'catalogs.manage', 'reports.view'], users_count: 1 }],
  [5, { id: 5, name: 'auditor', description: 'Auditor de solo lectura', is_system: true, permissions: ['cases.view', 'people.view', 'organizations.view', 'legalbases.view', 'pensioners.view', 'payments.view', 'reports.view', 'reports.export', 'audit.view', 'catalogs.view', 'settings.view'], users_count: 1 }],
  [6, { id: 6, name: 'supervisor_territorial', description: 'Supervisa la captura de una provincia', is_system: false, permissions: ['cases.view', 'cases.review', 'people.view', 'organizations.view', 'reports.view'], users_count: 0 }],
]);

let nextId = 100;

export const rolesHandlers = [
  // GET /permissions — catálogo completo (envelope { data: [...] })
  http.get(`${API_BASE}/permissions`, () => {
    return HttpResponse.json({ data: ALL_PERMISSIONS });
  }),
  // GET /permissions/{permission}
  http.get(`${API_BASE}/permissions/:permission`, ({ params }) => {
    const perm = ALL_PERMISSIONS.find((p) => p.name === params.permission);
    if (!perm) return HttpResponse.json({ message: 'Permission not found.' }, { status: 404 });
    return HttpResponse.json({ data: perm });
  }),
  // GET /roles — listado
  http.get(`${API_BASE}/roles`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const filter = url.searchParams.get('is_system') ?? 'all';

    let items = Array.from(roles.values());
    if (filter === 'system') items = items.filter((r) => r.is_system === true);
    if (filter === 'custom') items = items.filter((r) => r.is_system === false);
    if (search) { const q = search.toLowerCase(); items = items.filter((r) => r.name?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)); }
    items.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const total = items.length; const start = (page - 1) * perPage; const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),
  // POST /roles — crear rol personalizado
  http.post(`${API_BASE}/roles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    // Validar nombre (slug, no reservado)
    const reservedNames = ['admin', 'director', 'specialist', 'operator', 'auditor'];
    if (!body.name || reservedNames.includes(body.name as string)) {
      return HttpResponse.json({ message: 'The name is reserved or invalid.', errors: { name: ['The name is reserved for institutional roles or invalid.'] } }, { status: 422 });
    }
    if (Array.from(roles.values()).some((r) => r.name === body.name)) {
      return HttpResponse.json({ message: 'A role with that name already exists.' }, { status: 409 });
    }
    const id = nextId++;
    const role: Role = { id, name: body.name as string, description: (body.description as string) || null, is_system: false, permissions: (body.permissions as string[]) ?? [], users_count: 0 };
    roles.set(id, role);
    return HttpResponse.json({ data: role }, { status: 201 });
  }),
  // GET /roles/{id}
  http.get(`${API_BASE}/roles/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const r = roles.get(id);
    if (!r) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    return HttpResponse.json({ data: r });
  }),
  // PATCH /roles/{id} — editar (solo personalizados)
  http.patch(`${API_BASE}/roles/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const r = roles.get(id);
    if (!r) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (r.is_system) return HttpResponse.json({ message: 'System roles cannot be modified.' }, { status: 403 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated: Role = { ...r, description: (body.description as string) ?? r.description, permissions: (body.permissions as string[]) ?? r.permissions };
    roles.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),
  // DELETE /roles/{id} — eliminar (solo personalizados)
  http.delete(`${API_BASE}/roles/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const r = roles.get(id);
    if (!r) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (r.is_system) return HttpResponse.json({ message: 'System roles cannot be deleted.' }, { status: 403 });
    if ((r.users_count ?? 0) > 0) return HttpResponse.json({ message: 'Cannot delete: there are users with this role.' }, { status: 409 });
    roles.delete(id);
    return HttpResponse.json({ message: 'Role deleted.' });
  }),
];
