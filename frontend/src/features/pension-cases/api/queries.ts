import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface CasesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string; // 'submitted' | 'under_review' | 'approved' | 'rejected' | ''
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
