import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type {
  CaseReport,
  PensionerReport,
  BankControlReport,
  DashboardReport,
  ReportExportRun,
  CasesReportParams,
  PensionersReportParams,
  BankControlsReportParams,
  DashboardReportParams,
  ReportExportsIndexParams,
} from './schemas';

// Envelope estándar del backend: { data: T }
interface Envelope<T> { data: T }
interface PaginatedEnvelope<T> { data: T[]; meta: { current_page: number; per_page: number; total: number; last_page: number } }

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de expedientes — GET /api/v1/reports/cases
// ─────────────────────────────────────────────────────────────────────────────

export function useCasesReport(params: CasesReportParams = {}) {
  return useQuery({
    queryKey: ['reports', 'cases', params],
    queryFn: async () => {
      const r = await http.get<Envelope<CaseReport>>('/reports/cases', { params });
      return r.data.data;
    },
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de pensionados — GET /api/v1/reports/pensioners
// ─────────────────────────────────────────────────────────────────────────────

export function usePensionersReport(params: PensionersReportParams = {}) {
  return useQuery({
    queryKey: ['reports', 'pensioners', params],
    queryFn: async () => {
      const r = await http.get<Envelope<PensionerReport>>('/reports/pensioners', { params });
      return r.data.data;
    },
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de controles bancarios — GET /api/v1/reports/bank-controls
// ─────────────────────────────────────────────────────────────────────────────

export function useBankControlsReport(params: BankControlsReportParams = {}) {
  return useQuery({
    queryKey: ['reports', 'bank-controls', params],
    queryFn: async () => {
      const r = await http.get<Envelope<BankControlReport>>('/reports/bank-controls', { params });
      return r.data.data;
    },
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tablero de indicadores — GET /api/v1/reports/dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardReport(params: DashboardReportParams = {}) {
  return useQuery({
    queryKey: ['reports', 'dashboard', params],
    queryFn: async () => {
      const r = await http.get<Envelope<DashboardReport>>('/reports/dashboard', { params });
      return r.data.data;
    },
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Listado de corridas de exportación — GET /api/v1/report-exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polling: si hay items en `queued` o `processing`, refresca cada 5s hasta que
 * todas terminen (completed/failed). El backend cicla el worker sin retries.
 */
export function useReportExports(params: ReportExportsIndexParams = {}) {
  return useQuery({
    queryKey: ['reports', 'exports', 'list', params],
    queryFn: async () => {
      const r = await http.get<PaginatedEnvelope<ReportExportRun>>('/report-exports', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasPending = data.data.some((r) => r.status === 'queued' || r.status === 'processing');
      return hasPending ? 5_000 : false;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Detalle de una corrida — GET /api/v1/report-exports/{id}
// ─────────────────────────────────────────────────────────────────────────────

export function useReportExport(id?: number | string) {
  return useQuery({
    queryKey: ['reports', 'exports', 'detail', id],
    queryFn: async () => {
      const r = await http.get<Envelope<ReportExportRun>>(`/report-exports/${id}`);
      return r.data.data;
    },
    enabled: !!id,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'queued' || data.status === 'processing' ? 5_000 : false;
    },
  });
}
