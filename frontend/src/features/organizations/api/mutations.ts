import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { Entity, Office, AuthorizedSignature } from '@/types/domain';
import type { EntityInput, OfficeInput, AuthorizedSignatureInput } from '../schemas/organization.schema';

interface ApiResponse<T> { data: T; }

export function useCreateEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
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
      toastApiError(err, {
        title: t('entities.create.error'),
        fallbackDetail: t('entities.create.duplicate'),
        silent422: true,
      });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
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
      toastApiError(err, {
        title: t('entities.update.error'),
        fallbackDetail: t('entities.update.conflict'),
        silent422: true,
      });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/entities/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'list'] });
      toast.success(t('entities.delete.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('entities.delete.error'),
        fallbackDetail: t('entities.delete.has_references'),
      });
    },
  });
}

export function useCreateOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
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
      toastApiError(err, {
        title: t('offices.create.error'),
        silent422: true,
      });
    },
  });
}

export function useUpdateOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
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
      toastApiError(err, {
        title: t('offices.update.error'),
        fallbackDetail: t('offices.update.conflict'),
        silent422: true,
      });
    },
  });
}

export function useDeleteOffice() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => { await http.delete(`/offices/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offices', 'list'] });
      toast.success(t('offices.delete.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('offices.delete.error'),
        fallbackDetail: t('offices.delete.has_references'),
      });
    },
  });
}

export function useCreateSignature(entityId: number | string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: AuthorizedSignatureInput) => {
      // POST /authorized-signatures (top-level, docs.json): entity_id va en el body
      const response = await http.post<ApiResponse<AuthorizedSignature>>('/authorized-signatures', { ...input, entity_id: entityId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'signatures', String(entityId)] });
      queryClient.invalidateQueries({ queryKey: ['authorized-signatures', 'by-entity', String(entityId)] });
      toast.success(t('signatures.create.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('signatures.create.error'),
        silent422: true,
      });
    },
  });
}

export function useDeleteSignature(entityId: number | string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('organizations');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (signatureId: number | string) => {
      // DELETE /authorized-signatures/{id} (top-level, docs.json)
      await http.delete(`/authorized-signatures/${signatureId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', 'signatures', String(entityId)] });
      queryClient.invalidateQueries({ queryKey: ['authorized-signatures', 'by-entity', String(entityId)] });
      toast.success(t('signatures.delete.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('signatures.delete.error'),
      });
    },
  });
}
