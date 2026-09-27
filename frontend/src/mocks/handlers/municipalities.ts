import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Municipality = components['schemas']['Municipality'];

const API_BASE = 'http://localhost:8000/api/v1';

// 15 provincias (IDs 1-15) + Isla de la Juventud (special: province_id null)
// Seed de municipios (subset representativo para demo)
const seedMunicipios: Array<{ id: number; code: string; name: string; province_id: number | null }> = [
  // Pinar del Río (1)
  { id: 1, code: '0101', name: 'Pinar del Río', province_id: 1 },
  { id: 2, code: '0102', name: 'Sandino', province_id: 1 },
  { id: 3, code: '0103', name: 'Mantua', province_id: 1 },
  // Artemisa (2)
  { id: 4, code: '0201', name: 'Artemisa', province_id: 2 },
  { id: 5, code: '0202', name: 'Guanajay', province_id: 2 },
  { id: 6, code: '0203', name: 'Mariel', province_id: 2 },
  // La Habana (3)
  { id: 7, code: '0301', name: 'La Habana Vieja', province_id: 3 },
  { id: 8, code: '0302', name: 'Centro Habana', province_id: 3 },
  { id: 9, code: '0303', name: 'La Habana del Este', province_id: 3 },
  { id: 10, code: '0304', name: 'Regla', province_id: 3 },
  { id: 11, code: '0305', name: 'Guanabacoa', province_id: 3 },
  // Mayabeque (4)
  { id: 12, code: '0401', name: 'San José de las Lajas', province_id: 4 },
  { id: 13, code: '0402', name: 'Batabanó', province_id: 4 },
  // Isla de la Juventud (special — province_id null)
  { id: 14, code: '9901', name: 'Nueva Gerona', province_id: null },
  { id: 15, code: '9902', name: 'Santa Fe', province_id: null },
];

const municipios = new Map<number, Municipality>(
  seedMunicipios.map((m) => [
    m.id,
    {
      id: m.id,
      code: m.code,
      name: m.name,
      province: undefined, // se completa en runtime
      deactivated_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } as Municipality,
  ]),
);

let nextId = 1000;

// Helper para embeber la provincia en el municipio (simula el eager loading del backend)
function withProvince(m: Municipality): Municipality {
  const provinceId = seedMunicipios.find((s) => s.id === m.id)?.province_id;
  return {
    ...m,
    province: provinceId
      ? { id: provinceId, code: String(provinceId).padStart(2, '0'), name: getProvinceName(provinceId) }
      : undefined, // Isla de la Juventud
  } as Municipality;
}

function getProvinceName(id: number): string {
  const names: Record<number, string> = {
    1: 'Pinar del Río',
    2: 'Artemisa',
    3: 'La Habana',
    4: 'Mayabeque',
    5: 'Matanzas',
    6: 'Villa Clara',
    7: 'Cienfuegos',
    8: 'Sancti Spíritus',
    9: 'Ciego de Ávila',
    10: 'Camagüey',
    11: 'Las Tunas',
    12: 'Holguín',
    13: 'Granma',
    14: 'Santiago de Cuba',
    15: 'Guantánamo',
  };
  return names[id] ?? 'Desconocida';
}

export const municipalitiesHandlers = [
  // GET /municipalities — listado paginado con filtros por provincia
  http.get(`${API_BASE}/municipalities`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const provinceId = url.searchParams.get('province_id');
    const sort = url.searchParams.get('sort') ?? 'name';
    const order = url.searchParams.get('order') ?? 'asc';

    let items = Array.from(municipios.values());

    // Filtro por provincia (incluye null para Isla de la Juventud)
    if (provinceId !== null && provinceId !== undefined && provinceId !== '') {
      const pid = provinceId === 'null' ? null : parseInt(provinceId, 10);
      items = items.filter((m) => {
        const seed = seedMunicipios.find((s) => s.id === m.id);
        return seed?.province_id === pid;
      });
    }

    // Búsqueda
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) => m.code?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q),
      );
    }

    // Sort
    items.sort((a, b) => {
      const av = String(a[sort as keyof Municipality] ?? '');
      const bv = String(b[sort as keyof Municipality] ?? '');
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage).map(withProvince);

    return HttpResponse.json({
      data: paged,
      meta: {
        current_page: page,
        per_page: perPage,
        total,
        last_page: Math.max(1, Math.ceil(total / perPage)),
      },
    });
  }),

  // POST /municipalities — crear
  http.post(`${API_BASE}/municipalities`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    // Validar campos requeridos
    const errors: Record<string, string[]> = {};
    if (!body.code) errors.code = ['The code field is required.'];
    if (!body.name) errors.name = ['The name field is required.'];
    // province_id puede ser null (Isla de la Juventud) o un número
    if (body.province_id === undefined) errors.province_id = ['The province id field is required.'];

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
    }

    // Validar unicidad (province_id, code)
    const newProvinceId = body.province_id === null ? null : Number(body.province_id);
    const newCode = body.code as string;
    const existing = Array.from(municipios.values()).find((m) => {
      const seed = seedMunicipios.find((s) => s.id === m.id);
      return seed?.province_id === newProvinceId && m.code === newCode;
    });
    if (existing) {
      return HttpResponse.json(
        {
          message: 'A municipality with that code already exists in this province.',
          errors: { code: ['A municipality with that code already exists in this province.'] },
        },
        { status: 422 },
      );
    }

    const id = nextId++;
    const now = new Date().toISOString();
    const muni: Municipality = {
      id,
      code: newCode,
      name: body.name as string,
      province: undefined,
      deactivated_at: null,
      created_at: now,
      updated_at: now,
    } as Municipality;
    municipios.set(id, muni);
    // Add to seed for province lookup
    seedMunicipios.push({ id, code: newCode, name: body.name as string, province_id: newProvinceId });
    return HttpResponse.json({ data: withProvince(muni) }, { status: 201 });
  }),

  // GET /municipalities/{id} — detalle
  http.get(`${API_BASE}/municipalities/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const muni = municipios.get(id);
    if (!muni) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json({ data: withProvince(muni) });
  }),

  // PATCH /municipalities/{id} — editar (code inmutable)
  http.patch(`${API_BASE}/municipalities/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const muni = municipios.get(id);
    if (!muni) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;

    // Validar code inmutable
    if (body.code !== undefined && body.code !== muni.code) {
      return HttpResponse.json(
        {
          message: 'The code field cannot be modified after creation.',
          errors: { code: ['The code field cannot be modified after creation.'] },
        },
        { status: 422 },
      );
    }

    // Validar coherencia geográfica RN-04: municipio debe pertenecer a la provincia
    if (body.province_id !== undefined) {
      const newProvinceId = body.province_id === null ? null : Number(body.province_id);
      const seed = seedMunicipios.find((s) => s.id === id);
      if (seed) {
        seed.province_id = newProvinceId;
      }
    }

    const updated: Municipality = {
      ...muni,
      ...body,
      updated_at: new Date().toISOString(),
    } as Municipality;
    municipios.set(id, updated);
    return HttpResponse.json({ data: withProvince(updated) });
  }),

  // DELETE /municipalities/{id} — desactivación lógica
  http.delete(`${API_BASE}/municipalities/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const muni = municipios.get(id);
    if (!muni) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    if (muni.deactivated_at) {
      return HttpResponse.json({ message: 'Already deactivated.' }, { status: 409 });
    }
    // Simular referencias activas (los municipios del seed tienen referencias)
    if (id <= 15) {
      return HttpResponse.json(
        { message: 'Cannot deactivate: there are agencies referencing this municipality.' },
        { status: 409 },
      );
    }
    muni.deactivated_at = new Date().toISOString();
    municipios.set(id, muni);
    return HttpResponse.json({ message: 'Deactivated.' });
  }),
];
