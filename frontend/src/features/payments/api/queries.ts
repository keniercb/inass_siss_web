import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { components } from '@/types/api';

type PensionerPayment = components['schemas']['PensionerPayment'];
type PayrollExportRun = components['schemas']['PayrollExportRun'];

interface PaginatedResponse<T> { data: T[]; meta: { current_page: number; per_page: number; total: number; last_page: number }; }

export interface PaymentsListParams { page?: number; per_page?: number; year?: number; month?: number; status?: string; agency_id?: number; payment_form?: string; pensioner_id?: number; }

export function usePayments(params: PaymentsListParams = {}) {
  return useQuery({
    queryKey: ['payments', 'list', params],
    queryFn: async () => { const r = await http.get<PaginatedResponse<PensionerPayment>>('/payments', { params }); return r.data; },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function usePayment(id?: number | string) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    queryFn: async () => { const r = await http.get<{ data: PensionerPayment }>(`/payments/${id}`); return r.data.data; },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useGeneratePayments() {
  const qc = useQueryClient();
  const { t } = useTranslation('payments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    // Task 71/SGP-55 (D-106): el endpoint NO recibe body — el período se resuelve
    // AUTOMÁTICO al mes siguiente a la fecha actual contra el reloj del servidor.
    mutationFn: async () => { const r = await http.post('/payments/generate'); return r.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success(t('generate.success')); },
    onError: (err: unknown) => { toastApiError(err, { title: t('generate.error'), silent422: true }); },
  });
}

export function useUpdatePaymentStatus(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('payments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: { status: string; paid_at?: string }) => { const r = await http.patch<{ data: PensionerPayment }>(`/payments/${id}/status`, input); return r.data.data; },
    onSuccess: (data) => { qc.setQueryData(['payments', 'detail', id], data); qc.invalidateQueries({ queryKey: ['payments', 'list'] }); toast.success(t('status_change.success')); },
    onError: (err: unknown) => { toastApiError(err, { title: t('status_change.error'), silent422: true }); },
  });
}

/** POST /payments/{id}/collect — cobro de primera clase (Task 68/SGP-52) */
export function useCollectPayment(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('payments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: { agency_id: number; paid_at?: string }) => { const r = await http.post<{ data: PensionerPayment }>(`/payments/${id}/collect`, input); return r.data.data; },
    onSuccess: (data) => { qc.setQueryData(['payments', 'detail', id], data); qc.invalidateQueries({ queryKey: ['payments', 'list'] }); toast.success(t('collect.success')); },
    onError: (err: unknown) => { toastApiError(err, { title: t('collect.error'), silent422: true }); },
  });
}

export function useReconciliation(params: { year?: number; month?: number; agency_id?: number }) {
  return useQuery({
    queryKey: ['payments', 'reconciliation', params],
    queryFn: async () => { const r = await http.get('/payments/reconciliation', { params }); return r.data; },
    staleTime: 30_000,
  });
}

export function usePayrollExports(params: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['payroll-exports', 'list', params],
    queryFn: async () => { const r = await http.get<PaginatedResponse<PayrollExportRun>>('/payroll-exports', { params }); return r.data; },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function usePayrollExport(id?: number | string) {
  return useQuery({
    queryKey: ['payroll-exports', 'detail', id],
    queryFn: async () => { const r = await http.get<{ data: PayrollExportRun }>(`/payroll-exports/${id}`); return r.data.data; },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreatePayrollExport() {
  const qc = useQueryClient();
  const { t } = useTranslation('payments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: { agency_id: number; year: number; month: number }) => { const r = await http.post('/payroll-exports', input); return r.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-exports'] }); toast.success(t('export_create.success')); },
    onError: (err: unknown) => { toastApiError(err, { title: t('export_create.error'), silent422: true }); },
  });
}
