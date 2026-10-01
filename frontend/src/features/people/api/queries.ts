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
  /** Texto de búsqueda — el frontend lo recibe como `search` del usuario;
   *  aquí se traduce a `identity` (CI exacto, 11 dígitos) o `q` (texto libre)
   *  para que coincida con el contrato del backend (docs.json GET /people). */
  search?: string;
  deceased?: 'all' | 'alive' | 'deceased';
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Listado de personas con búsqueda (por CI exacto o por nombre).
 * El backend expone GET /people?identity=X (CI exacto, 11 dígitos) o
 * GET /people?q=X (texto libre en nombre/apellidos). Aquí traducimos el
 * campo `search` (recibido del URL o del input del usuario) al parámetro
 * correcto antes de llamar al backend.
 */
export function usePeople(params: PeopleListParams = {}) {
  return useQuery({
    queryKey: ['people', 'list', params],
    queryFn: async () => {
      // Transformar deceased: 'all' → omitir, 'alive' → false, 'deceased' → true
      const { search, deceased, ...rest } = params;
      const queryParams: Record<string, unknown> = { ...rest };
      if (!deceased || deceased === 'all') {
        // omitir
      } else if (deceased === 'alive') {
        queryParams.deceased = false;
      } else if (deceased === 'deceased') {
        queryParams.deceased = true;
      }
      // Traducir search → identity (si 11 dígitos) o q (texto libre)
      if (search && search.trim().length > 0) {
        const trimmed = search.trim();
        if (/^\d{11}$/.test(trimmed)) {
          queryParams.identity = trimmed;
        } else {
          queryParams.q = trimmed;
        }
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

/** Búsqueda por CI exacto (retorna la persona si la encuentra, null si no).
 *  Usa el parámetro `identity` del backend (docs.json GET /people?identity=X). */
export function usePersonByCI(ci?: string) {
  return useQuery({
    queryKey: ['people', 'by-ci', ci],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<Person>>('/people', {
        params: { identity: ci, per_page: 1 },
      });
      return response.data.data[0] ?? null;
    },
    enabled: !!ci && ci.length === 11,
    staleTime: 5 * 60 * 1000,
  });
}
