import { QueryClient } from '@tanstack/react-query';

// QueryClient singleton con configuración por defecto
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 segundos
      gcTime: 5 * 60 * 1000, // 5 minutos
      retry: (failureCount, error: unknown) => {
        // Reintentar solo errores 5xx y 429 (rate limit)
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Query key factory helper
export const queryKeys = {
  list: (resource: string, params?: Record<string, unknown>) =>
    [resource, 'list', params] as const,
  detail: (resource: string, id: number | string) =>
    [resource, 'detail', id] as const,
  lists: (resource: string) => [resource, 'list'] as const,
};
