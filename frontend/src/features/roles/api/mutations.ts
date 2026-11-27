import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { components } from '@/types/api';
import type { RoleInput } from '../schemas/role.schema';

type Role = components['schemas']['Role'];
interface ApiResponse<T> { data: T; }

export function useCreateRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: RoleInput) => {
      const r = await http.post<ApiResponse<Role>>('/roles', input);
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles', 'list'] }); toast.success(t('create.success')); },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('create.error'),
        fallbackDetail: t('create.duplicate'),
        silent422: true,
      });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: RoleInput }) => {
      const r = await http.patch<ApiResponse<Role>>(`/roles/${id}`, input);
      return r.data.data;
    },
    onSuccess: (resource, { id }) => {
      qc.invalidateQueries({ queryKey: ['roles', 'list'] });
      qc.setQueryData(['roles', 'detail', id], resource);
      toast.success(t('update.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('update.error'),
        silent422: true,
      });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/roles/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles', 'list'] }); toast.success(t('delete.success')); },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('delete.error'),
        fallbackDetail: t('delete.has_users'),
      });
    },
  });
}
