import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { Entity, Office, AuthorizedSignature } from '@/types/domain';
import type { EntityInput, OfficeInput, AuthorizedSignatureInput } from '../schemas/organization.schema';
import type { AxiosError } from 'axios';

interface ApiResponse<T> { data: T; }

export function useCreateEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: EntityInput) => {
      const response = await http.post<ApiResponse<Entity>>('/entities', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'list'] });
      toast.success(t('entities.create.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) return;
      if (axiosErr.response?.status === 409) {
        toast.error(t('entities.create.duplicate'));
        return;
      }
      toast.error(t('entities.create.error'));
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: EntityInput }) => {
      const response = await http.patch<ApiResponse<Entity>>(`/entities/${id}`, input);
      return response.data.data;
    },
    onSuccess: (resource, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'list'] });
      queryClient.setQueryData(['entities', 'detail', id], resource);
      toast.success(t('entities.update.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) return;
      if (axiosErr.response?.status === 409) {
        toast.error(t('entities.update.conflict'));
        return;
      }
      toast.error(t('entities.update.error'));
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/entities/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'list'] });
      toast.success(t('entities.delete.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 409) {
        toast.error(t('entities.delete.has_references'));
        return;
      }
      toast.error(t('entities.delete.error'));
    },
  });
}

export function useCreateOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: OfficeInput) => {
      const response = await http.post<ApiResponse<Office>>('/offices', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices', 'list'] });
      toast.success(t('offices.create.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) return;
      toast.error(t('offices.create.error'));
    },
  });
}

export function useUpdateOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: OfficeInput }) => {
      const response = await http.patch<ApiResponse<Office>>(`/offices/${id}`, input);
      return response.data.data;
    },
    onSuccess: (resource, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['offices', 'list'] });
      queryClient.setQueryData(['offices', 'detail', id], resource);
      toast.success(t('offices.update.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) return;
      if (axiosErr.response?.status === 409) {
        toast.error(t('offices.update.conflict'));
        return;
      }
      toast.error(t('offices.update.error'));
    },
  });
}

export function useDeleteOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/offices/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices', 'list'] });
      toast.success(t('offices.delete.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 409) {
        toast.error(t('offices.delete.has_references'));
        return;
      }
      toast.error(t('offices.delete.error'));
    },
  });
}

export function useCreateSignature(entityId: number | string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: AuthorizedSignatureInput) => {
      const response = await http.post<AuthorizedSignature>(`/entities/${entityId}/signatures`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'signatures', entityId] });
      toast.success(t('signatures.create.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) return;
      toast.error(t('signatures.create.error'));
    },
  });
}

export function useDeleteSignature(entityId: number | string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  return useMutation({
    mutationFn: async (signatureId: number | string) => {
      await http.delete(`/entities/${entityId}/signatures/${signatureId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'signatures', entityId] });
      toast.success(t('signatures.delete.success'));
    },
    onError: () => {
      toast.error(t('signatures.delete.error'));
    },
  });
}
