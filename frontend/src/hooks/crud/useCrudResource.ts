import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { usePermiso } from '@/hooks/use-permiso';
import { uuidv4 } from '@/lib/utils';
import type { CrudConfig, ListResponse } from '@/types/crud';
import type { PaginationMeta } from '@/types/domain';

interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [filter: string]: unknown;
}

/**
 * Hook principal del patrón CRUD genérico (sección 6.9 del diseño).
 *
 * Encapsula TanStack Query (queries y mutations), invalidación de cache,
 * manejo de errores HTTP estándar (401, 403, 409, 422, 429), toasts i18n,
 * hooks de ciclo de vida y cabeceras especiales (If-Match, Idempotency-Key).
 *
 * Comportamiento automático:
 *  - Toasts top-right en onSuccess/onError (consumidores no gestionan toasts)
 *  - Listados auto-refrescados vía invalidateQueries tras cada mutación
 *  - Detalle actualizado optimistamente con setQueryData en update
 *  - 422 silencioso (errores van al formulario vía form.setError)
 *  - 409 con toast i18n específico (delete.has_references, update.conflict)
 *  - 429 con backoff exponencial (1s, 2s, 4s, máx 3 reintentos)
 *  - Idempotency-Key automático en create si config.idempotencyKey=true
 */
export function useCrudResource<TResource, TCreateInput, TUpdateInput>(
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation(config.resourceKey);
  const { success, error: errorToast } = useToast();
  const can = usePermiso();

  /** Resuelve un endpoint reemplazando placeholders del context */
  const resolveEndpoint = (path: string): string => {
    let resolved = path;
    for (const [k, v] of Object.entries(config.context ?? {})) {
      resolved = resolved.replace(k, String(v));
    }
    return resolved;
  };

  /** Hook de listado con paginación, búsqueda y filtros */
  const useList = (params: ListParams) =>
    useQuery({
      queryKey: [config.resource, 'list', params, config.context],
      queryFn: async () => {
        const response = await http.get<ListResponse<TResource>>(
          resolveEndpoint(config.endpoints.list),
          { params },
        );
        const envelope = response.data;
        if (config.hooks?.transformResponse) {
          envelope.data = envelope.data.map(config.hooks.transformResponse);
        }
        return envelope;
      },
      placeholderData: keepPreviousData,
      staleTime: 30_000,
      retry: (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          return false;
        }
        return failureCount < 3;
      },
    });

  /** Hook de detalle */
  const useDetail = (id?: number | string) =>
    useQuery({
      queryKey: [config.resource, 'detail', id, config.context],
      queryFn: async () => {
        const response = await http.get<{ data: TResource }>(
          resolveEndpoint(config.endpoints.detail(id!)),
        );
        return response.data.data;
      },
      enabled: !!id,
    });

  /** Mutación de creación con Idempotency-Key opcional */
  const useCreate = () =>
    useMutation({
      mutationFn: async (input: TCreateInput) => {
        const finalInput = config.hooks?.beforeCreate
          ? await config.hooks.beforeCreate(input)
          : input;
        const headers: Record<string, string> = {};
        if (config.idempotencyKey) {
          headers['Idempotency-Key'] = uuidv4();
        }
        const response = await http.post<{ data: TResource }>(
          resolveEndpoint(config.endpoints.create),
          finalInput,
          { headers },
        );
        const resource = response.data.data;
        config.hooks?.afterCreate?.(resource);
        return resource;
      },
      onSuccess: (resource) => {
        if (config.invalidateOn?.create) {
          config.invalidateOn.create(queryClient, resource);
        } else {
          queryClient.invalidateQueries({ queryKey: [config.resource, 'list'] });
        }
        success(t('create.success'));
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 422) return; // handled by form
        if (status === 429) {
          errorToast(t('errors.rate_limited'));
          return;
        }
        errorToast(t('create.error'));
      },
    });

  /** Mutación de actualización con optimistic locking opcional */
  const useUpdate = () =>
    useMutation({
      mutationFn: async ({ id, input }: { id: number | string; input: TUpdateInput }) => {
        const current = queryClient.getQueryData<TResource>([
          config.resource,
          'detail',
          id,
          config.context,
        ]);
        const finalInput =
          config.hooks?.beforeUpdate && current
            ? await config.hooks.beforeUpdate(input, current)
            : input;
        const headers: Record<string, string> = {};
        if (config.optimisticLocking && current) {
          const updatedAt = (current as { updated_at?: string }).updated_at;
          if (updatedAt) {
            headers['If-Match'] = updatedAt;
          }
        }
        const response = await http.patch<{ data: TResource }>(
          resolveEndpoint(config.endpoints.update(id)),
          finalInput,
          { headers },
        );
        const resource = response.data.data;
        config.hooks?.afterUpdate?.(resource);
        return resource;
      },
      onSuccess: (resource, { id }) => {
        if (config.invalidateOn?.update) {
          config.invalidateOn.update(queryClient, resource, id);
        } else {
          queryClient.invalidateQueries({ queryKey: [config.resource, 'list'] });
          queryClient.setQueryData(
            [config.resource, 'detail', id, config.context],
            resource,
          );
        }
        success(t('update.success'));
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 422) return; // handled by form
        if (status === 409) {
          errorToast(t('update.conflict'));
          return;
        }
        errorToast(t('update.error'));
      },
    });

  /** Mutación de desactivación lógica (soft delete) */
  const useDelete = () =>
    useMutation({
      mutationFn: async (resource: TResource) => {
        const id = (resource as { id: number | string }).id;
        const shouldProceed = config.hooks?.beforeDelete
          ? await config.hooks.beforeDelete(resource)
          : true;
        if (!shouldProceed) return;
        await http.delete(resolveEndpoint(config.endpoints.delete(id)));
        config.hooks?.afterDelete?.(id);
      },
      onSuccess: (_void, resource) => {
        const id = (resource as { id: number | string }).id;
        if (config.invalidateOn?.delete) {
          config.invalidateOn.delete(queryClient, id);
        } else {
          queryClient.invalidateQueries({ queryKey: [config.resource, 'list'] });
          queryClient.removeQueries({
            queryKey: [config.resource, 'detail', id, config.context],
          });
        }
        success(t('delete.success'));
      },
      onError: (err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 422) return;
        if (status === 409) {
          errorToast(t('delete.has_references'));
          return;
        }
        errorToast(t('delete.error'));
      },
    });

  /** Helpers de permiso para el recurso */
  const canView = can(config.permisos.view);
  const canCreate = can(config.permisos.create);
  const canEdit = can(config.permisos.edit);
  const canDelete = can(config.permisos.delete);

  return {
    useList,
    useDetail,
    useCreate,
    useUpdate,
    useDelete,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}

/** Tipo del return del hook (para tipar consumidores) */
export type CrudResource<TResource, TCreateInput, TUpdateInput> = ReturnType<
  typeof useCrudResource<TResource, TCreateInput, TUpdateInput>
>;

/** Helper de tipo para PaginationMeta (exportado para los componentes) */
export type { PaginationMeta, QueryClient };
