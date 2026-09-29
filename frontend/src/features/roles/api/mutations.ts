import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { RoleInput } from '../schemas/role.schema';
import type { AxiosError } from 'axios';

type Role = components['schemas']['Role'];
interface ApiResponse<T> { data: T; }

export function useCreateRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: RoleInput) => {
      const r = await http.post<ApiResponse<Role>>('/roles', input);
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles', 'list'] }); toast.success(t('create.success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422) return;
      if (ae.response?.status === 409) { toast.error(t('create.duplicate')); return; }
      toast.error(t('create.error'));
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
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
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422) return;
      toast.error(t('update.error'));
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  const { t } = useTranslation('roles');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/roles/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles', 'list'] }); toast.success(t('delete.success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError;
      if (ae.response?.status === 409) { toast.error(t('delete.has_users')); return; }
      toast.error(t('delete.error'));
    },
  });
}
