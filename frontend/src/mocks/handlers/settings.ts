import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type GeneralSettingVersion = components['schemas']['GeneralSettingVersion'];

const API_BASE = 'http://localhost:8000/api/v1';

// Task 55/S9.1: doctrina 2026 — 7 campos nuevos
// Seeds: 2 versiones históricas + 1 activa
const seedVersions: GeneralSettingVersion[] = [
  {
    id: 1,
    combatant_threshold_date: '1959-01-01',
    pre_threshold_percent: 0.5,
    post_threshold_percent: 0.3,
    internationalist_increment: 100,
    minimum_pension: 200,
    maximum_pension: 2000,
    minimum_pension_increment: 50,
    active: false,
    effective_from: '2024-01-01',
    deactivated_at: '2026-01-01T00:00:00Z',
    created_by: 1,
    created_at: '2023-12-15T00:00:00Z',
  },
  {
    id: 2,
    combatant_threshold_date: '1959-01-01',
    pre_threshold_percent: 0.5,
    post_threshold_percent: 0.3,
    internationalist_increment: 150,
    minimum_pension: 200,
    maximum_pension: 2500,
    minimum_pension_increment: 50,
    active: true,
    effective_from: '2026-01-01',
    deactivated_at: null,
    created_by: 1,
    created_at: '2025-12-15T00:00:00Z',
  },
];

const versions = new Map<number, GeneralSettingVersion>(
  seedVersions.map((v) => [v.id, v]),
);
let nextId = 3;

export const settingsHandlers = [
  // GET /general-settings — historial append-only (más reciente primero)
  http.get(`${API_BASE}/general-settings`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);

    const items = Array.from(versions.values()).sort((a, b) =>
      (b.effective_from ?? '').localeCompare(a.effective_from ?? ''),
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

  // GET /general-settings/current — la única activa
  http.get(`${API_BASE}/general-settings/current`, () => {
    const active = Array.from(versions.values()).find((v) => v.active);
    if (!active) {
      return HttpResponse.json({ message: 'No active configuration.' }, { status: 404 });
    }
    return HttpResponse.json({ data: active });
  }),

  // GET /general-settings/{id} — detalle de una versión
  http.get(`${API_BASE}/general-settings/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const version = versions.get(id);
    if (!version) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json({ data: version });
  }),

  // POST /general-settings — publicar nueva versión (desactiva la anterior)
  http.post(`${API_BASE}/general-settings`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    // Task 55/S9.1: anti-descarte-silencioso — los 6 campos viejos → 422
    const deprecatedFields = ['min_work_years', 'min_age_men', 'min_age_women', 'base_calc_percent', 'max_calc_percent', 'annual_increase_percent', 'effective_from'];
    const errors: Record<string, string[]> = {};
    for (const f of deprecatedFields) {
      if (body[f] !== undefined) {
        errors[f] = [`The ${f} field is deprecated and no longer accepted.`];
      }
    }

    // Validar 7 campos requeridos nuevos
    const required = ['combatant_threshold_date', 'pre_threshold_percent', 'post_threshold_percent', 'internationalist_increment', 'minimum_pension', 'maximum_pension', 'minimum_pension_increment'];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === '') {
        errors[f] = [`The ${f} field is required.`];
      }
    }

    // Validar maximum_pension >= minimum_pension
    if (typeof body.minimum_pension === 'number' && typeof body.maximum_pension === 'number' && body.maximum_pension < body.minimum_pension) {
      errors.maximum_pension = ['The maximum pension must be greater than or equal to the minimum pension.'];
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
    }

    // Desactivar la versión activa actual
    const currentActive = Array.from(versions.values()).find((v) => v.active);
    if (currentActive) {
      versions.set(currentActive.id!, {
        ...currentActive,
        active: false,
        deactivated_at: new Date().toISOString(),
      });
    }

    // Crear nueva versión activa — effective_from sellado por el servidor
    const id = nextId++;
    const now = new Date().toISOString().slice(0, 10);
    const version: GeneralSettingVersion = {
      id,
      combatant_threshold_date: body.combatant_threshold_date as string,
      pre_threshold_percent: body.pre_threshold_percent as number,
      post_threshold_percent: body.post_threshold_percent as number,
      internationalist_increment: body.internationalist_increment as number,
      minimum_pension: body.minimum_pension as number,
      maximum_pension: body.maximum_pension as number,
      minimum_pension_increment: body.minimum_pension_increment as number,
      active: true,
      effective_from: now,
      deactivated_at: null,
      created_by: 1,
      created_at: new Date().toISOString(),
    };
    versions.set(id, version);
    return HttpResponse.json({ data: version }, { status: 201 });
  }),

  // DELETE /general-settings/{id} — solo inactivas
  http.delete(`${API_BASE}/general-settings/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const version = versions.get(id);
    if (!version) {
      return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    }

    if (version.active) {
      return HttpResponse.json(
        { message: 'The version is active and cannot be deleted. Publish a new version to change it.' },
        { status: 409 },
      );
    }

    versions.delete(id);
    return HttpResponse.json({ message: 'Version deleted.' });
  }),
];
