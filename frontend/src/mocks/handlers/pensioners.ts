import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Pensioner = components['schemas']['Pensioner'];

const API_BASE = 'http://localhost:8000/api/v1';

// Seeds: 2 pensionados (uno activo del caso 3 aprobado, uno suspendido)
const pensioners = new Map<number, Pensioner>([
  [1, {
    id: 1,
    origin_case_id: 3,
    amount: '3250.00',
    status: 'active',
    status_reason: 'Aprobado conforme ley 105',
    person_id: 3,
    person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', middle_name: null, first_surname: 'Martínez', second_surname: null, sex: 'F', race_id: null, address: 'Calle 23 #45, Vedado', birth_date: '1960-02-03', death_date: null, father_name: null, mother_name: null, citizen_card_id: null, deceased: false } as never,
    pension_type_id: 1,
    pension_type: { id: 1, code: 'JUB', name: 'Jubilación' } as never,
    pension_regime_id: 1,
    pension_regime: { id: 1, code: 'GEN', name: 'General' } as never,
    origin_case: { id: 3, number: '11-2026-00003', status: 'approved' } as never,
    status_history: [
      { from_status: null, to_status: 'active', status_reason: 'Aprobado conforme ley 105', changed_by: { id: 2, name: 'Director' }, changed_at: '2026-09-20T10:00:00Z' } as never,
    ],
    bank_controls: [],
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  } as Pensioner],
  [2, {
    id: 2,
    origin_case_id: 5,
    amount: '2800.00',
    status: 'suspended',
    status_reason: 'Suspendido por verificación documental',
    person_id: 7,
    person: { id: 7, identity_number: '78092145678', first_name: 'Carlos', middle_name: null, first_surname: 'Rodríguez', second_surname: null, sex: 'M', race_id: null, address: 'Calle 8 #10, Playa', birth_date: '1955-03-15', death_date: null, father_name: null, mother_name: null, citizen_card_id: null, deceased: false } as never,
    pension_type_id: 1,
    pension_type: { id: 1, code: 'JUB', name: 'Jubilación' } as never,
    pension_regime_id: 1,
    pension_regime: { id: 1, code: 'GEN', name: 'General' } as never,
    origin_case: { id: 5, number: '11-2026-00005', status: 'approved' } as never,
    status_history: [
      { from_status: null, to_status: 'active', status_reason: 'Aprobado', changed_by: { id: 2, name: 'Director' }, changed_at: '2026-08-15T12:00:00Z' } as never,
      { from_status: 'active', to_status: 'suspended', status_reason: 'Suspendido por verificación documental', changed_by: { id: 1, name: 'SGP Demo Admin' }, changed_at: '2026-09-01T09:00:00Z' } as never,
    ],
    bank_controls: [],
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
  } as Pensioner],
]);


export const pensionersHandlers = [
  // GET /pensioners — listado paginado
  http.get(`${API_BASE}/pensioners`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const status = url.searchParams.get('status') ?? '';
    const pensionTypeId = url.searchParams.get('pension_type_id');
    const pensionRegimeId = url.searchParams.get('pension_regime_id');

    let items = Array.from(pensioners.values());
    if (status) items = items.filter((p) => p.status === status);
    if (pensionTypeId) items = items.filter((p) => String(p.pension_type_id) === pensionTypeId);
    if (pensionRegimeId) items = items.filter((p) => String(p.pension_regime_id) === pensionRegimeId);

    // Sin status_history ni bank_controls en las filas del listado
    items = items.map(({ status_history, bank_controls, ...row }) => row as Pensioner);

    items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);

    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // GET /pensioners/{id} — ficha
  http.get(`${API_BASE}/pensioners/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const pensioner = pensioners.get(id);
    if (!pensioner) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: pensioner });
  }),
];
