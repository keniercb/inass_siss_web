import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import { useAuthStore, type AuthUser } from '@/store/auth-store';

interface AuthMeResponse { data: AuthUser; }

/**
 * PATCH /auth/language — cambiar el propio idioma de respuesta (Task 72/SGP-56, D-110).
 *
 * El idioma seleccionado pertenece a la cuenta, no al navegador: el middleware SetAppLocale
 * del backend compone TODA la envolvente de mensajes (éxitos, 422 campo a campo, aborts)
 * en ese idioma a partir de la siguiente solicitud. No exige permiso alguno.
 *
 * El backend acepta `language: 'es' | 'en'`. El frontend mapea sus tres locales así:
 *   es-CU / es-ES → 'es'
 *   en-US        → 'en'
 *
 * El mutation actualiza el user del auth store con la respuesta, invalidatea la cache
 * de /auth/me, y muestra toast de éxito/error. Es fire-and-forget desde el punto de
 * vista del LanguageSwitcher — no bloquea la UI.
 */
export function useChangeLanguage() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');
  const toast = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const { toastApiError } = useApiError();

  return useMutation({
    mutationFn: async (language: 'es' | 'en') => {
      const r = await http.patch<AuthMeResponse>('/auth/language', { language });
      return r.data.data;
    },
    onSuccess: (user) => {
      // Actualizar el store de auth con el user actualizado (con su nuevo language)
      setSession(user);
      // Refrescar la cache de /auth/me para que futuras llamadas vean el valor nuevo
      qc.setQueryData(['auth', 'me'], { data: user });
      toast.success(t('language.change_success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, { title: t('language.change_error'), silent422: true });
    },
  });
}
