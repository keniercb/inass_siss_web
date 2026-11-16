import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateSpecialModification, useUpdateSpecialModification } from '../api/mutations';
import type { CreateSpecialModificationInput, UpdateSpecialModificationInput } from '../schemas/disability-config.schema';
import type { components } from '@/types/api';

type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];

interface Props {
  modification?: SpecialDisabilityModification | null;
  onClose: () => void;
}

export function SpecialModificationFormModal({ modification, onClose }: Props) {
  const { t } = useTranslation('disability-config');
  const { t: tc } = useTranslation('common');
  const isEdit = !!modification;
  const createMutation = useCreateSpecialModification();
  const updateMutation = useUpdateSpecialModification(modification?.id ?? 0);

  const [code, setCode] = useState(modification?.code ?? '');
  const [description, setDescription] = useState(modification?.description ?? '');
  const [percentToApply, setPercentToApply] = useState(modification?.percent_to_apply ?? '20');

  const canSubmit = code && percentToApply && !createMutation.isPending && !updateMutation.isPending;

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        const input: UpdateSpecialModificationInput = { description: description || null, percent_to_apply: percentToApply };
        await updateMutation.mutateAsync(input);
      } else {
        const input: CreateSpecialModificationInput = { code, description: description || null, percent_to_apply: percentToApply };
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'special.edit' : 'special.add')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('special.fields.code')} *</label>
          <Input type="text" maxLength={20} placeholder="CUIDADO" value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('special.fields.description')}</label>
          <Input type="text" maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('special.fields.percent_to_apply')} *</label>
          <Input type="text" placeholder="20" value={percentToApply} onChange={(e) => setPercentToApply(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {(createMutation.isPending || updateMutation.isPending) ? tc('status.loading') + '…' : tc('actions.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
