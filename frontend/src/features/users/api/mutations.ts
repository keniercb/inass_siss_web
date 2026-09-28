import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { CreateUserInput, UpdateUserInput, ResetPasswordInput } from '../schemas/user.schema';
import type { AxiosError } from 'axios';

type User = components['schemas']['User'];
interface ApiResponse<T> { data: T; }

export function useCreateUser() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const r = await http.post<ApiResponse<User>>('/users', input);
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'list'] }); toast.success(t('create.success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422) return;
      if (ae.response?.status === 409) { toast.error(t('create.duplicate')); return; }
      toast.error(t('create.error'));
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: UpdateUserInput }) => {
      const r = await http.patch<ApiResponse<User>>(`/users/${id}`, input);
      return r.data.data;
    },
    onSuccess: (resource, { id }) => {
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
      qc.setQueryData(['users', 'detail', id], resource);
      toast.success(t('update.success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422) return;
      toast.error(t('update.error'));
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/users/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'list'] }); toast.success(t('delete.success')); },
    onError: () => { toast.error(t('delete.error')); },
  });
}

export function useRestoreUser() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.post(`/users/${id}/restore`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'list'] }); toast.success(t('restore.success')); },
    onError: () => { toast.error(t('restore.error')); },
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.post(`/users/${id}/unlock`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'list'] }); toast.success(t('unlock.success')); },
    onError: () => { toast.error(t('unlock.error')); },
  });
}

export function useResetPassword() {
  const { t } = useTranslation('users');
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: ResetPasswordInput }) => {
      await http.patch(`/users/${id}/password`, input);
    },
    onSuccess: () => { toast.success(t('reset_password.success')); },
    onError: () => { toast.error(t('reset_password.error')); },
  });
}
