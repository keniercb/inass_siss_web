import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { Entity, Office, AuthorizedSignature } from '@/types/domain';

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface EntitiesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  organization_id?: number;
  entity_type_id?: number;
  province_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useEntities(params: EntitiesListParams = {}) {
  return useQuery({
    queryKey: ['entities', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Entity>>('/entities', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useEntity(id?: number | string) {
  return useQuery({
    queryKey: ['entities', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<Entity>>(`/entities/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useEntitySignatures(entityId?: number | string) {
  return useQuery({
    queryKey: ['entities', 'signatures', entityId],
    queryFn: async () => {
      const response = await http.get<AuthorizedSignature[]>(`/entities/${entityId}/signatures`);
      return response.data;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

export interface OfficesListParams {
  page?: number;
  per_page?: number;
  search?: string;
  office_type_id?: number;
  province_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useOffices(params: OfficesListParams = {}) {
  return useQuery({
    queryKey: ['offices', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Office>>('/offices', { params });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}
