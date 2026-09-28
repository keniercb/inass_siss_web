import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type User = components['schemas']['User'];

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface UsersListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'locked';
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useUsers(params: UsersListParams = {}) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<User>>('/users', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useUser(id?: number | string) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<User>>(`/users/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}
