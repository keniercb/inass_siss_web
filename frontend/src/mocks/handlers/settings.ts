import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type GeneralSettingVersion = Required<components['schemas']['GeneralSettingVersion']>;

const API_BASE = 'http://localhost:8000/api/v1';

// Versión vigente por defecto (2026-01-01)
const seedVersions: GeneralSettingVersion[] = [
  {
    id: 1,
    min_work_years: 15,
    min_age_men: 65,
    min_age_women: 60,
    base_calc_percent: 50,
    max_calc_percent: 90,
    annual_increase_percent: 1,
    effective_from: '2024-01-01',
    effective_to: '2025-12-31',
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    min_work_years: 15,
    min_age_men: 65,
    min_age_women: 60,
    base_calc_percent: 50,
    max_calc_percent: 90,
    annual_increase_percent: 2,
    effective_from: '2026-01-01',
    effective_to: null, // vigente actual
    created_by: 1,
    created_at: '2025-12-15T00:00:00Z',
  },
  {
    id: 3,
    min_work_years: 15,
    min_age_men: 65,
    min_age_women: 60,
    base_calc_percent: 55,
    max_calc_percent: 95,
    annual_increase_percent: 3,
    effective_from: '2027-01-01',
    effective_to: null, // futura
    created_by: 1,
    created_at: '2026-09-15T00:00:00Z',
  },
];

const versions = new Map<number, GeneralSettingVersion>(
  seedVersions.map((v) => [v.id, v]),
);
let nextId = 4;

export const settingsHandlers = [
  // GET /general-settings — listado paginado
  http.get(`${API_BASE}/general-settings`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);

    // Ordenar por effective_from DESC (más reciente primero)
    const items = Array.from(versions.values()).sort((a, b) =>
      b.effective_from.localeCompare(a.effective_from),
    );
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

  // GET /general-settings/current — vigente actual
  http.get(`${API_BASE}/general-settings/current`, ({ request }) => {
    const url = new URL(request.url);
    const at = url.searchParams.get('at'); // optional date

    const today = at ?? new Date().toISOString().slice(0, 10);
    // Encontrar la versión con effective_from <= today (más reciente)
    const allVersions = Array.from(versions.values());
    const applicable = allVersions
      .filter((v) => v.effective_from <= today)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

    if (applicable.length === 0) {
      return HttpResponse.json({ message: 'No effective configuration for this date.' }, { status: 404 });
    }

    const current = applicable[0];
    return HttpResponse.json({ data: current });
  }),

  // GET /general-settings/{id} — detalle
  http.get(`${API_BASE}/general-settings/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const version = versions.get(id);
    if (!version) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json({ data: version });
  }),

  // POST /general-settings — crear nueva vigencia
  http.post(`${API_BASE}/general-settings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    // Validar campos requeridos
    const required = ['min_work_years', 'min_age_men', 'min_age_women', 'base_calc_percent', 'max_calc_percent', 'annual_increase_percent', 'effective_from'];
    const errors: Record<string, string[]> = {};
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        errors[f] = [`The ${f} field is required.`];
      }
    }

    // Validar max >= base
    if (
      typeof body.base_calc_percent === 'number' &&
      typeof body.max_calc_percent === 'number' &&
      body.max_calc_percent < body.base_calc_percent
    ) {
      errors.max_calc_percent = ['The max calc percent must be greater than or equal to the base calc percent.'];
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json(
        { message: 'Validation error.', errors },
        { status: 422 },
      );
    }

    // Validar unicidad de effective_from
    if (Array.from(versions.values()).some((v) => v.effective_from === body.effective_from)) {
      return HttpResponse.json(
        {
          message: 'A version with that effective date already exists.',
          errors: { effective_from: ['A version with that effective date already exists.'] },
        },
        { status: 409 },
      );
    }

    const id = nextId++;
    const version: GeneralSettingVersion = {
      id,
      min_work_years: body.min_work_years as number,
      min_age_men: body.min_age_men as number,
      min_age_women: body.min_age_women as number,
      base_calc_percent: body.base_calc_percent as number,
      max_calc_percent: body.max_calc_percent as number,
      annual_increase_percent: body.annual_increase_percent as number,
      effective_from: body.effective_from as string,
      effective_to: null,
      created_by: 1,
      created_at: new Date().toISOString(),
    };
    versions.set(id, version);
    return HttpResponse.json({ data: version }, { status: 201 });
  }),

  // DELETE /general-settings/{id} — eliminar vigencia
  http.delete(`${API_BASE}/general-settings/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const version = versions.get(id);
    if (!version) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    // Si la vigencia ya está en vigor, no se puede eliminar (409)
    const today = new Date().toISOString().slice(0, 10);
    if (version.effective_from <= today) {
      return HttpResponse.json(
        { message: 'The version is already in effect and cannot be deleted.' },
        { status: 409 },
      );
    }

    versions.delete(id);
    return HttpResponse.json({ message: 'Version deleted.' });
  }),
];
