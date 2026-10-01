import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateSignature } from '@/features/organizations/api/mutations';
import { PersonSearchWithCreate } from '@/features/people/components/PersonSearchWithCreate';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';

interface AuthorizedSignatureFormModalProps {
  entityId: number;
  onClose: () => void;
}

export function AuthorizedSignatureFormModal({ entityId, onClose }: AuthorizedSignatureFormModalProps) {
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const createMutation = useCreateSignature(entityId);

  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [positionId, setPositionId] = useState<number>(0);
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  const onSubmit = async () => {
    if (!selectedPerson || !positionId) return;
    try {
      await createMutation.mutateAsync({
        entity_id: entityId,
        person_id: selectedPerson,
        position_id: positionId,
        valid_from: validFrom || null,
        valid_to: validTo || null,
      });
      onClose();
    } catch { /* handled by mutation */ }
  };

  return (
    <Dialog open onClose={onClose} title={t('signatures.create.title')} description={t('signatures.create.description')} size="lg">
      <div className="space-y-4">
        {/* Person (búsqueda con opción de registrar nueva) + Position (búsqueda con crear nuevo) */}
        <div className="grid grid-cols-2 gap-3">
          <PersonSearchWithCreate
            label={t('signatures.form.person')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(p) => setSelectedPerson(p.id)}
          />
          <CatalogSearchSelect
            type="positions"
            label={t('signatures.form.position')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setPositionId(item.id)}
          />
        </div>
        {/* Validity */}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('signatures.form.valid_from')}</label><Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('signatures.form.valid_to')}</label><Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="button" disabled={!selectedPerson || !positionId || createMutation.isPending} onClick={onSubmit}>{createMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
