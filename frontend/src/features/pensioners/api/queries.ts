import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { components } from '@/types/api';

type Pensioner = components['schemas']['Pensioner'];
type InitialPayment = components['schemas']['InitialPayment'];

interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface PensionersListParams {
  page?: number;
  per_page?: number;
  status?: string;
  pension_type_id?: number;
  pension_regime_id?: number;
}

export function usePensioners(params: PensionersListParams = {}) {
  return useQuery({
    queryKey: ['pensioners', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Pensioner>>('/pensioners', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function usePensioner(id?: number | string) {
  return useQuery({
    queryKey: ['pensioners', 'detail', id],
    queryFn: async () => {
      const response = await http.get<{ data: Pensioner }>(`/pensioners/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * GET /pensioners/{id}/initial-payments — pagos adicionales del pensionado (Task 73, Bloque A).
 * Cada fila nace de la aprobación del expediente (amount = cuantía + monto introducido, D-7311;
 * status pending) y pasa a done cuando la generación mensual de pagos la liquida.
 * Read-only en el frontend — sin UI de creación (nace del backend).
 */
export function useInitialPayments(pensionerId?: number | string) {
  return useQuery({
    queryKey: ['pensioners', 'detail', pensionerId, 'initial-payments'],
    queryFn: async () => {
      const response = await http.get<{ data: InitialPayment[] }>(`/pensioners/${pensionerId}/initial-payments`);
      return response.data.data;
    },
    enabled: !!pensionerId,
    staleTime: 60_000,
  });
}

/** PATCH /pensioners/{id}/status — suspender, reanudar o extinguir (Task 61/SGP-46) */
export function useUpdatePensionerStatus(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pensioners');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: { status: string; status_reason: string }) => {
      const r = await http.patch<{ data: Pensioner }>(`/pensioners/${id}/status`, input);
      return r.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['pensioners', 'detail', id], data);
      qc.invalidateQueries({ queryKey: ['pensioners', 'list'] });
      toast.success(t('status_change.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, { title: t('status_change.error'), silent422: true });
    },
  });
}

/** PUT /pensioners/{id}/bank-control — asignar o actualizar control bancario (Task 63/SGP-48) */
export function useUpdateBankControl(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pensioners');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: { agency_id: number; account: string }) => {
      const r = await http.put<{ data: Pensioner }>(`/pensioners/${id}/bank-control`, input);
      return r.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['pensioners', 'detail', id], data);
      qc.invalidateQueries({ queryKey: ['pensioners', 'list'] });
      toast.success(t('bank_control.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, { title: t('bank_control.error'), silent422: true });
    },
  });
}
