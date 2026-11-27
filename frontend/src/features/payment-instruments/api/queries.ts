import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import type { PaymentInstrument, InstrumentListParams } from './schemas';

interface PaginatedEnvelope<T> {
  data: T[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/payment-instruments — listado paginado con filtros
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentInstruments(params: InstrumentListParams = {}) {
  return useQuery({
    queryKey: ['payment-instruments', 'list', params],
    queryFn: async () => {
      const r = await http.get<PaginatedEnvelope<PaymentInstrument>>('/payment-instruments', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/payment-instruments/{id} — ficha completa con associated_payments
// ─────────────────────────────────────────────────────────────────────────────

export function usePaymentInstrument(id?: number | string) {
  return useQuery({
    queryKey: ['payment-instruments', 'detail', id],
    queryFn: async () => {
      const r = await http.get<{ data: PaymentInstrument }>(`/payment-instruments/${id}`);
      return r.data.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}
