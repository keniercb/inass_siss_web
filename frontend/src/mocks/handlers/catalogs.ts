import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

// Usamos el tipo directo (sin Required<>) para que todos los campos sean
// opcionales según el spec OpenAPI, evitando conflictos de null vs undefined.
type CatalogItem = components['schemas']['CatalogItem'];

const API_BASE = 'http://localhost:8000/api/v1';

// Datos en memoria (simulan la BD del backend)
const catalogStore: Record<string, Map<number, CatalogItem>> = {
  provinces: seedCatalog('provinces', [
    { code: '01', name: 'Pinar del Río' },
    { code: '02', name: 'Artemisa' },
    { code: '03', name: 'La Habana' },
    { code: '04', name: 'Mayabeque' },
    { code: '05', name: 'Matanzas' },
    { code: '06', name: 'Villa Clara' },
    { code: '07', name: 'Cienfuegos' },
    { code: '08', name: 'Sancti Spíritus' },
    { code: '09', name: 'Ciego de Ávila' },
    { code: '10', name: 'Camagüey' },
    { code: '11', name: 'Las Tunas' },
    { code: '12', name: 'Holguín' },
    { code: '13', name: 'Granma' },
    { code: '14', name: 'Santiago de Cuba' },
    { code: '15', name: 'Guantánamo' },
  ]),
  'agency-types': seedCatalog('agency-types', [
    { code: 'BPA', name: 'Banco Popular de Ahorro' },
    { code: 'BANMET', name: 'Banco Metropolitano' },
    { code: 'BAND', name: 'Banco Nacional' },
  ]),
  organizations: seedCatalog('organizations', [
    { code: 'OACE-001', name: 'Organismo 1' },
    { code: 'OACE-002', name: 'Organismo 2' },
  ]),
  'entity-types': seedCatalog('entity-types', [
    { code: 'EMP', name: 'Empresa' },
    { code: 'UEB', name: 'Unidad Empresarial de Base' },
  ]),
  'office-types': seedCatalog('office-types', [
    { code: 'NAC', name: 'Nacional' },
    { code: 'PRO', name: 'Provincial' },
    { code: 'MUN', name: 'Municipal' },
  ]),
  'legal-basis-types': seedCatalog('legal-basis-types', [
    { code: 'LEY', name: 'Ley' },
    { code: 'DEC', name: 'Decreto-Ley' },
    { code: 'RES', name: 'Resolución' },
    { code: 'IND', name: 'Indicación' },
  ]),
  'scientific-categories': seedCatalog('scientific-categories', [
    { code: 'INV', name: 'Investigador' },
    { code: 'AGG', name: 'Agregado' },
    { code: 'TIT', name: 'Titular' },
  ]),
  'educational-levels': seedCatalog('educational-levels', [
    { name: 'Primaria' },
    { name: 'Secundaria' },
    { name: 'Preuniversitario' },
    { name: 'Técnico Medio' },
    { name: 'Universitario' },
  ]),
  'occupational-categories': seedCatalog('occupational-categories', [
    { code: 'OBR', name: 'Obrero' },
    { code: 'TEC', name: 'Técnico' },
    { code: 'DIR', name: 'Dirigente' },
  ]),
  'pension-types': seedCatalog('pension-types', [
    { code: 'AGE', name: 'Por edad' },
    { code: 'DIS', name: 'Por discapacidad' },
    { code: 'SUP', name: 'Por sobrevivencia' },
  ]),
  'beneficiary-types': seedCatalog('beneficiary-types', [
    { name: 'Titular' },
    { name: 'Cónyuge' },
    { name: 'Hijo' },
  ]),
  races: seedCatalog('races', [
    { name: 'Blanca' },
    { name: 'Negra' },
    { name: 'Mestiza' },
    { name: 'Otra' },
  ]),
  positions: seedCatalog('positions', [
    { name: 'Director General' },
    { name: 'Especialista' },
    { name: 'Técnico' },
    { name: 'Operario' },
  ]),
  'pension-regimes': seedCatalog('pension-regimes', [
    { code: 'GEN', name: 'General', extra: { months_per_year: 12 } },
  ]),
  'payment-types': seedCatalog('payment-types', [
    { name: 'Pago mensual' },
    { name: 'Pago retroactivo' },
  ]),
  'income-concepts': seedCatalog('income-concepts', [
    { name: 'Salario base', extra: { applies_base_salary: true } },
    { name: 'Antigüedad', extra: { applies_base_salary: false } },
  ]),
};

let nextId = 1000;

function seedCatalog(
  _type: string,
  items: Array<{ code?: string; name: string; extra?: Record<string, unknown> }>,
): Map<number, CatalogItem> {
  const map = new Map<number, CatalogItem>();
  items.forEach((item, idx) => {
    const id = idx + 1;
    map.set(id, {
      id,
      code: item.code ?? '',
      name: item.name,
      description: null,
      months_per_year: (item.extra?.months_per_year as number | undefined) ?? null,
      applies_base_salary: (item.extra?.applies_base_salary as boolean | undefined) ?? null,
      deactivated_at: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });
  return map;
}

export const catalogsHandlers = [
  // GET /catalogs/{type} — listado paginado
  http.get(`${API_BASE}/catalogs/:type`, ({ request, params }) => {
    const type = params.type as string;
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json(
        { message: `Unknown catalog type: ${type}` },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const sort = url.searchParams.get('sort') ?? 'name';
    const order = url.searchParams.get('order') ?? 'asc';

    let items = Array.from(store.values()).filter((i) => i.deactivated_at === null);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.code?.toLowerCase().includes(q) ||
          i.name?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q),
      );
    }

    items.sort((a, b) => {
      const av = String(a[sort as keyof CatalogItem] ?? '');
      const bv = String(b[sort as keyof CatalogItem] ?? '');
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);

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

  // POST /catalogs/{type} — crear
  http.post(`${API_BASE}/catalogs/:type`, async ({ request, params }) => {
    const type = params.type as string;
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Unknown catalog type: ${type}` }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Validar campos requeridos
    if (!body.name) {
      return HttpResponse.json(
        { message: 'The name field is required.', errors: { name: ['The name field is required.'] } },
        { status: 422 },
      );
    }

    // Validar unicidad de code (si aplica)
    if (body.code && Array.from(store.values()).some((i) => i.code === body.code)) {
      return HttpResponse.json(
        {
          message: 'The code has already been taken.',
          errors: { code: ['The code has already been taken.'] },
        },
        { status: 422 },
      );
    }

    const id = ++nextId;
    const now = new Date().toISOString();
    const item: CatalogItem = {
      id,
      code: (body.code as string) ?? '',
      name: body.name as string,
      description: (body.description as string | null) ?? null,
      months_per_year: (body.months_per_year as number | null | undefined) ?? null,
      applies_base_salary: (body.applies_base_salary as boolean | null | undefined) ?? null,
      deactivated_at: null,
      created_at: now,
      updated_at: now,
    };
    store.set(id, item);
    return HttpResponse.json({ data: item }, { status: 201 });
  }),

  // GET /catalogs/{type}/{id} — detalle
  http.get(`${API_BASE}/catalogs/:type/:id`, ({ params }) => {
    const type = params.type as string;
    const id = parseInt(params.id as string, 10);
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Unknown catalog type: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json({ data: item });
  }),

  // PATCH /catalogs/{type}/{id} — editar (code inmutable)
  http.patch(`${API_BASE}/catalogs/:type/:id`, async ({ request, params }) => {
    const type = params.type as string;
    const id = parseInt(params.id as string, 10);
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Unknown catalog type: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;

    // Validar code inmutable
    if (body.code !== undefined && body.code !== item.code) {
      return HttpResponse.json(
        {
          message: 'The code field cannot be modified after creation.',
          errors: { code: ['The code field cannot be modified after creation.'] },
        },
        { status: 422 },
      );
    }

    const updated: CatalogItem = {
      ...item,
      ...body,
      months_per_year: (body.months_per_year as number | null | undefined) ?? item.months_per_year,
      applies_base_salary: (body.applies_base_salary as boolean | null | undefined) ?? item.applies_base_salary,
      updated_at: new Date().toISOString(),
    } as CatalogItem;
    store.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // DELETE /catalogs/{type}/{id} — desactivación lógica (soft delete)
  http.delete(`${API_BASE}/catalogs/:type/:id`, ({ params }) => {
    const type = params.type as string;
    const id = parseInt(params.id as string, 10);
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Unknown catalog type: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    if (item.deactivated_at) {
      return HttpResponse.json({ message: 'Already deactivated.' }, { status: 409 });
    }
    // Simular referencias activas (en real, el backend valida FK)
    if (id <= 10) {
      return HttpResponse.json(
        { message: 'Cannot deactivate: there are entities referencing this entry.' },
        { status: 409 },
      );
    }
    item.deactivated_at = new Date().toISOString();
    store.set(id, item);
    return HttpResponse.json({ message: 'Deactivated.' });
  }),

  // POST /catalogs/{type}/{id}/restore — restaurar
  http.post(`${API_BASE}/catalogs/:type/:id/restore`, ({ params }) => {
    const type = params.type as string;
    const id = parseInt(params.id as string, 10);
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Unknown catalog type: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    item.deactivated_at = null;
    store.set(id, item);
    return HttpResponse.json({ data: item });
  }),
];
