import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type {
  CreateInstrumentInput,
  AssociatePaymentInput,
  InstrumentTransitionInput,
  PaymentInstrument,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment-instruments — crear instrumento (201, nace created)
// 422: pensionado inexistente o no activo, beneficiaria inexistente,
//      o sin configuración general activa (para el Pago provisional).
// ─────────────────────────────────────────────────────────────────────────────

export function useCreatePaymentInstrument() {
  const qc = useQueryClient();
  const { t } = useTranslation('payment-instruments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: CreateInstrumentInput) => {
      const r = await http.post<{ data: PaymentInstrument }>('/payment-instruments', input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-instruments'] });
      toast.success(t('create.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, { title: t('create.error'), silent422: true });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment-instruments/{id}/payments — asociar pago del ledger
// Solo en estado created. 409 (estado incompatible con el par), 428
// (precondición no cumplida), 422 (fuera de created, pago ajeno, pensionado
// inactivo, par ya vinculado).
// ─────────────────────────────────────────────────────────────────────────────

export function useAssociateInstrumentPayment(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('payment-instruments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: AssociatePaymentInput) => {
      const r = await http.post<{ data: PaymentInstrument }>(`/payment-instruments/${id}/payments`, input);
      return r.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['payment-instruments', 'detail', id], data);
      qc.invalidateQueries({ queryKey: ['payment-instruments', 'list'] });
      toast.success(t('associate.success'));
    },
    onError: (err: unknown) => {
      const ae = err as { response?: { status?: number; data?: { message?: string } } };
      if (ae.response?.status === 409) {
        toast.errorDetail(t('associate.error'), t('transition.error_409'));
        return;
      }
      if (ae.response?.status === 428) {
        toast.errorDetail(t('associate.error'), t('transition.error_428'));
        return;
      }
      toastApiError(err, { title: t('associate.error'), silent422: true });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payment-instruments/{id}/status — transición de estado
// Matriz backend: created→pending|cancelled; pending→paid|expired.
// 422 fuera de matriz (terminal o mismo estado); 409 y 428 también posibles.
// ─────────────────────────────────────────────────────────────────────────────

export function useUpdateInstrumentStatus(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('payment-instruments');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: InstrumentTransitionInput) => {
      const r = await http.post<{ data: PaymentInstrument }>(`/payment-instruments/${id}/status`, input);
      return r.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['payment-instruments', 'detail', id], data);
      qc.invalidateQueries({ queryKey: ['payment-instruments', 'list'] });
      toast.success(t('transition.success'));
    },
    onError: (err: unknown) => {
      const ae = err as { response?: { status?: number; data?: { message?: string } } };
      if (ae.response?.status === 409) {
        toast.errorDetail(t('transition.error'), t('transition.error_409'));
        return;
      }
      if (ae.response?.status === 428) {
        toast.errorDetail(t('transition.error'), t('transition.error_428'));
        return;
      }
      toastApiError(err, { title: t('transition.error'), silent422: true });
    },
  });
}
