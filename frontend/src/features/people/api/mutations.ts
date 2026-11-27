import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { components } from '@/types/api';
import type { PersonInput, DeathRegistrationInput } from '../schemas/person.schema';
import type { AxiosError } from 'axios';

type Person = components['schemas']['Person'];

interface ApiResponse<T> {
  data: T;
}

/** Crear persona (POST /people) */
export function useCreatePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();
  const { toastApiError } = useApiError();

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
      toastApiError(err, {
        title: t('create.error'),
        fallbackDetail: t('create.duplicate'),
        silent422: true,
      });
    },
  });
}

/** Actualizar persona (PATCH /people/{id}) — identity_number inmutable */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();
  const { toastApiError } = useApiError();

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
      toastApiError(err, {
        title: t('update.error'),
        fallbackDetail: t('update.conflict'),
        silent422: true,
      });
    },
  });
}

/** Desactivar persona (DELETE /people/{id}) */
export function useDeletePerson() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('people');
  const toast = useToast();
  const { toastApiError } = useApiError();

  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'list'] });
      toast.success(t('delete.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('delete.error'),
        fallbackDetail: t('delete.has_references'),
      });
    },
  });
}

/** Respuesta de error del endpoint FUC (todos los códigos llevan `message`) */
interface FucErrorResponse {
  message?: string;
}

/**
 * Consulta de ciudadano por carné de identidad (GET /fuc/people/{identityNumber}).
 *
 * Lectura con disparo manual (botón junto al campo CI del formulario de
 * persona): busca los datos públicos del ciudadano en la Ficha Única y
 * devuelve la persona FUC para autollenar el formulario. Los atributos null
 * son los que el nivel de consulta configurado no aporta — el autollenado
 * solo toca los campos que llegan con valor.
 *
 * Códigos de error contractuales: 404 (no existe en la FUC), 422 (CI
 * estructuralmente inválido o rechazo del proveedor), 502 (autenticación con
 * el proveedor fallida), 503 (integración desactivada), 504 (proveedor no
 * disponible). Todos viajan con `message` legible — se muestra como detalle
 * del toast con título localizado.
 */
export function useFucPersonLookup() {
  const { t } = useTranslation('people');
  const toast = useToast();

  return useMutation({
    mutationFn: async (identityNumber: string) => {
      const response = await http.get<ApiResponse<components['schemas']['FucPerson']>>(
        `/fuc/people/${identityNumber}`,
      );
      return response.data.data;
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<FucErrorResponse>;
      const status = axiosErr.response?.status;
      const detail = axiosErr.response?.data?.message;
      const fallback =
        status === 404 ? t('fuc.not_found') :
        status === 503 ? t('fuc.disabled') :
        status === 502 || status === 504 ? t('fuc.unavailable') :
        t('fuc.error');
      toast.errorDetail(t('fuc.error_title'), detail ?? fallback);
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
