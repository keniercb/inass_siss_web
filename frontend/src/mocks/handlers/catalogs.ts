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
    { code: 'BPA', name: 'Banco Popular de Ahorro', extra: { payment_form: 'tarjeta magnetica' } },
    { code: 'BANMET', name: 'Banco Metropolitano', extra: { payment_form: 'tarjeta magnetica' } },
    { code: 'BAND', name: 'Banco Nacional', extra: { payment_form: 'nomina electronica' } },
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
  // Task 74 (Bloque C): eje retirement_type sustituye al booleano fallecido.
  // Mapeo D-7404: AGE→edad, DIS→invalidez, SUP→fallecimiento.
  'pension-types': seedCatalog('pension-types', [
    { code: 'AGE', name: 'Por edad', extra: { retirement_type: 'edad' } },
    { code: 'DIS', name: 'Por invalidez', extra: { retirement_type: 'invalidez' } },
    { code: 'SUP', name: 'Por sobrevivencia', extra: { retirement_type: 'fallecimiento' } },
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
    {
      code: 'GEN',
      name: 'General',
      extra: {
        months_per_year: 12,
        sector: null,
        // Task 50 (S7 reajuste)
        base_calc_percent: 0.5,
        annual_increase_percent: 0.01,
        limit_percent: 0.9,
        min_work_years: 25,
        min_age_men: 60,
        min_age_women: 55,
        required_salary_records: 5,
        average_strategy: 'best_n',
        // Task 51 (S8.1): N propio de la estrategia = 5 (≤ gate 5, con all sería igual al gate)
        average_years_count: 5,
      },
    },
    {
      code: 'DISC',
      name: 'Discapacidad total',
      extra: {
        months_per_year: 12,
        sector: 1,
        base_calc_percent: 0.6,
        annual_increase_percent: 0.02,
        limit_percent: 0.95,
        min_work_years: 15,
        min_age_men: 55,
        min_age_women: 50,
        required_salary_records: 3,
        average_strategy: 'last_n',
        average_years_count: 3,
      },
    },
  ]),
  // payment-types eliminado (Task 42: el cobro se gestiona por agency-types.payment_form)
  'income-concepts': seedCatalog('income-concepts', [
    { name: 'Salario base', extra: { applies_base_salary: true } },
    { name: 'Antigüedad', extra: { applies_base_salary: false } },
  ]),
  // Task 74 (Bloque C): catálogo diseases — entidad uniforme, nace VACÍA según D-7401.
  // Sembramos algunas filas para desarrollo local; en producción se llena por CRUD.
  diseases: seedCatalog('diseases', [
    { code: 'E001', name: 'Cardiopatía isquémica' },
    { code: 'E002', name: 'Enfermedad cerebrovascular' },
    { code: 'E003', name: 'Neuropatía periférica diabética' },
    { code: 'E004', name: 'Traumatismo craneoencefálico severo' },
    { code: 'E005', name: 'Nefropatía crónica terminal' },
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
      // Task 50 (S7 reajuste): parámetros de cálculo por régimen (pension-regimes).
      // El OpenAPI no marca nullable estos campos, así que usamos undefined (no null)
      // cuando no están presentes en el seed.
      base_calc_percent: item.extra?.base_calc_percent as number | undefined,
      annual_increase_percent: item.extra?.annual_increase_percent as number | undefined,
      limit_percent: item.extra?.limit_percent as number | undefined,
      min_work_years: item.extra?.min_work_years as number | undefined,
      min_age_men: item.extra?.min_age_men as number | undefined,
      min_age_women: item.extra?.min_age_women as number | undefined,
      required_salary_records: item.extra?.required_salary_records as number | undefined,
      average_strategy: item.extra?.average_strategy as 'best_n' | 'last_n' | 'all' | undefined,
      // Task 51 (S8.1): N propio de la estrategia, desacoplado del gate
      average_years_count: item.extra?.average_years_count as number | undefined,
      // Task 74 (Bloque C): eje retirement_type sustituye a deceased_person (pension-types).
      // NOT NULL sin default (D-7403); los catálogos que no lo definen lo dejan undefined.
      retirement_type: item.extra?.retirement_type as 'edad' | 'invalidez' | 'fallecimiento' | undefined,
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
        { message: `Tipo de catálogo desconocido: ${type}` },
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
      return HttpResponse.json({ message: `Tipo de catálogo desconocido: ${type}` }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Validar campos requeridos
    if (!body.name) {
      return HttpResponse.json(
        { message: 'El nombre es obligatorio.', errors: { name: ['El nombre es obligatorio.'] } },
        { status: 422 },
      );
    }

    // Validar unicidad de code (si aplica)
    if (body.code && Array.from(store.values()).some((i) => i.code === body.code)) {
      return HttpResponse.json(
        {
          message: 'El código ya está en uso.',
          errors: { code: ['El código ya está en uso.'] },
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
      // Task 50 (S7 reajuste): pension-regimes calculation params
      base_calc_percent: body.base_calc_percent as number | undefined,
      annual_increase_percent: body.annual_increase_percent as number | undefined,
      limit_percent: body.limit_percent as number | undefined,
      min_work_years: body.min_work_years as number | undefined,
      min_age_men: body.min_age_men as number | undefined,
      min_age_women: body.min_age_women as number | undefined,
      required_salary_records: body.required_salary_records as number | undefined,
      average_strategy: body.average_strategy as 'best_n' | 'last_n' | 'all' | undefined,
      // Task 51 (S8.1): N propio de la estrategia
      average_years_count: body.average_years_count as number | undefined,
      // Task 74 (Bloque C): retirement_type (pension-types) — sustituye a deceased_person
      retirement_type: body.retirement_type as 'edad' | 'invalidez' | 'fallecimiento' | undefined,
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
      return HttpResponse.json({ message: `Tipo de catálogo desconocido: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    }
    return HttpResponse.json({ data: item });
  }),

  // PATCH /catalogs/{type}/{id} — editar (code inmutable)
  http.patch(`${API_BASE}/catalogs/:type/:id`, async ({ request, params }) => {
    const type = params.type as string;
    const id = parseInt(params.id as string, 10);
    const store = catalogStore[type];
    if (!store) {
      return HttpResponse.json({ message: `Tipo de catálogo desconocido: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;

    // Validar code inmutable
    if (body.code !== undefined && body.code !== item.code) {
      return HttpResponse.json(
        {
          message: 'El código no se puede modificar después de la creación.',
          errors: { code: ['El código no se puede modificar después de la creación.'] },
        },
        { status: 422 },
      );
    }

    const updated: CatalogItem = {
      ...item,
      ...body,
      months_per_year: (body.months_per_year as number | null | undefined) ?? item.months_per_year,
      applies_base_salary: (body.applies_base_salary as boolean | null | undefined) ?? item.applies_base_salary,
      // Task 50 (S7 reajuste): pension-regimes calculation params (PATCH semantics)
      base_calc_percent: body.base_calc_percent !== undefined ? body.base_calc_percent as number : item.base_calc_percent,
      annual_increase_percent: body.annual_increase_percent !== undefined ? body.annual_increase_percent as number : item.annual_increase_percent,
      limit_percent: body.limit_percent !== undefined ? body.limit_percent as number : item.limit_percent,
      min_work_years: body.min_work_years !== undefined ? body.min_work_years as number : item.min_work_years,
      min_age_men: body.min_age_men !== undefined ? body.min_age_men as number : item.min_age_men,
      min_age_women: body.min_age_women !== undefined ? body.min_age_women as number : item.min_age_women,
      required_salary_records: body.required_salary_records !== undefined ? body.required_salary_records as number : item.required_salary_records,
      average_strategy: body.average_strategy !== undefined ? body.average_strategy as 'best_n' | 'last_n' | 'all' : item.average_strategy,
      // Task 51 (S8.1)
      average_years_count: body.average_years_count !== undefined ? body.average_years_count as number : item.average_years_count,
      // Task 74 (Bloque C): retirement_type (pension-types) — editable en PATCH (D-7405)
      retirement_type: body.retirement_type !== undefined ? body.retirement_type as 'edad' | 'invalidez' | 'fallecimiento' : item.retirement_type,
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
      return HttpResponse.json({ message: `Tipo de catálogo desconocido: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    }
    if (item.deactivated_at) {
      return HttpResponse.json({ message: 'Ya desactivado.' }, { status: 409 });
    }
    // Simular referencias activas (en real, el backend valida FK)
    if (id <= 10) {
      return HttpResponse.json(
        { message: 'No se puede desactivar: hay entidades que referencian esta entrada.' },
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
      return HttpResponse.json({ message: `Tipo de catálogo desconocido: ${type}` }, { status: 404 });
    }
    const item = store.get(id);
    if (!item) {
      return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    }
    item.deactivated_at = null;
    store.set(id, item);
    return HttpResponse.json({ data: item });
  }),
];
