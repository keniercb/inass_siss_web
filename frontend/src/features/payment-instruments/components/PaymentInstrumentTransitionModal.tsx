import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useUpdateInstrumentStatus } from '../api/mutations';
import { TRANSITION_MATRIX, type InstrumentStatus, type InstrumentTransitionInput } from '../api/schemas';

/**
 * Modal de transición de estado del instrumento.
 *
 * Muestra solo los destinos que la matriz del operador admite para el estado
 * actual (UX). El backend revalida con 422 cualquier movimiento fuera de matriz.
 */
export function PaymentInstrumentTransitionModal({
  instrumentId,
  currentStatus,
  onClose,
}: {
  instrumentId: number | string;
  currentStatus: InstrumentStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation('payment-instruments');
  const { t: tc } = useTranslation('common');
  const mutation = useUpdateInstrumentStatus(instrumentId);
  const [target, setTarget] = useState<string>('');

  const allowed = TRANSITION_MATRIX[currentStatus] ?? [];
  const options = allowed.map((s) => ({ value: s, label: t(`list.status.${s}`) }));

  async function submit() {
    if (!target) return;
    try {
      // TRANSITION_MATRIX nunca incluye 'created' como destino, el cast es seguro.
      await mutation.mutateAsync({ status: target as InstrumentTransitionInput['status'] });
      onClose();
    } catch {
      // el toast lo maneja la mutación
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('transition.title')} size="sm">
      <div className="space-y-4">
        <div className="bg-muted/60 rounded-md px-4 py-2 text-sm">
          <span className="text-muted-foreground">{t('transition.current')}: </span>
          <span className="font-medium">{t(`list.status.${currentStatus}`)}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('transition.target')} *</label>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">{tc('status.empty')}</p>
          ) : (
            <SearchSelect
              value={target || undefined}
              onChange={(v) => setTarget(String(v ?? ''))}
              options={options}
              placeholder={tc('actions.select')}
              required
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!target || mutation.isPending} onClick={submit}>
            {mutation.isPending ? tc('status.loading') + '…' : t('transition.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
