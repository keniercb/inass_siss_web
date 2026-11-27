import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useCreatePaymentInstrument } from '../api/mutations';
import { INSTRUMENT_TYPES } from '../api/schemas';
import { http } from '@/lib/http';

interface PensionerOption { id: number; full_name: string; status?: string; }
interface PersonOption { id: number; full_name: string; }

/**
 * Modal de creación de instrumento de pago.
 *
 * El backend exige pensionado ACTIVO (422 en caso contrario) y una persona
 * beneficiaria viva. El frontend no replica la validación de negocio: solo
 * asegura que los 3 campos estén elegidos antes de habilitar el botón.
 */
export function PaymentInstrumentFormModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('payment-instruments');
  const { t: tc } = useTranslation('common');
  const mutation = useCreatePaymentInstrument();

  const [pensionerId, setPensionerId] = useState<number>(0);
  const [beneficiaryPersonId, setBeneficiaryPersonId] = useState<number>(0);
  const [type, setType] = useState<string>('provisional_payment');

  const typeOptions = INSTRUMENT_TYPES.map((tp) => ({ value: tp, label: t(`list.type.${tp}`) }));

  async function submit() {
    try {
      await mutation.mutateAsync({
        pensioner_id: pensionerId,
        beneficiary_person_id: beneficiaryPersonId,
        type: type as 'provisional_payment' | 'electronic_check',
      });
      onClose();
    } catch {
      // el toast lo maneja la mutación
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('create.title')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('create.pensioner')} *</label>
          <SearchSelect
            value={pensionerId || undefined}
            onChange={(v) => setPensionerId(Number(v) || 0)}
            loadOptions={async (q) => {
              const r = await http.get<{ data: PensionerOption[] }>('/pensioners', {
                params: { per_page: 100, status: 'active', ...(q && { search: q }) },
              });
              return (r.data.data ?? []).map((p) => ({
                value: p.id,
                label: p.full_name,
                secondary: `#${p.id}`,
              }));
            }}
            placeholder={tc('actions.select')}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{t('create.pensioner_hint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('create.beneficiary')} *</label>
          <SearchSelect
            value={beneficiaryPersonId || undefined}
            onChange={(v) => setBeneficiaryPersonId(Number(v) || 0)}
            loadOptions={async (q) => {
              const r = await http.get<{ data: PersonOption[] }>('/people', {
                params: { per_page: 100, ...(q && { search: q }) },
              });
              return (r.data.data ?? []).map((p) => ({
                value: p.id,
                label: p.full_name,
                secondary: `#${p.id}`,
              }));
            }}
            placeholder={tc('actions.select')}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">{t('create.beneficiary_hint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('create.type')} *</label>
          <SearchSelect
            value={type}
            onChange={(v) => setType(String(v ?? 'provisional_payment'))}
            options={typeOptions}
            placeholder={tc('actions.select')}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button
            disabled={!pensionerId || !beneficiaryPersonId || !type || mutation.isPending}
            onClick={submit}
          >
            {mutation.isPending ? tc('status.loading') + '…' : t('create.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
