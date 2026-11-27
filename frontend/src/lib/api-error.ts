import type { AxiosError } from 'axios';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from 'react-i18next';

/**
 * Helper unificado para mostrar toasts de error de API.
 *
 * Patrón: cada vez que el backend responde con `message` en el body, ese mensaje
 * se muestra como detalle del toast. La variante del toast se elige según el
 * código HTTP:
 *
 *   - 409 Conflict       → warning  (conflicto de estado de negocio, recuperable)
 *   - 422 Unprocessable  → error    (validación; `errors` se aplana con `message`)
 *   - 403 Forbidden      → error    (permiso denegado)
 *   - 404 Not Found      → error    (recurso inexistente)
 *   - 5xx Server         → error    (fallo del servidor)
 *   - 0 / network        → error    (sin conectividad / timeout)
 *
 * Uso típico:
 *   const { toastApiError } = useApiError();
 *   onError: (err) => toastApiError(err, { title: t('create.error') });
 *
 * Si el backend NO envió `message`, se usa `fallbackDetail` si se proveyó, o
 * un título localizado según el código (`t('errors.conflict')` para 409, etc.).
 *
 * 422 silencioso: si `silent422=true`, NO se muestra toast (el formulario lo
 * maneja vía `form.setError`). Devuelve `{ handled: false }` para que el caller
 * pueda hacer cleanup adicional.
 *
 * Blob errors: cuando se hace `http.get(..., { responseType: 'blob' })` y el
 * servidor responde 4xx/5xx con body JSON, axios entrega el body como Blob.
 * El helper detecta esto y parsea el Blob a JSON asíncrono antes de mostrar
 * el toast. En ese caso devuelve una Promise para que el caller pueda esperar.
 */

export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]> | Record<string, string>;
  /** Campos opcionales específicos de algunos endpoints (transiciones, etc.) */
  [key: string]: unknown;
}

interface ToastApiErrorOptions {
  /** Título localizado del toast (ej. t('create.error')). Requerido. */
  title: string;
  /** Detalle fallback localizado cuando el body no trae `message`. */
  fallbackDetail?: string;
  /** Si true, 422 no dispara toast (lo maneja el formulario). Default false. */
  silent422?: boolean;
  /** Si true, fuerza variant `error` incluso para 409. Default false. */
  forceErrorVariant?: boolean;
}

interface ToastApiErrorResult {
  /** Status HTTP si llegó response; undefined si fue network/timeout. */
  status?: number;
  /** Body parseado si llegó response JSON. */
  body?: ApiErrorBody;
  /** True si se disparó un toast; false si se silenció (422 silencioso). */
  handled: boolean;
}

/**
 * Hook que devuelve `toastApiError` configurado con i18n + toast.
 * Las claves `errors.*` se leen del namespace `common`.
 */
export function useApiError() {
  const toast = useToast();
  const { t } = useTranslation('common');

  function dispatch(status: number | undefined, body: ApiErrorBody | undefined, opts: ToastApiErrorOptions): ToastApiErrorResult {
    // Network error / timeout / sin response
    if (!status) {
      toast.errorDetail(opts.title, opts.fallbackDetail ?? t('errors.network'));
      return { handled: true };
    }

    // 422 silencioso — el formulario maneja los errores
    if (status === 422 && opts.silent422) {
      return { status, body, handled: false };
    }

    // Decidir variant por status
    const variant: 'warning' | 'error' =
      opts.forceErrorVariant || status !== 409 ? 'error' : 'warning';

    // Construir detalle: message + errors (aplanados) para 422,
    // o solo message para el resto.
    const detailParts: string[] = [];
    if (body?.message) detailParts.push(body.message);
    if (body?.errors) {
      const errs = body.errors;
      const flat: string[] = [];
      for (const v of Object.values(errs)) {
        if (Array.isArray(v)) flat.push(...v);
        else if (typeof v === 'string') flat.push(v);
      }
      if (flat.length > 0) detailParts.push(...flat);
    }

    // Si no hay detalle del body, usar fallbackDetail o un título por defecto
    // según el status.
    let detail: string;
    if (detailParts.length > 0) {
      detail = detailParts.join(' · ');
    } else if (opts.fallbackDetail) {
      detail = opts.fallbackDetail;
    } else {
      detail = defaultDetailForStatus(status, t);
    }

    if (variant === 'warning') {
      // warning: icono amarillo, misma estructura de título+detalle
      toast.warning(`${opts.title} — ${detail}`);
    } else {
      toast.errorDetail(opts.title, detail);
    }

    return { status, body, handled: true };
  }

  /**
   * Síncrono. Para respuestas Blob (descargas), parsea async fire-and-forget
   * y dispara el toast cuando termina. El caller recibe `{ handled: true }`
   * inmediatamente si hay status, así puede decidir cleanup sin esperar.
   */
  function toastApiError(err: unknown, opts: ToastApiErrorOptions): ToastApiErrorResult {
    const ae = err as AxiosError<ApiErrorBody> & { response?: { data?: ApiErrorBody | Blob } };
    const status = ae.response?.status;
    const rawData = ae.response?.data;

    // Caso Blob: responseType: 'blob' deja el body como Blob incluso en errores.
    // Disparar parse async y devolver {handled:true,status} sincrónicamente.
    if (rawData instanceof Blob) {
      void (async () => {
        try {
          const text = await rawData.text();
          try {
            const parsed = JSON.parse(text) as ApiErrorBody;
            dispatch(status, parsed, opts);
          } catch {
            // El body no es JSON (p. ej. HTML). Usar el texto como detalle.
            dispatch(status, { message: text.slice(0, 200) || undefined }, opts);
          }
        } catch {
          dispatch(status, undefined, opts);
        }
      })();
      return { status, handled: true };
    }

    return dispatch(status, rawData as ApiErrorBody | undefined, opts);
  }

  return { toastApiError };
}

/** Títulos por defecto según status, leídos del namespace common. */
function defaultDetailForStatus(status: number, t: (k: string) => string): string {
  switch (status) {
    case 409: return t('errors.conflict');
    case 403: return t('errors.forbidden');
    case 404: return t('errors.not_found');
    case 422: return t('errors.validation');
    case 500:
    case 502:
    case 503:
    case 504: return t('errors.server');
    default:
      if (status >= 500) return t('errors.server');
      if (status >= 400) return t('errors.client');
      return t('errors.unknown');
  }
}
