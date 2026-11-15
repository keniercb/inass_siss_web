import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useCreateDisabilityRule, useUpdateDisabilityRule } from '../api/mutations';
import { DISABILITY_ORIGINS, type DisabilityOrigin, type DisabilityIncrementBracketInput, type CreateDisabilityRuleInput, type UpdateDisabilityRuleInput } from '../schemas/disability-config.schema';
import type { components } from '@/types/api';

type DisabilityRule = components['schemas']['DisabilityRule'];

interface Props {
  rule?: DisabilityRule | null;
  onClose: () => void;
}

export function DisabilityRuleFormModal({ rule, onClose }: Props) {
  const { t } = useTranslation('disability-config');
  const { t: tc } = useTranslation('common');
  const isEdit = !!rule;
  const createMutation = useCreateDisabilityRule();
  const updateMutation = useUpdateDisabilityRule(rule?.id ?? 0);

  const [origin, setOrigin] = useState<DisabilityOrigin>(rule?.origin as DisabilityOrigin ?? 'comun');
  const [basePercent, setBasePercent] = useState(rule?.base_percent ?? '50');
  const [incrementPercent, setIncrementPercent] = useState(rule?.increment_percent ?? '1');
  const [brackets, setBrackets] = useState<DisabilityIncrementBracketInput[]>(
    (rule?.brackets ?? []).map(b => ({ id: b.id, min_years: b.min_years, max_years: b.max_years, annual_increment_percent: b.annual_increment_percent }))
  );

  const addBracket = () => setBrackets([...brackets, { min_years: 0, max_years: null, annual_increment_percent: 0 }]);
  const removeBracket = (idx: number) => setBrackets(brackets.filter((_, i) => i !== idx));
  const updateBracket = (idx: number, field: keyof DisabilityIncrementBracketInput, value: string | number | null) => {
    setBrackets(brackets.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const canSubmit = origin && basePercent && incrementPercent && !createMutation.isPending && !updateMutation.isPending;

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        const input: UpdateDisabilityRuleInput = { base_percent: basePercent, increment_percent: incrementPercent, brackets };
        await updateMutation.mutateAsync(input);
      } else {
        const input: CreateDisabilityRuleInput = { origin, base_percent: basePercent, increment_percent: incrementPercent, brackets };
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'rule.edit' : 'rule.add')} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('rule.fields.origin')} *</label>
            <SearchSelect
              value={origin}
              onChange={(v) => setOrigin(v as DisabilityOrigin)}
              options={DISABILITY_ORIGINS.map(o => ({ value: o, label: t(`rule.origin.${o}`) }))}
              placeholder={tc('actions.select')}
              required
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('rule.fields.base_percent')} *</label>
            <Input type="text" placeholder="50" value={basePercent} onChange={(e) => setBasePercent(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('rule.fields.increment_percent')} *</label>
            <Input type="text" placeholder="1" value={incrementPercent} onChange={(e) => setIncrementPercent(e.target.value)} />
          </div>
        </div>

        {/* Brackets anidados */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">{t('rule.brackets.title')}</h3>
            <Button size="sm" variant="outline" onClick={addBracket}><Plus className="w-3.5 h-3.5" />{t('rule.brackets.add')}</Button>
          </div>
          {brackets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">—</p>
          ) : (
            <div className="space-y-2">
              {brackets.map((b, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2 rounded-md border border-border">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t('rule.brackets.min_years')}</label>
                    <Input type="number" min="0" value={b.min_years} onChange={(e) => updateBracket(idx, 'min_years', Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t('rule.brackets.max_years')}</label>
                    <Input type="number" min="0" placeholder={t('rule.brackets.max_years_unbounded')} value={b.max_years ?? ''} onChange={(e) => updateBracket(idx, 'max_years', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{t('rule.brackets.annual_increment_percent')}</label>
                    <Input type="number" step="0.01" min="0" max="100" value={b.annual_increment_percent} onChange={(e) => updateBracket(idx, 'annual_increment_percent', Number(e.target.value))} />
                  </div>
                  <button type="button" onClick={() => removeBracket(idx)} className="p-2 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
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
