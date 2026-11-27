import { useQuery, useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useTranslation } from 'react-i18next';
import { useApiError } from '@/lib/api-error';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];
type PensionCaseHistory = components['schemas']['PensionCaseHistory'];
type CaseCalculation = components['schemas']['CaseCalculation'];

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface CasesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string; // 'submitted' | 'under_review' | 'approved' | 'rejected' | 'deceased' | ''
  /** Búsqueda inversa: el expediente derivado de este id de expediente padre */
  parent_case_id?: number;
  office_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function usePensionCases(params: CasesListParams = {}) {
  return useQuery({
    queryKey: ['pension-cases', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<PensionCase>>('/pension-cases', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function usePensionCase(id?: number | string) {
  return useQuery({
    queryKey: ['pension-cases', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<PensionCase>>(`/pension-cases/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** GET /pension-cases/{id}/transitions — historial append-only de transiciones (S6, RF-EXP-009). */
export function usePensionCaseHistory(id?: number | string) {
  return useQuery({
    queryKey: ['pension-cases', 'history', id],
    queryFn: async () => {
      const response = await http.get<{ data: PensionCaseHistory[] }>(`/pension-cases/${id}/transitions`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * GET /pension-cases/{id}/calculation — snapshot congelado del cálculo (Task 51/S8.4, RF-CAL-008).
 * Devuelve null mientras el expediente no tenga cálculo congelado (no aprobado).
 */
export function useCaseCalculation(id?: number | string) {
  return useQuery({
    queryKey: ['pension-cases', 'calculation', id],
    queryFn: async () => {
      const response = await http.get<{ data: CaseCalculation | null }>(`/pension-cases/${id}/calculation`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * POST /pension-cases/{id}/calculation-preview — vista previa del cálculo SIN persistir
 * (Task 51/S8.2, RF-CAL-006). Disponible solo en submitted/under_review.
 *
 * Es una mutation porque ejecuta el motor de cálculo en el backend (aunque no escriba).
 * 409 si el expediente está aprobado/rejected (cálculo congelado o no disponible).
 */
export function useCalculationPreview(caseId: number | string) {
  const { t } = useTranslation('pension-cases');
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async () => {
      const r = await http.post<{ data: components['schemas']['CalculationPreview'] }>(`/pension-cases/${caseId}/calculation-preview`);
      return r.data.data;
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('calculation_preview.error'),
        fallbackDetail: t('calculation_preview.error_409'),
      });
    },
  });
}
