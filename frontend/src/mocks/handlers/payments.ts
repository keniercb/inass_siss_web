import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type PensionerPayment = components['schemas']['PensionerPayment'];
type PayrollExportRun = components['schemas']['PayrollExportRun'];

const API_BASE = 'http://localhost:8000/api/v1';

// Helper para construir un objeto payment ancla (nivel 1, Task 68/SGP-52)
function buildPayment(id: number, form: 'tarjeta magnetica' | 'nomina electronica', year: number, month: number) {
  return {
    id,
    payment_form: form,
    period: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
  };
}

// Helper: agencia viva (proyección del control) y agencia CONGELADA (snapshot del pago)
function agency(id: number, code: string, name: string) {
  return { id, code, name };
}

// Seeds: 6 pagos cubriendo los 5 estados H-16 (pending, provitional, paid, expired, cancelled)
// y las 2 formas de pago (tarjeta magnetica / nomina electronica).
// Estructura nueva (Task 68/SGP-52 + Task 69/SGP-53 + Task 70/SGP-54):
//   - payment: ancla del período por forma
//   - agency: snapshot CONGELADO al generar (puede divergir del vivo del bank_control)
//   - account: cuenta CONGELADA al generar
//   - paid_on: agencia donde se hizo efectivo el cobro (NULL hasta el cobro)
//   - valid_from: acreditable desde (nómina → fecha actual al generar; tarjeta → NULL)
//   - set_provitional_at: fecha en que el job abre la ventana (nace estampada desde Task 70)
//   - set_expired_at: fecha en que el job cierra la ventana
const payments = new Map<number, PensionerPayment>([
  [1, {
    id: 1,
    pensioner_id: 1,
    pensioner: { id: 1, person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never, amount: '3250.00' } as never,
    payment: buildPayment(101, 'nomina electronica', 2026, 10),
    bank_control: { id: 1, number: 1, agency: agency(1, 'BPA01', 'BPA Agencia 1'), account: '02000012345678901234', electronic_payroll: true } as never,
    agency: agency(1, 'BPA01', 'BPA Agencia 1'),
    account: '02000012345678901234',
    amount: '3250.00',
    status: 'pending',
    paid_at: null,
    paid_on: null,
    valid_from: '2026-10-01',
    set_provitional_at: '2026-11-01',
    set_expired_at: '2026-12-01',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  } as PensionerPayment],
  [2, {
    id: 2,
    pensioner_id: 2,
    pensioner: { id: 2, person: { id: 7, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never, amount: '2800.00' } as never,
    payment: buildPayment(102, 'tarjeta magnetica', 2026, 10),
    bank_control: { id: 2, number: 2, agency: agency(2, 'BPA02', 'BPA Agencia 2'), account: '02000098765432109876', electronic_payroll: false } as never,
    agency: agency(2, 'BPA02', 'BPA Agencia 2'),
    account: '02000098765432109876',
    amount: '2800.00',
    status: 'paid',
    paid_at: '2026-10-20',
    paid_on: agency(2, 'BPA02', 'BPA Agencia 2'),
    valid_from: null,
    set_provitional_at: '2026-11-01',
    set_expired_at: '2026-12-01',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-20T12:00:00Z',
  } as PensionerPayment],
  [3, {
    id: 3,
    pensioner_id: 1,
    pensioner: { id: 1, person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never, amount: '3250.00' } as never,
    payment: buildPayment(103, 'nomina electronica', 2026, 9),
    bank_control: { id: 1, number: 1, agency: agency(1, 'BPA01', 'BPA Agencia 1'), account: '02000012345678901234', electronic_payroll: true } as never,
    agency: agency(1, 'BPA01', 'BPA Agencia 1'),
    account: '02000012345678901234',
    amount: '3250.00',
    status: 'provitional',
    paid_at: null,
    paid_on: null,
    valid_from: '2026-09-01',
    set_provitional_at: '2026-10-01',
    set_expired_at: '2026-11-01',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-10-01T00:05:00Z',
  } as PensionerPayment],
  [4, {
    id: 4,
    pensioner_id: 2,
    pensioner: { id: 2, person: { id: 7, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never, amount: '2800.00' } as never,
    payment: buildPayment(104, 'nomina electronica', 2026, 8),
    bank_control: { id: 2, number: 2, agency: agency(2, 'BPA02', 'BPA Agencia 2'), account: '02000098765432109876', electronic_payroll: true } as never,
    agency: agency(2, 'BPA02', 'BPA Agencia 2'),
    account: '02000098765432109876',
    amount: '2800.00',
    status: 'expired',
    paid_at: null,
    paid_on: null,
    valid_from: '2026-08-01',
    set_provitional_at: '2026-09-01',
    set_expired_at: '2026-10-01',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-10-01T00:10:00Z',
  } as PensionerPayment],
  [5, {
    id: 5,
    pensioner_id: 1,
    pensioner: { id: 1, person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never, amount: '3250.00' } as never,
    payment: buildPayment(105, 'nomina electronica', 2026, 7),
    bank_control: { id: 1, number: 1, agency: agency(1, 'BPA01', 'BPA Agencia 1'), account: '02000012345678901234', electronic_payroll: true } as never,
    agency: agency(1, 'BPA01', 'BPA Agencia 1'),
    account: '02000012345678901234',
    amount: '3250.00',
    status: 'cancelled',
    paid_at: null,
    paid_on: null,
    valid_from: '2026-07-01',
    set_provitional_at: '2026-08-01',
    set_expired_at: '2026-09-01',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-15T10:00:00Z',
  } as PensionerPayment],
  [6, {
    id: 6,
    pensioner_id: 3,
    pensioner: { id: 3, person: { id: 11, identity_number: '89013145678', first_name: 'Lázaro', first_surname: 'Pérez' } as never, amount: '4100.00' } as never,
    payment: buildPayment(106, 'nomina electronica', 2026, 10),
    bank_control: null,
    agency: null,
    amount: '4100.00',
    status: 'pending',
    paid_at: null,
    paid_on: null,
    valid_from: '2026-10-01',
    set_provitional_at: '2026-11-01',
    set_expired_at: '2026-12-01',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  } as PensionerPayment],
]);

let nextPaymentId = 1000;
let nextPaymentAnchorId = 2000;

// Seeds: 1 completed export run
const exports = new Map<number, PayrollExportRun>([
  [1, { id: 1, period: '2026-10', period_year: 2026, period_month: 10, agency: { id: 1, code: 'BPA01', name: 'BPA Agencia 1' } as never, status: 'completed', filename: 'nomina_bpa01_2026_10.txt', control_filename: 'control_bpa01_2026_10.txt', records_count: 2, total_amount: '6050.00', download_url: '/api/v1/payroll-exports/1/download', error_message: null, created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:05:00Z' } as PayrollExportRun],
]);

let nextExportId = 100;

export const paymentsHandlers = [
  // GET /payments — listado (filtrable por año, mes, status, pensioner_id, payment_form, agency_id)
  http.get(`${API_BASE}/payments`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const status = url.searchParams.get('status');
    const pensionerId = url.searchParams.get('pensioner_id');
    const paymentForm = url.searchParams.get('payment_form');
    const agencyId = url.searchParams.get('agency_id');

    let items = Array.from(payments.values());
    if (year) items = items.filter((p) => String(p.payment?.year) === year);
    if (month) items = items.filter((p) => String(p.payment?.month) === month);
    if (status) items = items.filter((p) => p.status === status);
    if (pensionerId) items = items.filter((p) => String(p.pensioner_id) === pensionerId);
    if (paymentForm) items = items.filter((p) => p.payment?.payment_form === paymentForm);
    if (agencyId) items = items.filter((p) => String(p.agency?.id) === agencyId);
    items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),

  // POST /payments/generate — generación mensual a dos niveles (Task 68/SGP-52)
  // Respuesta: { period, payments: [{payment_id, payment_form, created}], pensioner_payments: {created_count, skipped_count, skipped_no_control} }
  http.post(`${API_BASE}/payments/generate`, async ({ request }) => {
    const body = (await request.json()) as { year?: number; month?: number };
    if (!body.year || !body.month) return HttpResponse.json({ message: 'Error de validación.', errors: { year: ['El año es obligatorio.'], month: ['El mes es obligatorio.'] } }, { status: 422 });

    const year = body.year!;
    const month = body.month!;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    // Verificar período futuro
    const now = new Date();
    if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
      return HttpResponse.json({ message: 'El período no puede ser futuro.' }, { status: 422 });
    }

    // Nivel 1: crear/obtener el Payment por cada forma (idempotente por UNIQUE forma×período)
    const forms = ['tarjeta magnetica', 'nomina electronica'] as const;
    const paymentsLevel1 = forms.map((form) => {
      const existing = Array.from(payments.values()).find((p) => p.payment?.payment_form === form && p.payment?.period === period);
      if (existing) {
        return { payment_id: existing.payment!.id, payment_form: form, created: false };
      }
      const anchorId = nextPaymentAnchorId++;
      // Simular creación del ancla
      return { payment_id: anchorId, payment_form: form, created: true };
    });

    // Nivel 2: crear filas pensioner_payments por pensionado activo CON control bancario
    let createdCount = 0;
    let skippedCount = 0;
    let skippedNoControl = 0;

    // Simular: cada pensionado de los seeds 1 y 2 genera una fila
    const seedPensioners = [
      { pid: 1, control: payments.get(1)?.bank_control, amount: '3250.00' },
      { pid: 2, control: payments.get(2)?.bank_control, amount: '2800.00' },
      { pid: 3, control: payments.get(6)?.bank_control ?? null, amount: '4100.00' }, // sin control → skipped_no_control
    ];

    seedPensioners.forEach(({ pid, control, amount }) => {
      // Idempotente: saltar si ya existe fila para (pensionado, período)
      const exists = Array.from(payments.values()).some((p) => p.pensioner_id === pid && p.payment?.period === period);
      if (exists) {
        skippedCount++;
        return;
      }
      if (!control) {
        skippedNoControl++;
        return;
      }
      const ctrl = control as { id: number; number: number; agency: { id: number; code: string; name: string }; account: string; electronic_payroll?: boolean };
      const id = nextPaymentId++;
      const form: 'tarjeta magnetica' | 'nomina electronica' = ctrl.electronic_payroll ? 'nomina electronica' : 'tarjeta magnetica';
      const anchor = paymentsLevel1.find((p) => p.payment_form === form)!;
      const todayIso = new Date().toISOString().slice(0, 10);
      // set_provitional_at / set_expired_at: nacen estampados desde la config activa (Task 70)
      const baseDate = new Date(year, month - 1, 15); // payment_day = 15 por defecto
      const setProvitional = new Date(baseDate); setProvitional.setMonth(setProvitional.getMonth() + 1); // +1 mes
      const setExpired = new Date(setProvitional); setExpired.setMonth(setExpired.getMonth() + 1); // +1 mes

      payments.set(id, {
        id,
        pensioner_id: pid,
        pensioner: payments.get(pid === 1 ? 1 : pid === 2 ? 2 : 6)?.pensioner as never,
        payment: { id: anchor.payment_id, payment_form: form, period, year, month },
        bank_control: ctrl as never,
        agency: ctrl.agency,
        account: ctrl.account,
        amount,
        status: form === 'nomina electronica' ? 'pending' : 'paid',
        paid_at: form === 'tarjeta magnetica' ? todayIso : null,
        paid_on: form === 'tarjeta magnetica' ? ctrl.agency : null,
        valid_from: form === 'nomina electronica' ? todayIso : null,
        set_provitional_at: setProvitional.toISOString().slice(0, 10),
        set_expired_at: setExpired.toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as PensionerPayment);
      createdCount++;
    });

    return HttpResponse.json({
      data: {
        period,
        payments: paymentsLevel1,
        pensioner_payments: {
          created_count: createdCount,
          skipped_count: skippedCount,
          skipped_no_control: skippedNoControl,
        },
      },
    });
  }),

  // GET /payments/{id}
  http.get(`${API_BASE}/payments/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: p });
  }),

  // PATCH /payments/{id}/status — matriz H-16 ampliada (Task 69/SGP-53)
  http.patch(`${API_BASE}/payments/:id/status`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as { status?: string; paid_at?: string };
    // Matriz: pending→paid|provitional|cancelled, provitional→expired|paid, expired→cancelled, cancelled→paid
    // paid es TERMINAL ESTRICTO (sin salida)
    const matrix: Record<string, string[]> = {
      pending: ['paid', 'provitional', 'cancelled'],
      provitional: ['expired', 'paid'],
      expired: ['cancelled'],
      cancelled: ['paid'],
      paid: [],
    };
    const currentStatus = p.status ?? 'pending';
    const allowed = matrix[currentStatus] ?? [];
    if (!body.status || !allowed.includes(body.status)) {
      if (currentStatus === body.status) return HttpResponse.json({ message: 'La transición debe cambiar el estado actual.' }, { status: 422 });
      return HttpResponse.json({ message: `El pago ${id} está ${currentStatus}: la transición a ${body.status} está fuera de la matriz H-16.` }, { status: 422 });
    }

    const updated: PensionerPayment = {
      ...p,
      status: body.status as PensionerPayment['status'],
      paid_at: body.status === 'paid' ? (body.paid_at ?? new Date().toISOString().slice(0, 10)) : p.paid_at,
      updated_at: new Date().toISOString(),
    } as PensionerPayment;
    payments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // POST /payments/{id}/collect — cobro de primera clase (Task 68/SGP-52)
  // pending|provitional → paid + sello; paid → solo sello; expired|cancelled → 422
  http.post(`${API_BASE}/payments/:id/collect`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as { agency_id?: number; paid_at?: string };
    if (!body.agency_id) return HttpResponse.json({ message: 'Error de validación.', errors: { agency_id: ['La agencia de cobro es obligatoria.'] } }, { status: 422 });

    const currentStatus = p.status ?? 'pending';
    if (currentStatus === 'expired' || currentStatus === 'cancelled') {
      return HttpResponse.json({ message: `Un pago ${currentStatus} no puede ser cobrado directamente. Use PATCH /status primero.` }, { status: 422 });
    }
    if (currentStatus === 'paid' && p.paid_on) {
      return HttpResponse.json({ message: 'El cobro ya fue sellado. La corrección es evidencia de auditoría.' }, { status: 422 });
    }

    const collectAgency = agency(body.agency_id, `BPA${String(body.agency_id).padStart(2, '0')}`, `BPA Agencia ${body.agency_id}`);
    const updated: PensionerPayment = {
      ...p,
      status: 'paid',
      paid_at: body.paid_at ?? new Date().toISOString().slice(0, 10),
      paid_on: collectAgency,
      updated_at: new Date().toISOString(),
    } as PensionerPayment;
    payments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // GET /payments/reconciliation — 5 buckets (Task 69/SGP-53)
  http.get(`${API_BASE}/payments/reconciliation`, ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const agencyId = url.searchParams.get('agency_id');
    let items = Array.from(payments.values());
    if (year) items = items.filter((p) => String(p.payment?.year) === year);
    if (month) items = items.filter((p) => String(p.payment?.month) === month);
    if (agencyId) items = items.filter((p) => String(p.agency?.id) === agencyId);

    const total = items.length;
    const buckets = (status: string) => items.filter((p) => p.status === status);
    const sumAmount = (status: string) => buckets(status).reduce((acc, p) => acc + Number(p.amount ?? 0), 0).toFixed(2);

    const pending = buckets('pending').length;
    const provitional = buckets('provitional').length;
    const paid = buckets('paid').length;
    const expired = buckets('expired').length;
    const cancelled = buckets('cancelled').length;

    return HttpResponse.json({
      data: {
        total,
        pending: { count: pending, amount: sumAmount('pending') },
        provitional: { count: provitional, amount: sumAmount('provitional') },
        paid: { count: paid, amount: sumAmount('paid') },
        expired: { count: expired, amount: sumAmount('expired') },
        cancelled: { count: cancelled, amount: sumAmount('cancelled') },
      },
    });
  }),

  // GET /payroll-exports — listado
  http.get(`${API_BASE}/payroll-exports`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = Array.from(exports.values()).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const total = items.length;
    const paged = items.slice((page - 1) * perPage, page * perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),

  // POST /payroll-exports
  http.post(`${API_BASE}/payroll-exports`, async ({ request }) => {
    const body = (await request.json()) as { agency_id?: number; year?: number; month?: number };
    if (!body.agency_id || !body.year || !body.month) return HttpResponse.json({ message: 'Error de validación.', errors: { agency_id: ['La agencia es obligatoria.'], year: ['El año es obligatorio.'], month: ['El mes es obligatorio.'] } }, { status: 422 });

    const id = nextExportId++;
    const period = `${body.year}-${String(body.month).padStart(2, '0')}`;
    const run: PayrollExportRun = { id, period, period_year: body.year, period_month: body.month, agency: { id: body.agency_id, code: 'BPA01', name: 'BPA Agencia 1' } as never, status: 'completed', filename: `nomina_bpa01_${period}.txt`, control_filename: `control_bpa01_${period}.txt`, records_count: 2, total_amount: '6050.00', download_url: `/api/v1/payroll-exports/${id}/download`, error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PayrollExportRun;
    exports.set(id, run);
    return HttpResponse.json({ data: run }, { status: 201 });
  }),

  // GET /payroll-exports/{id}
  http.get(`${API_BASE}/payroll-exports/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const run = exports.get(id);
    if (!run) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: run });
  }),

  // GET /payroll-exports/{id}/download
  http.get(`${API_BASE}/payroll-exports/:id/download`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const run = exports.get(id);
    if (!run) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    if (run.status !== 'completed') return HttpResponse.json({ message: 'La exportación no está completada.' }, { status: 409 });
    // Simular descarga con texto plano
    return new HttpResponse(`NÓMINA ${run.period} - Agencia ${run.agency?.name}\nRegistros: ${run.records_count}\nTotal: ${run.total_amount}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${run.filename}"` } });
  }),
];
