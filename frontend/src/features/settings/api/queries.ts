import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { GeneralSettingVersion } from '../schemas/general-settings.schema';

// Envelope estándar del backend: { data: T, meta?: ... }
interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

/** Listado paginado de versiones históricas */
export function useGeneralSettings(params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['general-settings', 'list', params],
    queryFn: async () => {
      const response = await http.get<PaginatedResponse<GeneralSettingVersion>>(
        '/general-settings',
        { params },
      );
      return response.data;
    },
    staleTime: 60_000, // 1 min — la config cambia poco
  });
}

/** Configuración vigente actual (resuelta por el backend) */
export function useCurrentSettings(atDate?: string) {
  return useQuery({
    queryKey: ['general-settings', 'current', atDate ?? null],
    queryFn: async () => {
      const url = atDate ? `/general-settings/current?at=${atDate}` : '/general-settings/current';
      const response = await http.get<ApiResponse<GeneralSettingVersion>>(url);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — la vigente no cambia
  });
}

/** Detalle de una versión específica */
export function useSettingDetail(id?: number | string) {
  return useQuery({
    queryKey: ['general-settings', 'detail', id],
    queryFn: async () => {
      const response = await http.get<ApiResponse<GeneralSettingVersion>>(
        `/general-settings/${id}`,
      );
      return response.data.data;
    },
    enabled: !!id,
  });
}
