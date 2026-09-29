import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type Role = components['schemas']['Role'];
type Permission = components['schemas']['Permission'];

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface RolesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_system?: 'all' | 'system' | 'custom';
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useRoles(params: RolesListParams = {}) {
  return useQuery({
    queryKey: ['roles', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Role>>('/roles', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useRole(id?: number | string) {
  return useQuery({
    queryKey: ['roles', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<Role>>(`/roles/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Catálogo completo de permisos (para el formulario de roles) */
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: async () => {
      const response = await http.get<Permission[]>('/permissions');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
