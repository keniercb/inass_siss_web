import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type User = components['schemas']['User'];

const API_BASE = 'http://localhost:8000/api/v1';

// 5 usuarios sembrados (uno por rol) — matchean los de auth handlers
// Asignamos oficina a los usuarios para reflejar el comportamiento real del backend
const office1 = { id: 1, type: { id: 2, code: 'PRO', name: 'Provincial' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 7, code: '0301', name: 'La Habana Vieja' }, address: 'Calle Reina #508, Centro Habana' };
const office2 = { id: 3, type: { id: 1, code: 'NAC', name: 'Nacional' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 9, code: '0303', name: 'La Habana del Este' }, address: 'Av. Carlos III #801, Habana del Este' };
const office3 = { id: 2, type: { id: 3, code: 'MUN', name: 'Municipal' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 7, code: '0301', name: 'La Habana Vieja' }, address: 'Calle Oficios #12, Habana Vieja' };

const users = new Map<number, User>([
  [1, { id: 1, name: 'SGP Demo Admin', email: 'admin@sgp.local', roles: ['admin'], permissions: [], person: null, office: office2, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0 }],
  [2, { name: 'Ana Pérez Directora', email: 'director@sgp.local', roles: ['director'], permissions: ['cases.view', 'cases.review', 'cases.approve', 'cases.reject', 'cases.calculate', 'pensioners.view', 'pensioners.manage', 'reports.view', 'reports.export', 'audit.view', 'people.view', 'organizations.view', 'legalbases.view', 'catalogs.view', 'settings.view'], person: null, office: office1, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0, id: 2 }],
  [3, { name: 'Carlos Especialista', email: 'specialist@sgp.local', roles: ['specialist'], permissions: ['cases.view', 'cases.edit', 'cases.review', 'cases.calculate', 'people.view', 'people.manage', 'organizations.view', 'legalbases.view', 'legalbases.manage', 'reports.view', 'catalogs.view', 'settings.view'], person: null, office: office1, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0, id: 3 }],
  [4, { name: 'Ana Pérez Operadora', email: 'operator@sgp.local', roles: ['operator'], permissions: ['cases.view', 'cases.create', 'cases.edit', 'people.view', 'people.manage', 'organizations.view', 'organizations.manage', 'legalbases.view', 'legalbases.manage', 'catalogs.view', 'catalogs.manage', 'reports.view'], person: null, office: office3, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0, id: 4 }],
  [5, { name: 'Roberto Auditor', email: 'auditor@sgp.local', roles: ['auditor'], permissions: ['cases.view', 'people.view', 'organizations.view', 'legalbases.view', 'pensioners.view', 'payments.view', 'reports.view', 'reports.export', 'audit.view', 'catalogs.view', 'settings.view'], person: null, office: office2, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0, id: 5 }],
  [6, { name: 'Usuario Bloqueado', email: 'locked@sgp.local', roles: ['operator'], permissions: ['cases.view', 'people.view', 'catalogs.view', 'reports.view'], person: null, office: office3, status: 'active', locked: true, locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), failed_login_attempts: 5, id: 6 }],
  [7, { name: 'Usuario Desactivado', email: 'inactive@sgp.local', roles: ['auditor'], permissions: ['cases.view', 'reports.view'], person: null, office: null, status: 'inactive', locked: false, locked_until: null, failed_login_attempts: 0, id: 7 }],
]);

let nextId = 100;

export const usersHandlers = [
  // GET /users
  http.get(`${API_BASE}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? 'all';

    let items = Array.from(users.values());
    if (status === 'active') items = items.filter((u) => u.status === 'active' && !u.locked);
    if (status === 'inactive') items = items.filter((u) => u.status === 'inactive');
    if (status === 'locked') items = items.filter((u) => u.locked === true);
    if (search) { const q = search.toLowerCase(); items = items.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)); }
    items.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    const total = items.length; const start = (page - 1) * perPage; const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),
  // POST /users
  http.post(`${API_BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name || !body.email || !body.password) {
      return HttpResponse.json({ message: 'Validation error.', errors: { name: !body.name ? ['The name field is required.'] : [], email: !body.email ? ['The email field is required.'] : [], password: !body.password ? ['The password field is required.'] : [] } }, { status: 422 });
    }
    if (Array.from(users.values()).some((u) => u.email === body.email)) {
      return HttpResponse.json({ message: 'A user with that email already exists.' }, { status: 409 });
    }
    const id = nextId++;
    const user: User = { id, name: body.name as string, email: body.email as string, roles: body.roles as string[] ?? [], permissions: [], person: null, status: 'active', locked: false, locked_until: null, failed_login_attempts: 0 };
    users.set(id, user);
    return HttpResponse.json({ data: user }, { status: 201 });
  }),
  // GET /users/{id}
  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    return HttpResponse.json({ data: u });
  }),
  // PATCH /users/{id}
  http.patch(`${API_BASE}/users/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated: User = { ...u, name: body.name as string ?? u.name, roles: body.roles as string[] ?? u.roles, permissions: [] };
    users.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),
  // DELETE /users/{id}
  http.delete(`${API_BASE}/users/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    u.status = 'inactive';
    return HttpResponse.json({ message: 'Deactivated.' });
  }),
  // POST /users/{id}/restore
  http.post(`${API_BASE}/users/:id/restore`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    u.status = 'active';
    return HttpResponse.json({ data: u });
  }),
  // POST /users/{id}/unlock
  http.post(`${API_BASE}/users/:id/unlock`, ({ params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    u.locked = false; u.locked_until = null; u.failed_login_attempts = 0;
    return HttpResponse.json({ data: u });
  }),
  // PATCH /users/{id}/password
  http.patch(`${API_BASE}/users/:id/password`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const u = users.get(id);
    if (!u) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.password || (body.password as string).length < 8) {
      return HttpResponse.json({ message: 'Validation error.', errors: { password: ['The password must be at least 8 characters.'] } }, { status: 422 });
    }
    return HttpResponse.json({ message: 'Password reset.' });
  }),
];
