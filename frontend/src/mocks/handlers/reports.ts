import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:8000/api/v1';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

// 5 estados H-16 del expediente
const CASE_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'deceased'] as const;

// 4 oficinas con tipos y municipios variados
const OFFICES = [
  { office_id: 1, office_type: 'Nacional', municipality: 'Habana Vieja', province: 'La Habana', address: 'Calle Obrapía 1' },
  { office_id: 2, office_type: 'Provincial', municipality: 'Centro Habana', province: 'La Habana', address: 'Reina 100' },
  { office_id: 3, office_type: 'Municipal', municipality: 'Santiago de Cuba', province: 'Santiago de Cuba', address: 'Av. Garzón 50' },
  { office_id: 4, office_type: 'Municipal', municipality: 'Santa Clara', province: 'Villa Clara', address: 'Calle Maestra Nicolasa 12' },
];

function buildCaseReport() {
  const rows = OFFICES.map((o) => {
    // Distribución determinística por oficina
    const status_counts: Record<string, number> = {
      submitted: 5 + (o.office_id % 3),
      under_review: 4 + (o.office_id % 2),
      approved: 12 + o.office_id * 3,
      rejected: 2 + (o.office_id % 2),
      deceased: 1,
    };
    const total = CASE_STATUSES.reduce((acc, s) => acc + (status_counts[s] ?? 0), 0);
    return { ...o, status_counts, total };
  });
  // Totales por estado + general
  const totals: Record<string, number> = { total: 0 };
  for (const s of CASE_STATUSES) {
    const sum = rows.reduce((acc, r) => acc + (r.status_counts[s] ?? 0), 0);
    totals[s] = sum;
    totals.total = (totals.total ?? 0) + sum;
  }
  return { rows, totals };
}

function buildPensionerReport(statusFilter?: string) {
  // Datos base determinísticos; el filtro `status` solo afecta la etiqueta global,
  // no así los desgloses (el mock no filtra realmente, devuelve todo).
  void statusFilter; // sin efecto en el mock; el backend resuelve la semántica
  const by_province = [
    { key: 1, label: 'La Habana', count: 1842, total_amount: '5438000.00' },
    { key: 2, label: 'Santiago de Cuba', count: 612, total_amount: '1812000.00' },
    { key: 3, label: 'Villa Clara', count: 487, total_amount: '1421000.00' },
    { key: 4, label: 'Camagüey', count: 351, total_amount: '1018000.00' },
    { key: null, label: '(sin clasificar)', count: 23, total_amount: '69000.00' },
  ];
  const by_pension_type = [
    { key: 1, label: 'Jubilación', count: 2103, total_amount: '6280000.00' },
    { key: 2, label: 'Invalidez', count: 412, total_amount: '1180000.00' },
    { key: 3, label: 'Fallecimiento', count: 678, total_amount: '1820000.00' },
    { key: 4, label: 'Edad', count: 122, total_amount: '472000.00' },
  ];
  const by_regime = [
    { key: 1, label: 'Seguridad Social', count: 2380, total_amount: '7140000.00' },
    { key: 2, label: 'Asistencia Social', count: 812, total_amount: '2340000.00' },
    { key: 3, label: 'Régimen Especial', count: 123, total_amount: '275000.00' },
  ];
  const count = by_regime.reduce((acc, r) => acc + r.count, 0);
  const total_amount = by_regime.reduce((acc, r) => acc + Number(r.total_amount), 0).toFixed(2);
  return { by_province, by_pension_type, by_regime, totals: { count, total_amount } };
}

const AGENCIES = [
  { agency_id: 1, code: 'BPA01', name: 'BPA Agencia 1', province: 'La Habana' },
  { agency_id: 2, code: 'BPA02', name: 'BPA Agencia 2', province: 'La Habana' },
  { agency_id: 3, code: 'BPA03', name: 'BPA Agencia 3', province: 'Santiago de Cuba' },
  { agency_id: 4, code: 'BPA04', name: 'BPA Agencia 4', province: 'Villa Clara' },
];

function buildBankControlReport(year?: number, month?: number) {
  const hasPeriod = !!year && !!month;
  const rows = AGENCIES.map((a) => {
    const electronic_payroll = 80 + a.agency_id * 7;
    const manual_payroll = 30 + a.agency_id * 3;
    const controls_total = electronic_payroll + manual_payroll;
    const payments = hasPeriod
      ? {
          total: controls_total,
          paid: Math.floor(controls_total * 0.78),
          pending: Math.ceil(controls_total * 0.22),
        }
      : null;
    return { ...a, controls_total, electronic_payroll, manual_payroll, payments };
  });
  return {
    rows,
    period: hasPeriod ? { year: year!, month: month! } : null,
  };
}

function buildDashboardReport(from?: string, to?: string) {
  void from; void to;
  const workload = OFFICES.map((o) => {
    const approved = 8 + o.office_id * 2;
    const rejected = 1 + (o.office_id % 2);
    return {
      ...o,
      open_cases: 12 + o.office_id * 4,
      average_processing_days: String(28 + o.office_id * 3),
      approval_rate: `${(approved / (approved + rejected) * 100).toFixed(1)}%`,
      approved,
      rejected,
    };
  });
  const globalOpen = workload.reduce((a, r) => a + r.open_cases, 0);
  const globalApproved = workload.reduce((a, r) => a + r.approved, 0);
  const globalRejected = workload.reduce((a, r) => a + r.rejected, 0);
  const totalDecisions = globalApproved + globalRejected;
  const avgDays = String(Math.round(workload.reduce((a, r) => a + Number(r.average_processing_days ?? 0), 0) / workload.length));
  return {
    generated_at: new Date().toISOString(),
    window: { from: from ?? '2026-01-01', to: to ?? new Date().toISOString().slice(0, 10) },
    workload,
    global: {
      open_cases: globalOpen,
      approved: globalApproved,
      rejected: globalRejected,
      average_processing_days: avgDays,
      approval_rate: totalDecisions > 0 ? `${(globalApproved / totalDecisions * 100).toFixed(1)}%` : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Corridas de exportación
// ─────────────────────────────────────────────────────────────────────────────

interface MockRun {
  id: number;
  report: 'cases' | 'pensioners' | 'bank-controls' | 'dashboard' | 'case-listing';
  format: 'csv' | 'xlsx';
  filters: Record<string, unknown> | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  records_count: number | null;
  filename: string | null;
  error_message: string | null;
  created_by: number | null;
  created_at: string;
}

let nextRunId = 4;
const runs = new Map<number, MockRun>([
  [1, {
    id: 1, report: 'cases', format: 'xlsx',
    filters: { from: '2026-01-01', to: '2026-06-30' },
    status: 'completed', records_count: 4, filename: 'expedientes_2026-01-01_2026-06-30.xlsx',
    error_message: null, created_by: 1, created_at: '2026-11-01T10:00:00Z',
  }],
  [2, {
    id: 2, report: 'pensioners', format: 'csv',
    filters: { status: 'active' },
    status: 'completed', records_count: 3, filename: 'pensionados_activos.csv',
    error_message: null, created_by: 1, created_at: '2026-11-15T09:30:00Z',
  }],
  [3, {
    id: 3, report: 'bank-controls', format: 'xlsx',
    filters: { year: 2026, month: 11 },
    status: 'completed', records_count: 4, filename: 'controles_bancarios_2026-11.xlsx',
    error_message: null, created_by: 2, created_at: '2026-11-25T14:15:00Z',
  }],
]);

// Avanza el estado de una corrida en cada acceso (simula el worker)
function advanceRun(run: MockRun): MockRun {
  if (run.status === 'queued') {
    run.status = 'processing';
  } else if (run.status === 'processing') {
    run.status = 'completed';
    run.records_count = run.records_count ?? Math.floor(Math.random() * 50) + 10;
    const ext = run.format === 'csv' ? 'csv' : 'xlsx';
    const stamp = new Date().toISOString().slice(0, 10);
    run.filename = run.filename ?? `${run.report}_${stamp}.${ext}`;
  }
  return run;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

export const reportsHandlers = [
  // GET /reports/cases
  http.get(`${API_BASE}/reports/cases`, ({ request }) => {
    const url = new URL(request.url);
    // Filtros ignorados en el mock; el backend los aplica de verdad.
    void url.searchParams.get('from');
    void url.searchParams.get('to');
    void url.searchParams.get('office_id');
    return HttpResponse.json({ data: buildCaseReport() });
  }),

  // GET /reports/pensioners
  http.get(`${API_BASE}/reports/pensioners`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    return HttpResponse.json({ data: buildPensionerReport(status) });
  }),

  // GET /reports/bank-controls
  http.get(`${API_BASE}/reports/bank-controls`, ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const month = url.searchParams.get('month');
    return HttpResponse.json({
      data: buildBankControlReport(year ? parseInt(year, 10) : undefined, month ? parseInt(month, 10) : undefined),
    });
  }),

  // GET /reports/dashboard
  http.get(`${API_BASE}/reports/dashboard`, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? undefined;
    const to = url.searchParams.get('to') ?? undefined;
    return HttpResponse.json({ data: buildDashboardReport(from, to) });
  }),

  // GET /reports/case-fichas/{id} — PDF
  http.get(`${API_BASE}/reports/case-fichas/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!id || id > 1000) return HttpResponse.json({ message: 'Registro inexistente.' }, { status: 404 });
    const pdf = `%PDF-1.4\n% Ficha del expediente ${id} (mock)\n%%EOF\n`;
    return new HttpResponse(pdf, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="expediente-${id}.pdf"` },
    });
  }),

  // GET /reports/pensioner-fichas/{id} — PDF
  http.get(`${API_BASE}/reports/pensioner-fichas/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!id || id > 1000) return HttpResponse.json({ message: 'Registro inexistente.' }, { status: 404 });
    const pdf = `%PDF-1.4\n% Ficha del pensionado ${id} (mock)\n%%EOF\n`;
    return new HttpResponse(pdf, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="pensionado-${id}.pdf"` },
    });
  }),

  // GET /report-exports — listado paginado
  http.get(`${API_BASE}/report-exports`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = Array.from(runs.values())
      .map(advanceRun)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = items.length;
    const paged = items.slice((page - 1) * perPage, page * perPage);
    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // POST /report-exports — 202 async
  http.post(`${API_BASE}/report-exports`, async ({ request }) => {
    const body = (await request.json()) as { report?: string; format?: string };
    if (!body.report || !body.format) {
      return HttpResponse.json(
        { message: 'Error de validación.', errors: { report: ['El reporte es obligatorio.'], format: ['El formato es obligatorio.'] } },
        { status: 422 },
      );
    }
    const id = nextRunId++;
    const run: MockRun = {
      id,
      report: body.report as MockRun['report'],
      format: body.format as MockRun['format'],
      filters: { ...body },
      status: 'queued',
      records_count: null,
      filename: null,
      error_message: null,
      created_by: 1,
      created_at: new Date().toISOString(),
    };
    runs.set(id, run);
    return HttpResponse.json({ data: run }, { status: 202 });
  }),

  // GET /report-exports/{id}
  http.get(`${API_BASE}/report-exports/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const run = runs.get(id);
    if (!run) return HttpResponse.json({ message: 'Registro inexistente.' }, { status: 404 });
    return HttpResponse.json({ data: advanceRun(run) });
  }),

  // GET /report-exports/{id}/download
  http.get(`${API_BASE}/report-exports/:id/download`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const run = runs.get(id);
    if (!run) return HttpResponse.json({ message: 'Registro inexistente.' }, { status: 404 });
    advanceRun(run);
    if (run.status !== 'completed') {
      return HttpResponse.json({ message: 'La exportación aún no está completada.' }, { status: 409 });
    }
    const ext = run.format === 'csv' ? 'csv' : 'xlsx';
    const content = run.format === 'csv'
      ? `reporte,formato,registros\n${run.report},${run.format},${run.records_count}\n`
      : `Mock XLSX for ${run.report} (id=${id})`;
    return new HttpResponse(content, {
      headers: {
        'Content-Type': run.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${run.filename ?? `report-${id}.${ext}`}"`,
      },
    });
  }),
];
