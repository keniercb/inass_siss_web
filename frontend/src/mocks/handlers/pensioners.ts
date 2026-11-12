import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Pensioner = components['schemas']['Pensioner'];
type InitialPayment = components['schemas']['InitialPayment'];

const API_BASE = 'http://localhost:8000/api/v1';

// Task 73/Bloque A: seeds de pagos iniciales por pensionado.
// Cada fila nace con la aprobación del expediente (amount = cuantía + monto introducido, D-7311;
// status pending) y se liquida (status → done) cuando la generación mensual la consume.
// Varias filas por pensionado son legítimas (reapertura + re-aprobación).
const initialPayments = new Map<number, InitialPayment[]>([
  [1, [
    {
      id: 1,
      pensioner_id: 1,
      amount: '4050.50',
      status: 'done',
      description: 'Pago inicial por la aprobación del expediente (cuantía 3250.00 + monto introducido 800.50).',
      created_at: '2026-09-20T10:00:00+00:00',
      updated_at: '2026-10-15T12:00:00+00:00',
    } as InitialPayment,
    {
      id: 2,
      pensioner_id: 1,
      amount: '3300.00',
      status: 'pending',
      description: 'Pago inicial tras reapertura y re-aprobación con nueva instrucción (D-7310(a)).',
      created_at: '2026-11-01T09:30:00+00:00',
      updated_at: '2026-11-01T09:30:00+00:00',
    } as InitialPayment,
  ]],
  [2, [
    {
      id: 3,
      pensioner_id: 2,
      amount: '3600.00',
      status: 'pending',
      description: 'Pago inicial por la aprobación del expediente (cuantía 2800.00 + monto introducido 800.00).',
      created_at: '2026-08-15T12:00:00+00:00',
      updated_at: '2026-08-15T12:00:00+00:00',
    } as InitialPayment,
  ]],
]);

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
    bank_control: null,
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
    bank_control: null,
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

    // Sin status_history ni bank_control en las filas del listado
    items = items.map(({ status_history, bank_control, ...row }) => row as Pensioner);

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

  // PATCH /pensioners/{id}/status — suspender, reanudar o extinguir (Task 61/SGP-46)
  http.patch(`${API_BASE}/pensioners/:id/status`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = pensioners.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as { status?: string; status_reason?: string };
    const errors: Record<string, string[]> = {};

    if (!body.status) errors.status = ['El estado es obligatorio.'];
    if (!body.status_reason || body.status_reason.length < 10) {
      errors.status_reason = ['El motivo es obligatorio y debe tener al menos 10 caracteres.'];
    }

    // Matriz del operador: active→{suspended,terminated}, suspended→{active,terminated}, terminated→NADA
    const currentStatus = p.status ?? 'active';
    const matrix: Record<string, string[]> = {
      active: ['suspended', 'terminated'],
      suspended: ['active', 'terminated'],
      terminated: [],
    };
    const allowed = matrix[currentStatus] ?? [];
    if (body.status && !allowed.includes(body.status)) {
      if (currentStatus === body.status) {
        errors.status = ['La transición debe cambiar el estado actual.'];
      } else {
        return HttpResponse.json({
          message: `El pensionado ${id} está ${currentStatus}: la transición a ${body.status} está fuera de la matriz del operador.`,
          pensioner_id: id,
          status: currentStatus,
          attempted_status: body.status,
        }, { status: 422 });
      }
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Error de validación.', errors }, { status: 422 });
    }

    // Aplicar transición
    const updated: Pensioner = {
      ...p,
      status: body.status as Pensioner['status'],
      status_reason: body.status_reason,
      status_history: [
        ...(p.status_history ?? []),
        { from_status: currentStatus, to_status: body.status as never, status_reason: body.status_reason, changed_by: { id: 1, name: 'SGP Demo Admin' }, changed_at: new Date().toISOString() } as never,
      ],
      updated_at: new Date().toISOString(),
    };
    pensioners.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // PUT /pensioners/{id}/bank-control — asignar o actualizar (Task 63/SGP-48)
  http.put(`${API_BASE}/pensioners/:id/bank-control`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = pensioners.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    // 422 si terminated (no cobra)
    if (p.status === 'terminated') {
      return HttpResponse.json({ message: 'Un pensionado extinguido no puede tener control bancario.' }, { status: 422 });
    }

    const body = (await request.json()) as { agency_id?: number; account?: string };
    const errors: Record<string, string[]> = {};
    if (!body.agency_id) errors.agency_id = ['La agencia de cobro es obligatoria.'];
    if (!body.account || body.account.length < 10 || body.account.length > 34) {
      errors.account = ['La cuenta bancaria es obligatoria y debe tener entre 10 y 34 caracteres.'];
    }

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Error de validación.', errors }, { status: 422 });
    }

    // Upsert: si ya tiene bank_control, actualiza en sitio (mismo número); si no, crea con número nuevo
    const existing = p.bank_control as { id?: number; number?: number; agency?: object; account?: string; electronic_payroll?: boolean; created_at?: string; updated_at?: string } | null | undefined;
    const bankControl = {
      id: existing?.id ?? id,
      number: existing?.number ?? id, // número global simulado = id del pensionado
      agency: { id: body.agency_id, code: 'BPA01', name: 'BPA Agencia 1' },
      account: body.account,
      electronic_payroll: body.agency_id === 2, // simulación: agencia 2 = nómina electrónica
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated: Pensioner = {
      ...p,
      bank_control: bankControl as never,
      updated_at: new Date().toISOString(),
    };
    pensioners.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // GET /pensioners/{id}/initial-payments — pagos adicionales del pensionado (Task 73, Bloque A)
  // Lista los pagos iniciales del pensionado, los más recientes primero.
  // Cada fila nace de la aprobación del expediente y se liquida (pending → done) con la
  // primera fila de pagos generada. Read-only: sin endpoint de creación (nace del backend).
  http.get(`${API_BASE}/pensioners/:id/initial-payments`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    // 404 si el pensionado no existe en seeds
    if (!pensioners.has(id)) {
      return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    }
    const items = initialPayments.get(id) ?? [];
    // Ordenar por created_at DESC (más recientes primero)
    const sorted = [...items].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    return HttpResponse.json({ data: sorted });
  }),
];
