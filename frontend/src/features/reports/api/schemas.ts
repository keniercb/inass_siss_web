import { z } from 'zod';

/**
 * Schemas Zod — módulo Reportes (spec 1.45.0).
 *
 * Espejos read-only de los 9 schemas nuevos del backend. Sin lógica de negocio:
 * validación de formas y tipos solamente. El backend resuelve semántica y 422.
 *
 * Los reportes son endpoints de lectura: el frontend solo filtra y muestra.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de expedientes (RF-REP-001): GET /api/v1/reports/cases
// ─────────────────────────────────────────────────────────────────────────────

export const caseReportRowSchema = z.object({
  office_id: z.number().int(),
  office_type: z.string(),
  municipality: z.string(),
  province: z.string().nullable(),
  address: z.string(),
  status_counts: z.record(z.string(), z.number().int()),
  total: z.number().int(),
});

export const caseReportSchema = z.object({
  rows: z.array(caseReportRowSchema),
  totals: z.record(z.string(), z.number().int()),
});

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de pensionados (RF-REP-002): GET /api/v1/reports/pensioners
// ─────────────────────────────────────────────────────────────────────────────

export const pensionerBreakdownRowSchema = z.object({
  key: z.number().int().nullable(),
  label: z.string(),
  count: z.number().int(),
  total_amount: z.string(),
});

export const pensionerReportSchema = z.object({
  by_province: z.array(pensionerBreakdownRowSchema),
  by_pension_type: z.array(pensionerBreakdownRowSchema),
  by_regime: z.array(pensionerBreakdownRowSchema),
  totals: z.object({
    count: z.number().int(),
    total_amount: z.string(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de controles bancarios (RF-REP-003): GET /api/v1/reports/bank-controls
// ─────────────────────────────────────────────────────────────────────────────

export const bankControlPaymentsSchema = z
  .object({
    total: z.number().int(),
    paid: z.number().int(),
    pending: z.number().int(),
  })
  .nullable();

export const bankControlReportRowSchema = z.object({
  agency_id: z.number().int(),
  code: z.string(),
  name: z.string(),
  province: z.string().nullable(),
  controls_total: z.number().int(),
  electronic_payroll: z.number().int(),
  manual_payroll: z.number().int(),
  payments: bankControlPaymentsSchema,
});

export const bankControlPeriodSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int(),
  })
  .nullable();

export const bankControlReportSchema = z.object({
  rows: z.array(bankControlReportRowSchema),
  period: bankControlPeriodSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Tablero de indicadores (RF-REP-005): GET /api/v1/reports/dashboard
// ─────────────────────────────────────────────────────────────────────────────

export const dashboardWorkloadRowSchema = z.object({
  office_id: z.number().int(),
  office_type: z.string(),
  municipality: z.string(),
  open_cases: z.number().int(),
  average_processing_days: z.string().nullable(),
  approval_rate: z.string().nullable(),
  approved: z.number().int(),
  rejected: z.number().int(),
});

export const dashboardReportSchema = z.object({
  generated_at: z.string(),
  window: z.object({
    from: z.string(),
    to: z.string(),
  }),
  workload: z.array(dashboardWorkloadRowSchema),
  global: z.object({
    open_cases: z.number().int(),
    approved: z.number().int(),
    rejected: z.number().int(),
    average_processing_days: z.string().nullable(),
    approval_rate: z.string().nullable(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Corridas de exportación: GET/POST /api/v1/report-exports
// ─────────────────────────────────────────────────────────────────────────────

export const reportExportRunSchema = z.object({
  id: z.number().int(),
  report: z.enum(['cases', 'pensioners', 'bank-controls', 'dashboard', 'case-listing']),
  format: z.enum(['csv', 'xlsx']),
  filters: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  records_count: z.number().int().nullable(),
  filename: z.string().nullable(),
  error_message: z.string().nullable(),
  created_by: z.number().int().nullable(),
  created_at: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tipos derivados
// ─────────────────────────────────────────────────────────────────────────────

export type CaseReport = z.infer<typeof caseReportSchema>;
export type CaseReportRow = z.infer<typeof caseReportRowSchema>;
export type PensionerReport = z.infer<typeof pensionerReportSchema>;
export type PensionerBreakdownRow = z.infer<typeof pensionerBreakdownRowSchema>;
export type BankControlReport = z.infer<typeof bankControlReportSchema>;
export type BankControlReportRow = z.infer<typeof bankControlReportRowSchema>;
export type BankControlPayments = z.infer<typeof bankControlPaymentsSchema>;
export type DashboardReport = z.infer<typeof dashboardReportSchema>;
export type DashboardWorkloadRow = z.infer<typeof dashboardWorkloadRowSchema>;
export type ReportExportRun = z.infer<typeof reportExportRunSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parámetros de los endpoints (query strings)
// ─────────────────────────────────────────────────────────────────────────────

export const casesReportParamsSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  office_id: z.number().int().optional(),
});

export const pensionersReportParamsSchema = z.object({
  status: z.enum(['active', 'suspended', 'terminated']).optional(),
});

export const bankControlsReportParamsSchema = z.object({
  year: z.number().int().optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const dashboardReportParamsSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const reportExportsIndexParamsSchema = z.object({
  page: z.number().int().optional(),
  per_page: z.number().int().optional(),
});

// Payload del POST /report-exports: depende del `report` elegido. El backend
// valida los pares coherentes con 422; el frontend agrupa los campos en la UI.
export const createExportRunSchema = z
  .object({
    report: z.enum(['cases', 'pensioners', 'bank-controls', 'dashboard', 'case-listing']),
    format: z.enum(['csv', 'xlsx']),
    // cases / dashboard
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    office_id: z.number().int().optional(),
    // pensioners / case-listing
    status: z.string().optional(),
    // bank-controls
    year: z.number().int().optional(),
    month: z.number().int().min(1).max(12).optional(),
    // case-listing
    q: z.string().optional(),
    number: z.string().optional(),
    applicant_person_id: z.number().int().optional(),
    parent_case_id: z.number().int().optional(),
    requested_from: z.string().date().optional(),
    requested_to: z.string().date().optional(),
  })
  .refine((d) => d.report !== 'case-listing' || d.status === undefined || ['submitted', 'under_review', 'approved', 'rejected', 'deceased'].includes(d.status), {
    message: 'case-listing status inválido',
    path: ['status'],
  })
  .refine((d) => d.report !== 'pensioners' || d.status === undefined || ['active', 'suspended', 'terminated'].includes(d.status), {
    message: 'pensioners status inválido',
    path: ['status'],
  });

export type CreateExportRunInput = z.infer<typeof createExportRunSchema>;

export type CasesReportParams = Partial<z.infer<typeof casesReportParamsSchema>>;
export type PensionersReportParams = Partial<z.infer<typeof pensionersReportParamsSchema>>;
export type BankControlsReportParams = Partial<z.infer<typeof bankControlsReportParamsSchema>>;
export type DashboardReportParams = Partial<z.infer<typeof dashboardReportParamsSchema>>;
export type ReportExportsIndexParams = Partial<z.infer<typeof reportExportsIndexParamsSchema>>;
