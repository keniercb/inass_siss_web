import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type PensionerPayment = components['schemas']['PensionerPayment'];
type PayrollExportRun = components['schemas']['PayrollExportRun'];

const API_BASE = 'http://localhost:8000/api/v1';

// Seeds: 4 payments (2 pending, 1 paid, 1 cancelled)
const payments = new Map<number, PensionerPayment>([
  [1, { id: 1, pensioner_id: 1, pensioner: { id: 1, person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never, amount: '3250.00' } as never, period: '2026-10', period_year: 2026, period_month: 10, amount: '3250.00', status: 'pending', bank_control: { id: 1, number: 1, agency: { id: 1, code: 'BPA01', name: 'BPA Agencia 1' }, account: '02000012345678901234', electronic_payroll: false } as never, paid_at: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' } as PensionerPayment],
  [2, { id: 2, pensioner_id: 2, pensioner: { id: 2, person: { id: 7, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never, amount: '2800.00' } as never, period: '2026-10', period_year: 2026, period_month: 10, amount: '2800.00', status: 'pending', bank_control: null, paid_at: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' } as PensionerPayment],
  [3, { id: 3, pensioner_id: 1, pensioner: { id: 1, person: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never, amount: '3250.00' } as never, period: '2026-09', period_year: 2026, period_month: 9, amount: '3250.00', status: 'paid', bank_control: { id: 1, number: 1, agency: { id: 1, code: 'BPA01', name: 'BPA Agencia 1' }, account: '02000012345678901234', electronic_payroll: false } as never, paid_at: '2026-09-28', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-28T12:00:00Z' } as PensionerPayment],
  [4, { id: 4, pensioner_id: 2, pensioner: { id: 2, person: { id: 7, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never, amount: '2800.00' } as never, period: '2026-09', period_year: 2026, period_month: 9, amount: '2800.00', status: 'cancelled', bank_control: null, paid_at: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-15T10:00:00Z' } as PensionerPayment],
]);

let nextPaymentId = 100;

// Seeds: 1 completed export run
const exports = new Map<number, PayrollExportRun>([
  [1, { id: 1, period: '2026-10', period_year: 2026, period_month: 10, agency: { id: 1, code: 'BPA01', name: 'BPA Agencia 1' } as never, status: 'completed', filename: 'nomina_bpa01_2026_10.txt', control_filename: 'control_bpa01_2026_10.txt', records_count: 2, total_amount: '6050.00', download_url: '/api/v1/payroll-exports/1/download', error_message: null, created_at: '2026-10-15T00:00:00Z', updated_at: '2026-10-15T00:05:00Z' } as PayrollExportRun],
]);

let nextExportId = 100;

export const paymentsHandlers = [
  // GET /payments — listado
  http.get(`${API_BASE}/payments`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    const status = url.searchParams.get('status');

    let items = Array.from(payments.values());
    if (year) items = items.filter((p) => String(p.payment?.year) === year);
    if (month) items = items.filter((p) => String(p.payment?.month) === month);
    if (status) items = items.filter((p) => p.status === status);
    items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),

  // POST /payments/generate
  http.post(`${API_BASE}/payments/generate`, async ({ request }) => {
    const body = (await request.json()) as { year?: number; month?: number };
    if (!body.year || !body.month) return HttpResponse.json({ message: 'Error de validación.', errors: { year: ['El año es obligatorio.'], month: ['El mes es obligatorio.'] } }, { status: 422 });

    // Crear pagos para pensionados activos
    const period = `${body.year}-${String(body.month).padStart(2, '0')}`;
    const existing = Array.from(payments.values()).filter((p) => p.payment?.period === period);
    if (existing.length > 0) return HttpResponse.json({ message: `Ya existen pagos generados para el período ${period}.` }, { status: 409 });

    // Simular creación de 2 pagos nuevos
    [1, 2].forEach((pid) => {
      const id = nextPaymentId++;
      const p = payments.get(pid);
      if (p) {
        payments.set(id, { ...p, id, period, period_year: body.year!, period_month: body.month!, status: 'pending', paid_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as PensionerPayment);
      }
    });

    return HttpResponse.json({ message: `Pagos generados para el período ${period}.`, count: 2 });
  }),

  // GET /payments/{id}
  http.get(`${API_BASE}/payments/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: p });
  }),

  // PATCH /payments/{id}/status — matriz ampliada (Task 68-69)
  http.patch(`${API_BASE}/payments/:id/status`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as { status?: string; paid_at?: string };
    // Matriz: pending→paid|provitional, provitional→expired|paid, expired→cancelled, cancelled→paid
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
      return HttpResponse.json({ message: `El pago ${id} está ${currentStatus}: la transición a ${body.status} está fuera de la matriz.` }, { status: 422 });
    }

    const updated: PensionerPayment = { ...p, status: body.status as PensionerPayment['status'], paid_at: body.status === 'paid' ? (body.paid_at ?? new Date().toISOString().slice(0, 10)) : p.paid_at, updated_at: new Date().toISOString() };
    payments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // POST /payments/{id}/collect — cobro de primera clase (Task 68/SGP-52)
  http.post(`${API_BASE}/payments/:id/collect`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const p = payments.get(id);
    if (!p) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as { agency_id?: number; paid_at?: string };
    if (!body.agency_id) return HttpResponse.json({ message: 'Error de validación.', errors: { agency_id: ['La agencia de cobro es obligatoria.'] } }, { status: 422 });

    // pending o provitional → paid + sello; paid → solo sello; expired/cancelled → 422
    const currentStatus = p.status ?? 'pending';
    if (currentStatus === 'expired' || currentStatus === 'cancelled') {
      return HttpResponse.json({ message: `Un pago ${currentStatus} no puede ser cobrado directamente. Use PATCH /status primero.` }, { status: 422 });
    }

    const updated: PensionerPayment = {
      ...p,
      status: 'paid',
      paid_at: body.paid_at ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };
    payments.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // GET /payments/reconciliation
  http.get(`${API_BASE}/payments/reconciliation`, ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    let items = Array.from(payments.values());
    if (year) items = items.filter((p) => String(p.payment?.year) === year);
    if (month) items = items.filter((p) => String(p.payment?.month) === month);

    const total = items.length;
    const pending = items.filter((p) => p.status === 'pending').length;
    const paid = items.filter((p) => p.status === 'paid').length;
    const cancelled = items.filter((p) => p.status === 'cancelled').length;
    const paidAmount = items.filter((p) => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    const pendingAmount = items.filter((p) => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount ?? 0), 0);

    return HttpResponse.json({ data: { total, pending, paid, cancelled, paid_amount: paidAmount.toFixed(2), pending_amount: pendingAmount.toFixed(2) } });
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
