import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { CreateSettingInput, GeneralSettingVersion } from '../schemas/general-settings.schema';

interface ApiResponse<T> {
  data: T;
}

interface ConflictResponse {
  message?: string;
}

/** Crear nueva vigencia (POST /general-settings) */
export function useCreateSetting() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('settings');
  const toast = useToast();

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
      const status = (err as { response?: { status?: number; data?: ConflictResponse } })?.response?.status;
      if (status === 422) return; // handled by form
      if (status === 409) {
        toast.error(t('create.conflict'));
        return;
      }
      toast.error(t('create.error'));
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

  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/general-settings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-settings', 'list'] });
      toast.success(t('delete.success'));
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(t('delete.in_effect'));
        return;
      }
      toast.error(t('delete.error'));
    },
  });
}
