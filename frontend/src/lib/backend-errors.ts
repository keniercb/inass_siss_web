import type { AxiosError } from 'axios';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

interface BackendErrorData {
  errors?: Record<string, string[]>;
  message?: string;
}

interface ToastApi {
  errorDetail: (msg: string, detail: string) => void;
}

/**
 * Procesa un error del backend para formularios:
 *  - 422 (Validation error): mapea los errores a campos del formulario con
 *    `form.setError` (errores inline) Y muestra un toast.errorDetail con
 *    el resumen de validación (para que el usuario note que la operación falló
 *    aunque no vea los errores inline, p. ej. en campos no visibles).
 *  - Otros códigos (400/401/403/409/500…): el `mutation.onError` del hook
 *    React Query ya muestra un toast genérico; aquí no hacemos nada para
 *    no duplicar el mensaje.
 *
 * Uso típico en un onSubmit de formulario:
 *
 *   const toast = useToast();
 *   const onSubmit = form.handleSubmit(async (input) => {
 *     try {
 *       await mutation.mutateAsync(input);
 *       onClose();
 *     } catch (err) {
 *       handleFormError(err, form, toast, t('create.error'));
 *     }
 *   });
 *
 * NOTA: si el backend no manda `errors` (p. ej. errores sin campos), el toast
 * genérico ya se encarga en el `mutation.onError` del hook.
 */
export function handleFormError<TFieldValues extends FieldValues>(
  err: unknown,
  form: UseFormReturn<TFieldValues>,
  toast: ToastApi,
  fallbackMessage: string,
): void {
  const axiosErr = err as AxiosError<BackendErrorData>;
  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;

  // 422: errores de validación — mapear a campos del form + toast resumen
  if (status === 422 && data?.errors) {
    const fieldErrors = data.errors;
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      if (messages.length > 0) {
        form.setError(field as never, { message: messages[0] });
      }
    });
    // Toast con todos los mensajes de validación concatenados
    const allMessages = Object.values(fieldErrors).flat();
    if (allMessages.length > 0) {
      toast.errorDetail(fallbackMessage, allMessages.join(' · '));
    }
    return;
  }

  // 409 conflict (duplicado, transición inválida): el mutation.onError
  // del hook ya muestra un toast específico; aquí no duplicamos.
  // Otros errores no-422 (network/500/403): también los maneja el hook.
}

/**
 * Helper alternativo para formularios que NO usan mutation hooks de React
 * Query (p. ej. el formulario inline de LegalBasis). En ese caso el modal
 * debe mostrar el toast para todos los errores, no solo 422.
 */
export function handleFormErrorStandalone<TFieldValues extends FieldValues>(
  err: unknown,
  form: UseFormReturn<TFieldValues>,
  toast: ToastApi,
  fallbackMessage: string,
): void {
  const axiosErr = err as AxiosError<BackendErrorData>;
  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;

  if (status === 422 && data?.errors) {
    const fieldErrors = data.errors;
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      if (messages.length > 0) {
        form.setError(field as never, { message: messages[0] });
      }
    });
    const allMessages = Object.values(fieldErrors).flat();
    if (allMessages.length > 0) {
      toast.errorDetail(fallbackMessage, allMessages.join(' · '));
    }
    return;
  }

  // Otros errores: mostrar toast con el mensaje del backend si lo trae
  const detail = data?.message ?? axiosErr.message ?? 'Error del servidor';
  toast.errorDetail(fallbackMessage, detail);
}
