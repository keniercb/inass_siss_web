import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type DisabilityRule = components['schemas']['DisabilityRule'];
type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}
interface ApiResponse<T> { data: T }

export interface DisabilityRulesListParams {
  page?: number;
  per_page?: number;
}

/** GET /disability-rules — listado paginado de reglas de invalidez por origen */
export function useDisabilityRules(params: DisabilityRulesListParams = {}) {
  return useQuery({
    queryKey: ['disability-rules', 'list', params],
    queryFn: async () => {
      const r = await http.get<PaginatedResponse<DisabilityRule>>('/disability-rules', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/** GET /disability-rules/{id} — detalle de una regla con sus brackets anidados */
export function useDisabilityRule(id?: number | string) {
  return useQuery({
    queryKey: ['disability-rules', 'detail', id],
    queryFn: async () => {
      const r = await http.get<ApiResponse<DisabilityRule>>(`/disability-rules/${id}`);
      return r.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** GET /special-disability-modifications — listado paginado de modificaciones especiales */
export function useSpecialModifications(params: DisabilityRulesListParams = {}) {
  return useQuery({
    queryKey: ['special-disability-modifications', 'list', params],
    queryFn: async () => {
      const r = await http.get<PaginatedResponse<SpecialDisabilityModification>>('/special-disability-modifications', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/** GET /beneficiary-rules — listado paginado de reglas de beneficiario */
export function useBeneficiaryRules(params: DisabilityRulesListParams = {}) {
  return useQuery({
    queryKey: ['beneficiary-rules', 'list', params],
    queryFn: async () => {
      const r = await http.get<PaginatedResponse<BeneficiaryRule>>('/beneficiary-rules', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
