import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useCreatePaymentInstrument } from '../api/mutations';
import { INSTRUMENT_TYPES } from '../api/schemas';
import { http } from '@/lib/http';
import { personFullName } from '@/lib/utils';

// Formas reales de la API: GET /pensioners anida la persona completa (sin
// full_name a nivel de fila) y GET /people devuelve la persona suelta con sus
// 4 componentes de nombre. El label se compone con personFullName.
interface PensionerRow {
  id: number;
  status?: string;
  person?: {
    first_name?: string | null;
    middle_name?: string | null;
    first_surname?: string | null;
    second_surname?: string | null;
  } | null;
}
interface PersonRow {
  id: number;
  identity_number?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  first_surname?: string | null;
  second_surname?: string | null;
}

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
              // GET /pensioners no soporta búsqueda por texto (solo status y
              // catálogos): se trae el activo lote y se filtra por display aquí,
              // que es una preocupación de UI, no de negocio.
              const r = await http.get<{ data: PensionerRow[] }>('/pensioners', {
                params: { per_page: 100, status: 'active' },
              });
              const needle = q.trim().toLowerCase();
              return (r.data.data ?? [])
                .map((p) => ({
                  value: p.id,
                  label: personFullName(p.person) || `#${p.id}`,
                  secondary: `#${p.id}`,
                }))
                .filter((o) =>
                  !needle ||
                  o.label.toLowerCase().includes(needle) ||
                  o.secondary.toLowerCase().includes(needle)
                );
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
              // GET /people busca por q (fragmentos de nombre/apellido) y por
              // identity (prefijo de CI); deceased=false porque la persona
              // beneficiaria debe estar viva (el backend lo rechaza con 422).
              const r = await http.get<{ data: PersonRow[] }>('/people', {
                params: {
                  per_page: 100,
                  deceased: false,
                  ...(q.trim() && { q: q.trim() }),
                },
              });
              return (r.data.data ?? []).map((p) => ({
                value: p.id,
                label: personFullName(p) || `#${p.id}`,
                secondary: p.identity_number ?? `#${p.id}`,
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
