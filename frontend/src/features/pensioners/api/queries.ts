import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type Pensioner = components['schemas']['Pensioner'];

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
