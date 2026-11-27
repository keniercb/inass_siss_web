import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useAssociateInstrumentPayment } from '../api/mutations';
import { http } from '@/lib/http';

interface LedgerPaymentOption {
  id: number;
  period?: string;
  amount?: string;
  status?: string;
}

/**
 * Modal para asociar un pago del ledger al instrumento.
 * Disponible solo en estado `created` (el botón se oculta fuera de ese estado).
 *
 * Compatibilidad de estado del ledger con el tipo del instrumento la valida
 * el backend (422/428); el frontend lista los pagos y no filtra por negocio.
 */
export function AssociatePaymentModal({
  instrumentId,
  onClose,
}: {
  instrumentId: number | string;
  onClose: () => void;
}) {
  const { t } = useTranslation('payment-instruments');
  const { t: tc } = useTranslation('common');
  const mutation = useAssociateInstrumentPayment(instrumentId);
  const [paymentId, setPaymentId] = useState<number>(0);

  async function submit() {
    try {
      await mutation.mutateAsync({ payment_id: paymentId });
      onClose();
    } catch {
      // el toast lo maneja la mutación
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('associate.title')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('associate.payment')} *</label>
          <SearchSelect
            value={paymentId || undefined}
            onChange={(v) => setPaymentId(Number(v) || 0)}
            loadOptions={async (q) => {
              const r = await http.get<{ data: LedgerPaymentOption[] }>('/payments', {
                params: { per_page: 100, ...(q && { search: q }) },
              });
              return (r.data.data ?? []).map((p) => ({
                value: p.id,
                label: `${p.period ?? ''} · ${p.amount ?? ''}`,
                secondary: `${p.status ?? ''} · #${p.id}`,
              }));
            }}
            placeholder={tc('actions.select')}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{t('associate.payment_hint')}</p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!paymentId || mutation.isPending} onClick={submit}>
            {mutation.isPending ? tc('status.loading') + '…' : t('associate.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
