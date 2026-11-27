import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { CreateSettingInput, GeneralSettingVersion } from '../schemas/general-settings.schema';

interface ApiResponse<T> {
  data: T;
}

/** Crear nueva vigencia (POST /general-settings) */
export function useCreateSetting() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('settings');
  const toast = useToast();
  const { toastApiError } = useApiError();

  return useMutation({
    mutationFn: async (input: CreateSettingInput) => {
      const response = await http.post<ApiResponse<GeneralSettingVersion>>(
        '/general-settings',
        input,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-settings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['general-settings', 'current'] });
      toast.success(t('create.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('create.error'),
        fallbackDetail: t('create.conflict'),
        silent422: true,
      });
    },
  });
}

/** Eliminar vigencia futura (DELETE /general-settings/{id})
 *  - 200 si la vigencia no está efectiva
 *  - 409 si la vigencia ya está en vigor (no se puede eliminar)
 */
export function useDeleteSetting() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('settings');
  const toast = useToast();
  const { toastApiError } = useApiError();

  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/general-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-settings', 'list'] });
      toast.success(t('delete.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, {
        title: t('delete.error'),
        fallbackDetail: t('delete.in_effect'),
      });
    },
  });
}
