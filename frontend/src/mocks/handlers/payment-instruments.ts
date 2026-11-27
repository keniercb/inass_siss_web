import { http, HttpResponse } from 'msw';
import type { PaymentInstrument } from '@/features/payment-instruments/api/schemas';

const API_BASE = 'http://localhost:8000/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — 5 instrumentos cubriendo los 5 estados y los 2 tipos
// ─────────────────────────────────────────────────────────────────────────────

type InstrumentType = PaymentInstrument['type'];
type InstrumentStatus = PaymentInstrument['status'];

interface MockLedgerPayment {
  id: number;
  period: string;
  amount: string;
  status: string;
}

const LEDGER_PAYMENTS: MockLedgerPayment[] = [
  { id: 1, period: '2026-11', amount: '3250.00', status: 'pending' },
  { id: 2, period: '2026-11', amount: '2800.00', status: 'pending' },
  { id: 3, period: '2026-10', amount: '3250.00', status: 'paid' },
  { id: 4, period: '2026-10', amount: '2800.00', status: 'paid' },
  { id: 5, period: '2026-09', amount: '3250.00', status: 'expired' },
];

/** Lookup no-undefined por id (los fixtures siempre existen). */
function ledger(id: number): MockLedgerPayment {
  const found = LEDGER_PAYMENTS.find((p) => p.id === id);
  if (!found) throw new Error(`LEDGER_PAYMENTS fixture ${id} missing`);
  return found;
}

function pensioner(id: number, full_name: string, amount: string) {
  return {
    id,
    person: { id: id * 10, full_name },
    status: 'active' as const,
    amount,
  };
}

const instruments = new Map<number, PaymentInstrument>([
  [1, {
    id: 1,
    pensioner_id: 1,
    pensioner: pensioner(1, 'Josefa Martínez Rodríguez', '3250.00'),
    beneficiary: { id: 21, full_name: 'María Elena Pérez Rodríguez' },
    amount: '3250.00',
    type: 'provisional_payment',
    status: 'created',
    set_expired_at: '2026-12-20',
    paid_at: null,
    associated_payments: [ledger(1)],
    created_at: '2026-11-20T10:00:00Z',
    updated_at: null,
  }],
  [2, {
    id: 2,
    pensioner_id: 2,
    pensioner: pensioner(2, 'Carlos Rodríguez Pérez', '2800.00'),
    beneficiary: { id: 22, full_name: 'Luisa Fernández Gómez' },
    amount: '5600.00',
    type: 'provisional_payment',
    status: 'pending',
    set_expired_at: '2026-12-25',
    paid_at: null,
    associated_payments: [ledger(2), ledger(4)],
    created_at: '2026-11-18T09:00:00Z',
    updated_at: '2026-11-22T14:00:00Z',
  }],
  [3, {
    id: 3,
    pensioner_id: 3,
    pensioner: pensioner(3, 'Ana Torres López', '4100.00'),
    beneficiary: { id: 23, full_name: 'Pedro Torres Ruiz' },
    amount: '4100.00',
    type: 'electronic_check',
    status: 'paid',
    set_expired_at: null,
    paid_at: '2026-11-25',
    associated_payments: [ledger(3)],
    created_at: '2026-11-10T08:00:00Z',
    updated_at: '2026-11-25T16:30:00Z',
  }],
  [4, {
    id: 4,
    pensioner_id: 4,
    pensioner: pensioner(4, 'Miguel Sánchez Díaz', '2900.00'),
    beneficiary: { id: 24, full_name: 'Rosa Sánchez Marín' },
    amount: '0.00',
    type: 'provisional_payment',
    status: 'expired',
    set_expired_at: '2026-11-15',
    paid_at: null,
    associated_payments: [],
    created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-11-15T00:05:00Z',
  }],
  [5, {
    id: 5,
    pensioner_id: 5,
    pensioner: pensioner(5, 'Elena Castro Núñez', '3350.00'),
    beneficiary: { id: 25, full_name: 'Jorge Castro Peña' },
    amount: '0.00',
    type: 'electronic_check',
    status: 'cancelled',
    set_expired_at: null,
    paid_at: null,
    associated_payments: [],
    created_at: '2026-11-05T12:00:00Z',
    updated_at: '2026-11-06T10:00:00Z',
  }],
]);

let nextId = 6;

// Matriz del operador (spec): created→pending|cancelled; pending→paid|expired
const TRANSITIONS: Record<InstrumentStatus, InstrumentStatus[]> = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'expired'],
  paid: [],
  expired: [],
  cancelled: [],
};

function filterParams(url: URL) {
  const status = url.searchParams.get('status') as InstrumentStatus | null;
  const type = url.searchParams.get('type') as InstrumentType | null;
  const pensionerId = url.searchParams.get('pensioner_id');
  return { status, type, pensionerId };
}

function applyFilters(items: PaymentInstrument[], f: { status: InstrumentStatus | null; type: InstrumentType | null; pensionerId: string | null }) {
  return items.filter((i) => {
    if (f.status && i.status !== f.status) return false;
    if (f.type && i.type !== f.type) return false;
    if (f.pensionerId && String(i.pensioner_id) !== f.pensionerId) return false;
    return true;
  });
}

export const paymentInstrumentHandlers = [
  // GET /payment-instruments — listado paginado
  http.get(`${API_BASE}/payment-instruments`, ({ request }) => {
    const url = new URL(request.url);
    const { status, type, pensionerId } = filterParams(url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = applyFilters(Array.from(instruments.values()), { status, type, pensionerId })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = items.length;
    const paged = items.slice((page - 1) * perPage, page * perPage);
    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // POST /payment-instruments — creación (nace created)
  http.post(`${API_BASE}/payment-instruments`, async ({ request }) => {
    const body = (await request.json()) as { pensioner_id?: number; beneficiary_person_id?: number; type?: string };
    if (!body.pensioner_id || !body.beneficiary_person_id || !body.type) {
      return HttpResponse.json(
        { message: 'Error de validación.', errors: { pensioner_id: ['El pensionado es obligatorio.'] } },
        { status: 422 },
      );
    }
    // Validación de dominio de ejemplo: pensionado 99 no existe
    if (body.pensioner_id > 100) {
      return HttpResponse.json({ message: 'El pensionado indicado no existe.' }, { status: 422 });
    }
    const id = nextId++;
    const inst: PaymentInstrument = {
      id,
      pensioner_id: body.pensioner_id,
      pensioner: pensioner(body.pensioner_id, `Pensionado ${body.pensioner_id}`, '3000.00'),
      beneficiary: { id: body.beneficiary_person_id, full_name: `Persona ${body.beneficiary_person_id}` },
      amount: '0.00',
      type: body.type as InstrumentType,
      status: 'created',
      set_expired_at: body.type === 'provisional_payment' ? '2026-12-20' : null,
      paid_at: null,
      associated_payments: [],
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    instruments.set(id, inst);
    return HttpResponse.json({ data: inst }, { status: 201 });
  }),

  // GET /payment-instruments/{id} — ficha completa
  http.get(`${API_BASE}/payment-instruments/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const inst = instruments.get(id);
    if (!inst) return HttpResponse.json({ message: 'Instrumento inexistente.' }, { status: 404 });
    return HttpResponse.json({ data: inst });
  }),

  // POST /payment-instruments/{id}/payments — asociar pago del ledger
  http.post(`${API_BASE}/payment-instruments/:id/payments`, async ({ params, request }) => {
    const id = parseInt(params.id as string, 10);
    const inst = instruments.get(id);
    if (!inst) return HttpResponse.json({ message: 'Instrumento inexistente.' }, { status: 404 });
    if (inst.status !== 'created') {
      return HttpResponse.json({ message: 'El instrumento debe estar en estado creado para asociar pagos.' }, { status: 422 });
    }
    const body = (await request.json()) as { payment_id?: number };
    const ledger = LEDGER_PAYMENTS.find((p) => p.id === body.payment_id);
    if (!ledger) return HttpResponse.json({ message: 'El pago indicado no existe.' }, { status: 404 });
    const already = inst.associated_payments.some((p) => p.id === ledger.id);
    if (already) {
      return HttpResponse.json({ message: 'El pago ya está vinculado a este instrumento.' }, { status: 409 });
    }
    // Compatibilidad de estado del ledger con el tipo del instrumento:
    // provisional_payment requiere pagos pendientes; electronic_check admite pagados.
    const compatible = inst.type === 'provisional_payment'
      ? ledger.status === 'pending'
      : ledger.status === 'paid';
    if (!compatible) {
      return HttpResponse.json({ message: 'El estado del pago no es compatible con el tipo del instrumento.' }, { status: 428 });
    }
    const updated: PaymentInstrument = {
      ...inst,
      amount: (Number(inst.amount) + Number(ledger.amount)).toFixed(2),
      associated_payments: [...inst.associated_payments, ledger],
      updated_at: new Date().toISOString(),
    };
    instruments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // POST /payment-instruments/{id}/status — transición de estado
  http.post(`${API_BASE}/payment-instruments/:id/status`, async ({ params, request }) => {
    const id = parseInt(params.id as string, 10);
    const inst = instruments.get(id);
    if (!inst) return HttpResponse.json({ message: 'Instrumento inexistente.' }, { status: 404 });
    const body = (await request.json()) as { status?: string };
    const target = body.status as InstrumentStatus;
    const allowed = TRANSITIONS[inst.status] ?? [];
    if (!target || !allowed.includes(target)) {
      return HttpResponse.json(
        { message: `Movimiento fuera de la matriz: ${inst.status} → ${target ?? '?'}.` },
        { status: 422 },
      );
    }
    const updated: PaymentInstrument = {
      ...inst,
      status: target,
      paid_at: target === 'paid' ? new Date().toISOString().slice(0, 10) : inst.paid_at,
      // Liberación: expired/cancelled revierte el acumulado a 0.00
      amount: target === 'expired' || target === 'cancelled' ? '0.00' : inst.amount,
      updated_at: new Date().toISOString(),
    };
    instruments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),
];
