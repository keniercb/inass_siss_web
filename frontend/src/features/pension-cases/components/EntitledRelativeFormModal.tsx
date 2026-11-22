import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { PersonSearchWithCreate } from '@/features/people/components/PersonSearchWithCreate';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import { useAddEntitledRelative } from '../api/mutations';
import { http } from '@/lib/http';

interface EntitledRelativeFormModalProps {
  caseId: string;
  onClose: () => void;
}

export function EntitledRelativeFormModal({ caseId, onClose }: EntitledRelativeFormModalProps) {
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const mutation = useAddEntitledRelative(caseId);

  const [beneficiaryPersonId, setBeneficiaryPersonId] = useState<number | null>(null);
  const [beneficiaryTypeId, setBeneficiaryTypeId] = useState<number>(0);
  const [agencyTypeId, setAgencyTypeId] = useState<number>(0);
  const [agencyId, setAgencyId] = useState<number>(0);
  const [bankAccount, setBankAccount] = useState<string>('');
  const [tutorPersonId, setTutorPersonId] = useState<number | null>(null);

  const { data: collectionAgenciesData } = useQuery({
    queryKey: ['agencies', 'entitled', { agency_type_id: agencyTypeId }],
    queryFn: async () => { if (!agencyTypeId) return { data: [] }; const r = await http.get<{ data: { id: number; name: string }[] }>('/agencies', { params: { per_page: 100, agency_type_id: agencyTypeId } }); return r.data; },
    enabled: !!agencyTypeId,
    staleTime: 60_000,
  });

  const canSubmit = !!beneficiaryPersonId && !!beneficiaryTypeId && !!agencyTypeId && !!agencyId && !mutation.isPending;

  const handleSubmit = async () => {
    if (!beneficiaryPersonId || !beneficiaryTypeId || !agencyTypeId || !agencyId) return;
    try {
      await mutation.mutateAsync({
        beneficiary_person_id: beneficiaryPersonId,
        beneficiary_type_id: beneficiaryTypeId,
        agency_type_id: agencyTypeId,
        agency_id: agencyId,
        bank_account: bankAccount || null,
        tutor_person_id: tutorPersonId,
      });
      onClose();
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open onClose={onClose} title={t('entitled_relative.add')} size="lg">
      <div className="space-y-4">
        <PersonSearchWithCreate
          label={t('entitled_relative.beneficiary_person_id')}
          placeholder={t('entitled_relative.search_person')}
          required
          onSelect={(p) => setBeneficiaryPersonId(p.id)}
        />
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="beneficiary-types"
            label={t('entitled_relative.beneficiary_type_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setBeneficiaryTypeId(item.id)}
          />
          <CatalogSearchSelect
            type="agency-types"
            label={t('entitled_relative.agency_type_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => { setAgencyTypeId(item.id); setAgencyId(0); }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('entitled_relative.agency_id')} *</label>
            <SearchSelect
              value={agencyId || undefined}
              onChange={(v) => setAgencyId(Number(v) || 0)}
              options={(collectionAgenciesData?.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
              placeholder={tc('actions.select')}
              disabled={!agencyTypeId}
              required
              error={!agencyId}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('entitled_relative.bank_account')}</label>
            <Input type="text" maxLength={34} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('entitled_relative.tutor_person_id')}</label>
          <p className="text-xs text-muted-foreground mb-2">{t('entitled_relative.tutor_help')}</p>
          <PersonSearchWithCreate
            label={t('entitled_relative.tutor_person_id')}
            placeholder={tc('actions.search') + '…'}
            onSelect={(p) => setTutorPersonId(p.id)}
          />
          {tutorPersonId != null && (
            <button type="button" onClick={() => setTutorPersonId(null)} className="text-xs text-destructive mt-1">{tc('actions.clear')}</button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {mutation.isPending ? tc('status.loading') + '…' : tc('actions.save_and_continue')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
