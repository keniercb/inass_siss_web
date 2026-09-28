import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Agency = components['schemas']['Agency'];

const API_BASE = 'http://localhost:8000/api/v1';

// Seed de agencias bancarias
const seedAgencies: Array<{
  id: number;
  code: string;
  name: string;
  province_id: number;
  municipality_id: number;
  agency_type_id: number;
}> = [
  { id: 1, code: 'BPA0101', name: 'BPA Pinar del Río Centro', province_id: 1, municipality_id: 1, agency_type_id: 1 },
  { id: 2, code: 'BPA0301', name: 'BPA La Habana Vieja', province_id: 3, municipality_id: 7, agency_type_id: 1 },
  { id: 3, code: 'BPA0302', name: 'BPA Centro Habana', province_id: 3, municipality_id: 8, agency_type_id: 1 },
  { id: 4, code: 'BANMET0301', name: 'BANMET Habana Vieja', province_id: 3, municipality_id: 7, agency_type_id: 2 },
  { id: 5, code: 'BPA0401', name: 'BPA San José', province_id: 4, municipality_id: 12, agency_type_id: 1 },
  { id: 6, code: 'BPA1201', name: 'BPA Holguín Centro', province_id: 12, municipality_id: 100, agency_type_id: 1 },
];

const agencies = new Map<number, Agency>(
  seedAgencies.map((a) => [
    a.id,
    {
      id: a.id,
      code: a.code,
      name: a.name,
      type: undefined,
      province: undefined,
      municipality: undefined,
      deactivated_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as Agency,
  ]),
);

let nextId = 1000;

// Helpers para embeber relaciones (simula eager loading del backend)
function getProvinceName(id: number): string {
  const names: Record<number, string> = {
    1: 'Pinar del Río', 2: 'Artemisa', 3: 'La Habana', 4: 'Mayabeque',
    5: 'Matanzas', 6: 'Villa Clara', 7: 'Cienfuegos', 8: 'Sancti Spíritus',
    9: 'Ciego de Ávila', 10: 'Camagüey', 11: 'Las Tunas', 12: 'Holguín',
    13: 'Granma', 14: 'Santiago de Cuba', 15: 'Guantánamo',
  };
  return names[id] ?? 'Desconocida';
}

function getMunicipalityName(id: number): string {
  const names: Record<number, string> = {
    1: 'Pinar del Río', 2: 'Sandino', 3: 'Mantua',
    4: 'Artemisa', 5: 'Guanajay', 6: 'Mariel',
    7: 'La Habana Vieja', 8: 'Centro Habana', 9: 'La Habana del Este',
    10: 'Regla', 11: 'Guanabacoa',
    12: 'San José de las Lajas', 13: 'Batabanó',
    14: 'Nueva Gerona', 15: 'Santa Fe',
    100: 'Holguín',
  };
  return names[id] ?? 'Desconocido';
}

function getAgencyTypeName(id: number): string {
  const names: Record<number, string> = { 1: 'Banco Popular de Ahorro', 2: 'Banco Metropolitano', 3: 'Banco Nacional' };
  return names[id] ?? 'Desconocido';
}

function withRelations(a: Agency): Agency {
  const seed = seedAgencies.find((s) => s.id === a.id);
  if (!seed) return a;
  return {
    ...a,
    province: { id: seed.province_id, code: String(seed.province_id).padStart(2, '0'), name: getProvinceName(seed.province_id) },
    municipality: { id: seed.municipality_id, code: String(seed.municipality_id).padStart(4, '0'), name: getMunicipalityName(seed.municipality_id), province: undefined, deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    type: { id: seed.agency_type_id, code: (['BPA', 'BANMET', 'BAND'][seed.agency_type_id - 1] ?? 'UNK') as string, name: getAgencyTypeName(seed.agency_type_id), deactivated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  } as Agency;
}

export const agenciesHandlers = [
  // GET /agencies — listado paginado con filtros
  http.get(`${API_BASE}/agencies`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const provinceId = url.searchParams.get('province_id');
    const municipalityId = url.searchParams.get('municipality_id');
    const agencyTypeId = url.searchParams.get('agency_type_id');
    const sort = url.searchParams.get('sort') ?? 'name';
    const order = url.searchParams.get('order') ?? 'asc';

    let items = Array.from(agencies.values());

    if (provinceId) {
      const pid = parseInt(provinceId, 10);
      items = items.filter((a) => {
        const seed = seedAgencies.find((s) => s.id === a.id);
        return seed?.province_id === pid;
      });
    }
    if (municipalityId) {
      const mid = parseInt(municipalityId, 10);
      items = items.filter((a) => {
        const seed = seedAgencies.find((s) => s.id === a.id);
        return seed?.municipality_id === mid;
      });
    }
    if (agencyTypeId) {
      const tid = parseInt(agencyTypeId, 10);
      items = items.filter((a) => {
        const seed = seedAgencies.find((s) => s.id === a.id);
        return seed?.agency_type_id === tid;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) => a.code?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q),
      );
    }

    items.sort((a, b) => {
      const av = String(a[sort as keyof Agency] ?? '');
      const bv = String(b[sort as keyof Agency] ?? '');
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage).map(withRelations);

    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // POST /agencies — crear
  http.post(`${API_BASE}/agencies`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const errors: Record<string, string[]> = {};
    if (!body.code) errors.code = ['The code field is required.'];
    if (!body.name) errors.name = ['The name field is required.'];
    if (!body.province_id) errors.province_id = ['The province id field is required.'];
    if (!body.municipality_id) errors.municipality_id = ['The municipality id field is required.'];
    if (!body.agency_type_id) errors.agency_type_id = ['The agency type id field is required.'];

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
    }

    // Validar coherencia geográfica RN-04: municipio debe pertenecer a provincia
    const newProvinceId = Number(body.province_id);
    const newMunicipalityId = Number(body.municipality_id);
    // (en el mock, simulamos que el municipio 7 pertenece a provincia 3, etc.)
    // El backend real valida esto con FK compuesta en BD

    // Unicidad de code
    if (Array.from(agencies.values()).some((a) => a.code === body.code)) {
      return HttpResponse.json(
        { message: 'The code has already been taken.', errors: { code: ['The code has already been taken.'] } },
        { status: 422 },
      );
    }

    const id = nextId++;
    const now = new Date().toISOString();
    const agency: Agency = {
      id,
      code: body.code as string,
      name: body.name as string,
      type: undefined,
      province: undefined,
      municipality: undefined,
      deactivated_at: null,
      created_at: now,
      updated_at: now,
    } as Agency;
    agencies.set(id, agency);
    seedAgencies.push({
      id,
      code: body.code as string,
      name: body.name as string,
      province_id: newProvinceId,
      municipality_id: newMunicipalityId,
      agency_type_id: Number(body.agency_type_id),
    });
    return HttpResponse.json({ data: withRelations(agency) }, { status: 201 });
  }),

  // GET /agencies/{id}
  http.get(`${API_BASE}/agencies/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const agency = agencies.get(id);
    if (!agency) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    return HttpResponse.json({ data: withRelations(agency) });
  }),

  // PATCH /agencies/{id} — code inmutable
  http.patch(`${API_BASE}/agencies/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const agency = agencies.get(id);
    if (!agency) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;

    if (body.code !== undefined && body.code !== agency.code) {
      return HttpResponse.json(
        { message: 'The code field cannot be modified after creation.', errors: { code: ['The code field cannot be modified after creation.'] } },
        { status: 422 },
      );
    }

    // Actualizar seed si cambió province/municipality/type
    const seed = seedAgencies.find((s) => s.id === id);
    if (seed) {
      if (body.province_id !== undefined) seed.province_id = Number(body.province_id);
      if (body.municipality_id !== undefined) seed.municipality_id = Number(body.municipality_id);
      if (body.agency_type_id !== undefined) seed.agency_type_id = Number(body.agency_type_id);
    }

    const updated: Agency = { ...agency, ...body, updated_at: new Date().toISOString() } as Agency;
    agencies.set(id, updated);
    return HttpResponse.json({ data: withRelations(updated) });
  }),

  // DELETE /agencies/{id}
  http.delete(`${API_BASE}/agencies/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const agency = agencies.get(id);
    if (!agency) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (agency.deactivated_at) return HttpResponse.json({ message: 'Already deactivated.' }, { status: 409 });
    if (id <= 6) {
      return HttpResponse.json(
        { message: 'Cannot deactivate: there are bank controls referencing this agency.' },
        { status: 409 },
      );
    }
    agency.deactivated_at = new Date().toISOString();
    agencies.set(id, agency);
    return HttpResponse.json({ message: 'Deactivated.' });
  }),
];
