import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];

interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

export interface PeopleListParams {
  page?: number;
  per_page?: number;
  search?: string;
  deceased?: 'all' | 'alive' | 'deceased';
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Listado de personas con búsqueda (por CI exacto o por nombre).
 * El backend decide si `search` es CI exacto o nombre aproximado basándose
 * en si el patrón es 11 dígitos o texto libre.
 */
export function usePeople(params: PeopleListParams = {}) {
  return useQuery({
    queryKey: ['people', 'list', params],
    queryFn: async () => {
      // Transformar deceased: 'all' → omitir, 'alive' → false, 'deceased' → true
      const queryParams: Record<string, unknown> = { ...params };
      if (!queryParams.deceased || queryParams.deceased === 'all') {
        delete queryParams.deceased;
      } else if (queryParams.deceased === 'alive') {
        queryParams.deceased = false;
      } else if (queryParams.deceased === 'deceased') {
        queryParams.deceased = true;
      }
      const response = await http.get<PaginatedResponse<Person>>('/people', { params: queryParams });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/** Detalle de una persona por ID */
export function usePerson(id?: number | string) {
  return useQuery({
    queryKey: ['people', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<Person>>(`/people/${id}`);
      return response.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Búsqueda por CI exacto (retorna la persona si la encuentra, null si no) */
export function usePersonByCI(ci?: string) {
  return useQuery({
    queryKey: ['people', 'by-ci', ci],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Person>>('/people', {
        params: { search: ci, per_page: 1 },
      });
      return response.data.data[0] ?? null;
    },
    enabled: !!ci && ci.length === 11,
    staleTime: 5 * 60 * 1000,
  });
}
