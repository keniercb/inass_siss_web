import { http, HttpResponse } from 'msw';
import type { Entity, Office, AuthorizedSignature } from '@/types/domain';

const API_BASE = 'http://localhost:8000/api/v1';

// Seed entities
const entities = new Map<number, Entity>([
  [1, { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos', tax_id_number: 'NIT-001-123456', organization_id: 1, organization: { id: 1, code: 'OACE-001', name: 'Organismo 1' }, province_id: 3, province: { id: 3, code: '03', name: 'La Habana' }, municipality_id: 7, municipality: { id: 7, code: '0301', name: 'La Habana Vieja' }, entity_type_id: 1, entity_type: { id: 1, code: 'EMP', name: 'Empresa' }, address: 'Calle 23 #45, Vedado', phone: '+5375550001', fax: '+5375550002', email: 'info@empresa1.gob.cu', director_person_id: 2, director: { id: 2, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' }, economic_director_person_id: 1, economic_director: { id: 1, identity_number: '85061547812', first_name: 'Ana', first_surname: 'Pérez' }, parent_entity_id: null, social_purpose: 'Servicios técnicos especializados', deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [2, { id: 2, code: 'EMP002', name: 'Unidad Empresarial de Base Marianao', tax_id_number: 'NIT-002-654321', organization_id: 2, organization: { id: 2, code: 'OACE-002', name: 'Organismo 2' }, province_id: 3, province: { id: 3, code: '03', name: 'La Habana' }, municipality_id: 8, municipality: { id: 8, code: '0302', name: 'Centro Habana' }, entity_type_id: 2, entity_type: { id: 2, code: 'UEB', name: 'Unidad Empresarial de Base' }, address: 'Av. 51 #1206, Marianao', phone: '+5375550003', fax: null, email: null, director_person_id: 5, director: { id: 5, identity_number: '72051548124', first_name: 'Roberto', first_surname: 'Hernández' }, economic_director_person_id: null, economic_director: null, parent_entity_id: 1, parent_entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos' }, social_purpose: 'Servicios administrativos', deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [3, { id: 3, code: 'EMP003', name: 'Gestión Territorial Holguín', tax_id_number: 'NIT-003-111222', organization_id: 1, organization: { id: 1, code: 'OACE-001', name: 'Organismo 1' }, province_id: 12, province: { id: 12, code: '12', name: 'Holguín' }, municipality_id: 100, municipality: { id: 100, code: '1201', name: 'Holguín' }, entity_type_id: 1, entity_type: { id: 1, code: 'EMP', name: 'Empresa' }, address: 'Calle Máximo Gómez #12, Holguín', phone: '+53245550004', fax: null, email: 'holguin@empresa1.gob.cu', director_person_id: 4, director: { id: 4, identity_number: '89023456123', first_name: 'Pedro', first_surname: 'Sánchez' }, economic_director_person_id: null, economic_director: null, parent_entity_id: 1, parent_entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos' }, social_purpose: 'Gestión territorial Holguín', deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
]);

const offices = new Map<number, Office>([
  [1, { id: 1, type: { id: 2, code: 'PRO', name: 'Provincial' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 7, code: '0301', name: 'La Habana Vieja' }, address: 'Calle Reina #508, Centro Habana', parent_office_id: null, parent: null, cases_count: 12, scope_cases_count: 27, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } as Office],
  [2, { id: 2, type: { id: 3, code: 'MUN', name: 'Municipal' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 7, code: '0301', name: 'La Habana Vieja' }, address: 'Calle Oficios #12, Habana Vieja', parent_office_id: 1, parent: { id: 1, address: 'Calle Reina #508, Centro Habana' }, cases_count: 5, scope_cases_count: 5, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } as Office],
  [3, { id: 3, type: { id: 1, code: 'NAC', name: 'Nacional' }, province: { id: 3, code: '03', name: 'La Habana' }, municipality: { id: 9, code: '0303', name: 'La Habana del Este' }, address: 'Av. Carlos III #801, Habana del Este', parent_office_id: null, parent: null, cases_count: 42, scope_cases_count: 142, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } as Office],
]);

const signatures = new Map<number, AuthorizedSignature & { entity_id: number }>([
  [1, { id: 1, entity_id: 1, person_id: 2, person: { id: 2, identity_number: '78092145678', full_name: 'Carlos Rodríguez' }, position_id: 1, position: { id: 1, name: 'Director General' }, valid_from: '2024-01-01', valid_to: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [2, { id: 2, entity_id: 1, person_id: 1, person: { id: 1, identity_number: '85061547812', full_name: 'Ana Pérez' }, position_id: 2, position: { id: 2, name: 'Director Económico' }, valid_from: '2024-01-01', valid_to: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  // Firmas para entidad 2 (Unidad Empresarial de Base Marianao)
  [3, { id: 3, entity_id: 2, person_id: 5, person: { id: 5, identity_number: '72051548124', full_name: 'Roberto Hernández' }, position_id: 1, position: { id: 1, name: 'Director General' }, valid_from: '2025-01-01', valid_to: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  // Firmas para entidad 3 (Gestión Territorial Holguín)
  [4, { id: 4, entity_id: 3, person_id: 4, person: { id: 4, identity_number: '89021256123', full_name: 'Pedro Sánchez' }, position_id: 1, position: { id: 1, name: 'Director General' }, valid_from: '2025-06-01', valid_to: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [5, { id: 5, entity_id: 3, person_id: 2, person: { id: 2, identity_number: '78092145678', full_name: 'Carlos Rodríguez' }, position_id: 2, position: { id: 2, name: 'Director Económico' }, valid_from: '2025-06-01', valid_to: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
]);

let nextEntityId = 100;
let nextOfficeId = 100;
let nextSigId = 100;

export const organizationsHandlers = [
  // Entities
  http.get(`${API_BASE}/entities`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const q = url.searchParams.get('q') ?? url.searchParams.get('search') ?? '';
    let items = Array.from(entities.values()).filter((e) => !e.deactivated_at);
    if (q) { const needle = q.toLowerCase(); items = items.filter((e) => e.code?.toLowerCase().includes(needle) || e.tax_id_number?.toLowerCase().includes(needle) || (e.name ?? '').toLowerCase().includes(needle)); }
    const total = items.length; const start = (page - 1) * perPage; const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),
  http.post(`${API_BASE}/entities`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextEntityId++;
    const entity: Entity = { id, code: body.code as string, name: (body.name as string | undefined) || undefined, tax_id_number: body.tax_id_number as string, organization_id: body.organization_id as number, province_id: body.province_id as number, municipality_id: body.municipality_id as number, entity_type_id: body.entity_type_id as number, address: body.address as string, phone: (body.phone as string) || null, fax: (body.fax as string) || null, email: (body.email as string) || null, director_person_id: (body.director_person_id as number) || null, economic_director_person_id: (body.economic_director_person_id as number) || null, parent_entity_id: (body.parent_entity_id as number) || null, social_purpose: (body.social_purpose as string) || null, deactivated_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    entities.set(id, entity);
    return HttpResponse.json({ data: entity }, { status: 201 });
  }),
  http.get(`${API_BASE}/entities/:id`, ({ params }) => { const id = parseInt(params.id as string, 10); const e = entities.get(id); if (!e) return HttpResponse.json({ message: 'Not found.' }, { status: 404 }); return HttpResponse.json({ data: e }); }),
  http.patch(`${API_BASE}/entities/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const e = entities.get(id); if (!e) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    if (body.code !== undefined && body.code !== e.code) return HttpResponse.json({ message: 'Code cannot be modified.', errors: { code: ['Code cannot be modified.'] } }, { status: 422 });
    const updated: Entity = { ...e, ...body, updated_at: new Date().toISOString() } as Entity; entities.set(id, updated); return HttpResponse.json({ data: updated });
  }),
  http.delete(`${API_BASE}/entities/:id`, ({ params }) => { const id = parseInt(params.id as string, 10); const e = entities.get(id); if (!e) return HttpResponse.json({ message: 'Not found.' }, { status: 404 }); if (id <= 3) return HttpResponse.json({ message: 'Has references.' }, { status: 409 }); e.deactivated_at = new Date().toISOString(); return HttpResponse.json({ message: 'Deactivated.' }); }),

  // Entity signatures
  http.get(`${API_BASE}/entities/:id/signatures`, ({ params }) => {
    const entityId = parseInt(params.id as string, 10);
    const items = Array.from(signatures.values()).filter((s) => s.entity_id === entityId);
    return HttpResponse.json(items);
  }),
  http.post(`${API_BASE}/entities/:id/signatures`, async ({ request, params }) => {
    const entityId = parseInt(params.id as string, 10);
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextSigId++;
    const sig = { id, entity_id: entityId, person_id: body.person_id as number, person: { id: body.person_id as number, identity_number: '—', first_name: '—', first_surname: '—' }, position_id: body.position_id as number, position: { id: body.position_id as number, name: '—' }, valid_from: (body.valid_from as string) || null, valid_to: (body.valid_to as string) || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as AuthorizedSignature & { entity_id: number };
    signatures.set(id, sig);
    return HttpResponse.json(sig, { status: 201 });
  }),
  http.delete(`${API_BASE}/entities/:id/signatures/:sigId`, ({ params }) => {
    const sigId = parseInt(params.sigId as string, 10);
    signatures.delete(sigId);
    return HttpResponse.json({ message: 'Deleted.' });
  }),

  // Offices
  http.get(`${API_BASE}/offices`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    let items = Array.from(offices.values()).filter((o) => !o.deactivated_at);
    if (search) { const q = search.toLowerCase(); items = items.filter((o) => o.address?.toLowerCase().includes(q)); }
    const total = items.length; const start = (page - 1) * perPage; const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),
  http.post(`${API_BASE}/offices`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextOfficeId++;
    const office: Office = { id, type: { id: body.office_type_id as number, code: '—', name: '—' }, province: { id: body.province_id as number, code: '—', name: '—' }, municipality: { id: body.municipality_id as number, code: '—', name: '—' }, address: body.address as string, parent_office_id: (body.parent_office_id as number) || null, deactivated_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Office;
    offices.set(id, office);
    return HttpResponse.json({ data: office }, { status: 201 });
  }),
  http.patch(`${API_BASE}/offices/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const o = offices.get(id); if (!o) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated: Office = { ...o, ...body, updated_at: new Date().toISOString() } as Office; offices.set(id, updated); return HttpResponse.json({ data: updated });
  }),
  http.delete(`${API_BASE}/offices/:id`, ({ params }) => { const id = parseInt(params.id as string, 10); const o = offices.get(id); if (!o) return HttpResponse.json({ message: 'Not found.' }, { status: 404 }); if (id <= 3) return HttpResponse.json({ message: 'Has references.' }, { status: 409 }); o.deactivated_at = new Date().toISOString(); return HttpResponse.json({ message: 'Deactivated.' }); }),

  // GET /authorized-signatures — listado top-level filtrable (alineado con docs.json)
  // Params soportados: entity_id, person_id, position_id, status, page, per_page
  // status: 'active' | 'future' | 'expired' (derivado de valid_from/valid_to vs hoy)
  http.get(`${API_BASE}/authorized-signatures`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const entityId = url.searchParams.get('entity_id');
    const personId = url.searchParams.get('person_id');
    const positionId = url.searchParams.get('position_id');
    const statusFilter = url.searchParams.get('status');

    const today = new Date().toISOString().split('T')[0] ?? '';
    let items = Array.from(signatures.values()).map((s) => {
      // Derivar status a partir de la ventana de vigencia (vs reloj compartido)
      let status: 'active' | 'future' | 'expired' = 'active';
      if (s.valid_from && s.valid_from > today) status = 'future';
      else if (s.valid_to && s.valid_to < today) status = 'expired';
      return { ...s, status };
    });

    if (entityId) items = items.filter((s) => s.entity_id === parseInt(entityId, 10));
    if (personId) items = items.filter((s) => s.person_id === parseInt(personId, 10));
    if (positionId) items = items.filter((s) => s.position_id === parseInt(positionId, 10));
    if (statusFilter) items = items.filter((s) => s.status === statusFilter);

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);
    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // POST /authorized-signatures — registro de una firma autorizada (top-level)
  http.post(`${API_BASE}/authorized-signatures`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string[]> = {};
    if (!body.entity_id) errors.entity_id = ['The entity is required.'];
    if (!body.person_id) errors.person_id = ['The person is required.'];
    if (!body.position_id) errors.position_id = ['The position is required.'];
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });

    // Validar unicidad de la terna entity+person+position
    const exists = Array.from(signatures.values()).some((s) =>
      s.entity_id === (body.entity_id as number) &&
      s.person_id === (body.person_id as number) &&
      s.position_id === (body.position_id as number),
    );
    if (exists) return HttpResponse.json({ message: 'The signature already exists.' }, { status: 409 });

    const id = nextSigId++;
    const sig: AuthorizedSignature & { entity_id: number } = {
      id,
      entity_id: body.entity_id as number,
      person_id: body.person_id as number,
      person: { id: body.person_id as number, identity_number: '—', full_name: '—' },
      position_id: body.position_id as number,
      position: { id: body.position_id as number, name: '—' },
      valid_from: (body.valid_from as string) || null,
      valid_to: (body.valid_to as string) || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as AuthorizedSignature & { entity_id: number };
    signatures.set(id, sig);
    return HttpResponse.json({ data: sig }, { status: 201 });
  }),

  // DELETE /authorized-signatures/{id} — revocación de una firma (top-level)
  http.delete(`${API_BASE}/authorized-signatures/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!signatures.has(id)) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    signatures.delete(id);
    return HttpResponse.json({ message: 'Revoked.' });
  }),

  // PATCH /authorized-signatures/{id} — editar ventana de vigencia (top-level)
  http.patch(`${API_BASE}/authorized-signatures/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const sig = signatures.get(id);
    if (!sig) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated = {
      ...sig,
      valid_from: (body.valid_from as string | null | undefined) ?? sig.valid_from,
      valid_to: (body.valid_to as string | null | undefined) ?? sig.valid_to,
      updated_at: new Date().toISOString(),
    } as unknown as AuthorizedSignature & { entity_id: number };
    signatures.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),
];

// Legal bases
import type { LegalBasis } from '@/types/domain';
const legalBases = new Map<number, LegalBasis>([
  [1, { id: 1, legal_basis_type_id: 1, legal_basis_type: { id: 1, code: 'LEY', name: 'Ley' }, number: '105-2024', issue_date: '2024-06-15', effective_date: '2024-07-01', derogation_date: null, issuing_organization_id: 1, issuing_organization: { id: 1, code: 'OACE-001', name: 'Organismo 1' }, year: 2024, reference: 'Gaceta Oficial 45', deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [2, { id: 2, legal_basis_type_id: 2, legal_basis_type: { id: 2, code: 'DEC', name: 'Decreto-Ley' }, number: '350-2025', issue_date: '2025-03-10', effective_date: '2025-04-01', derogation_date: null, issuing_organization_id: 2, issuing_organization: { id: 2, code: 'OACE-002', name: 'Organismo 2' }, year: 2025, reference: null, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [3, { id: 3, legal_basis_type_id: 3, legal_basis_type: { id: 3, code: 'RES', name: 'Resolución' }, number: '12-2023', issue_date: '2023-01-20', effective_date: '2023-02-01', derogation_date: '2025-03-31', issuing_organization_id: 1, issuing_organization: { id: 1, code: 'OACE-001', name: 'Organismo 1' }, year: 2023, reference: 'Resolución ministerial', deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
  [4, { id: 4, legal_basis_type_id: 4, legal_basis_type: { id: 4, code: 'IND', name: 'Indicación' }, number: '05-2026', issue_date: '2026-01-15', effective_date: '2026-02-01', derogation_date: null, issuing_organization_id: 1, issuing_organization: { id: 1, code: 'OACE-001', name: 'Organismo 1' }, year: 2026, reference: null, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }],
]);
let nextLBId = 100;

export const legalBasisHandlers = [
  http.get(`${API_BASE}/legal-bases`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? 'all';
    let items = Array.from(legalBases.values()).filter((lb) => !lb.deactivated_at);
    if (status === 'vigent') items = items.filter((lb) => !lb.derogation_date);
    if (status === 'derogated') items = items.filter((lb) => !!lb.derogation_date);
    if (search) { const q = search.toLowerCase(); items = items.filter((lb) => lb.number?.toLowerCase().includes(q) || lb.reference?.toLowerCase().includes(q)); }
    items.sort((a, b) => b.issue_date.localeCompare(a.issue_date));
    const total = items.length; const start = (page - 1) * perPage; const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),
  http.post(`${API_BASE}/legal-bases`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextLBId++;
    const lb: LegalBasis = { id, legal_basis_type_id: body.legal_basis_type_id as number, legal_basis_type: { id: body.legal_basis_type_id as number, code: '—', name: '—' }, number: body.number as string, issue_date: body.issue_date as string, effective_date: body.effective_date as string, derogation_date: (body.derogation_date as string) || null, issuing_organization_id: body.issuing_organization_id as number, issuing_organization: { id: body.issuing_organization_id as number, code: '—', name: '—' }, year: new Date(body.issue_date as string).getFullYear(), reference: (body.reference as string) || null, deactivated_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    legalBases.set(id, lb);
    return HttpResponse.json({ data: lb }, { status: 201 });
  }),
  http.get(`${API_BASE}/legal-bases/:id`, ({ params }) => { const id = parseInt(params.id as string, 10); const lb = legalBases.get(id); if (!lb) return HttpResponse.json({ message: 'Not found.' }, { status: 404 }); return HttpResponse.json({ data: lb }); }),
  http.patch(`${API_BASE}/legal-bases/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10); const lb = legalBases.get(id); if (!lb) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated: LegalBasis = { ...lb, ...body, updated_at: new Date().toISOString() } as LegalBasis; legalBases.set(id, updated); return HttpResponse.json({ data: updated });
  }),
  http.delete(`${API_BASE}/legal-bases/:id`, ({ params }) => { const id = parseInt(params.id as string, 10); const lb = legalBases.get(id); if (!lb) return HttpResponse.json({ message: 'Not found.' }, { status: 404 }); lb.deactivated_at = new Date().toISOString(); return HttpResponse.json({ message: 'Deactivated.' }); }),
];
