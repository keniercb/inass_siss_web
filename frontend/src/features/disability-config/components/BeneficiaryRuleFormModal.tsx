import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateBeneficiaryRule, useUpdateBeneficiaryRule } from '../api/mutations';
import type { CreateBeneficiaryRuleInput, UpdateBeneficiaryRuleInput } from '../schemas/disability-config.schema';
import type { components } from '@/types/api';

type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

interface Props {
  rule?: BeneficiaryRule | null;
  onClose: () => void;
}

export function BeneficiaryRuleFormModal({ rule, onClose }: Props) {
  const { t } = useTranslation('disability-config');
  const { t: tc } = useTranslation('common');
  const isEdit = !!rule;
  const createMutation = useCreateBeneficiaryRule();
  const updateMutation = useUpdateBeneficiaryRule(rule?.id ?? 0);

  const [minQuantity, setMinQuantity] = useState(String(rule?.min_quantity ?? '1'));
  const [maxQuantity, setMaxQuantity] = useState(rule?.max_quantity != null ? String(rule.max_quantity) : '');
  const [percentToApply, setPercentToApply] = useState(rule?.percent_to_apply ?? '50');

  const canSubmit = minQuantity && percentToApply && !createMutation.isPending && !updateMutation.isPending;

  const handleSubmit = async () => {
    const min = Number(minQuantity);
    const max = maxQuantity === '' ? null : Number(maxQuantity);
    try {
      if (isEdit) {
        const input: UpdateBeneficiaryRuleInput = { min_quantity: min, max_quantity: max, percent_to_apply: percentToApply };
        await updateMutation.mutateAsync(input);
      } else {
        const input: CreateBeneficiaryRuleInput = { min_quantity: min, max_quantity: max, percent_to_apply: percentToApply };
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'beneficiary.edit' : 'beneficiary.add')} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('beneficiary.fields.min_quantity')} *</label>
            <Input type="number" min="0" placeholder="1" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('beneficiary.fields.max_quantity')}</label>
            <Input type="number" min="0" placeholder={t('beneficiary.fields.max_quantity_unbounded')} value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('beneficiary.fields.percent_to_apply')} *</label>
          <Input type="text" placeholder="50" value={percentToApply} onChange={(e) => setPercentToApply(e.target.value)} />
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
