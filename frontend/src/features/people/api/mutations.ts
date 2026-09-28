import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { PersonInput, DeathRegistrationInput } from '../schemas/person.schema';
import type { AxiosError } from 'axios';

type Person = components['schemas']['Person'];

interface ApiResponse<T> {
  data: T;
}

interface ConflictResponse {
  message?: string;
  person?: Person;
}

/** Crear persona (POST /people) */
export function useCreatePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();

  return useMutation({
    mutationFn: async (input: PersonInput) => {
      const response = await http.post<ApiResponse<Person>>('/people', input);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
      toast.success(t('create.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<ConflictResponse>;
      const status = axiosErr.response?.status;
      if (status === 422) return; // handled by form
      if (status === 409) {
        // Duplicado: el backend puede devolver la persona existente
        toast.error(t('create.duplicate'));
        return;
      }
      toast.error(t('create.error'));
    },
  });
}

/** Actualizar persona (PATCH /people/{id}) — identity_number inmutable */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: PersonInput }) => {
      const response = await http.patch<ApiResponse<Person>>(`/people/${id}`, input);
      return response.data.data;
    },
    onSuccess: (resource, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
      queryClient.setQueryData(['people', 'detail', id], resource);
      toast.success(t('update.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      if (status === 422) return; // handled by form
      if (status === 409) {
        toast.error(t('update.conflict'));
        return;
      }
      toast.error(t('update.error'));
    },
  });
}

/** Desactivar persona (DELETE /people/{id}) */
export function useDeletePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
      toast.success(t('delete.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      if (status === 409) {
        toast.error(t('delete.has_references'));
        return;
      }
      toast.error(t('delete.error'));
    },
  });
}

/** Registrar fallecimiento (POST /people/{id}/death) */
export function useRegisterDeath() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: DeathRegistrationInput }) => {
      const response = await http.post<ApiResponse<Person>>(`/people/${id}/death`, input);
      return response.data.data;
    },
    onSuccess: (resource, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
      queryClient.setQueryData(['people', 'detail', id], resource);
      toast.success(t('death.success'));
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      if (status === 422) return; // handled by form
      if (status === 409) {
        toast.error(t('death.already_deceased'));
        return;
      }
      toast.error(t('death.error'));
    },
  });
}
