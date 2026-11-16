import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { http } from '@/lib/http';
import { useCreateDisabilityRule, useUpdateDisabilityRule, useCreateBracket, useDeleteBracket } from '../api/mutations';
import { DISABILITY_ORIGINS, type DisabilityOrigin } from '../schemas/disability-config.schema';
import type { components } from '@/types/api';

type DisabilityRule = components['schemas']['DisabilityRule'];

interface BracketRow {
  id?: number;
  min_years: number;
  max_years: number | null;
  annual_increment_percent: number;
}

interface Props {
  rule?: DisabilityRule | null;
  onClose: () => void;
}

export function DisabilityRuleFormModal({ rule, onClose }: Props) {
  const { t } = useTranslation('disability-config');
  const { t: tc } = useTranslation('common');
  const isEdit = !!rule;
  const createRuleMutation = useCreateDisabilityRule();
  const updateRuleMutation = useUpdateDisabilityRule(rule?.id ?? 0);
  const createBracketMutation = useCreateBracket();
  const deleteBracketMutation = useDeleteBracket();

  const [origin, setOrigin] = useState<DisabilityOrigin>(rule?.origin as DisabilityOrigin ?? 'comun');
  // El backend devuelve base_percent e increment_percent como STRING (decimal precision).
  // El input del form es number — convertimos al cargar y al guardar.
  const [basePercent, setBasePercent] = useState<string>(rule ? String(rule.base_percent) : '50');
  const [incrementPercent, setIncrementPercent] = useState<string>(rule ? String(rule.increment_percent) : '0');
  const [brackets, setBrackets] = useState<BracketRow[]>(
    (rule?.brackets ?? []).map(b => ({
      id: b.id,
      min_years: b.min_years,
      max_years: b.max_years,
      annual_increment_percent: b.annual_increment_percent,
    }))
  );

  const addBracket = () => setBrackets([...brackets, { min_years: 0, max_years: null, annual_increment_percent: 0 }]);
  const removeBracket = async (idx: number) => {
    const bracket = brackets[idx];
    // Si el bracket ya existe en el backend (tiene id), lo eliminamos via DELETE
    if (bracket?.id) {
      try { await deleteBracketMutation.mutateAsync(bracket.id); } catch { /* toast handled */ }
    }
    setBrackets(brackets.filter((_, i) => i !== idx));
  };
  const updateBracket = (idx: number, field: keyof BracketRow, value: string | number | null) => {
    setBrackets(brackets.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const isPending = createRuleMutation.isPending || updateRuleMutation.isPending || createBracketMutation.isPending || deleteBracketMutation.isPending;
  const canSubmit = !!origin && !!basePercent && !isPending;

  const handleSubmit = async () => {
    const bp = Number(basePercent);
    const ip = Number(incrementPercent) || 0;
    try {
      if (isEdit && rule) {
        // 1. PATCH la regla (sin brackets — el backend no los acepta anidados)
        await updateRuleMutation.mutateAsync({ base_percent: bp, increment_percent: ip });
        // 2. Gestionar brackets via endpoints separados.
        //    Para brackets existentes (tienen id): PATCH directo via http.
        //    Para brackets nuevos (sin id): POST via createBracketMutation.
        for (const b of brackets) {
          if (b.id) {
            await http.patch(`/disability-increment-brackets/${b.id}`, {
              min_years: b.min_years,
              max_years: b.max_years,
              annual_increment_percent: b.annual_increment_percent,
            });
          } else {
            await createBracketMutation.mutateAsync({
              disability_rule_id: rule.id!,
              min_years: b.min_years,
              max_years: b.max_years,
              annual_increment_percent: b.annual_increment_percent,
            });
          }
        }
      } else {
        // 1. POST la regla (sin brackets)
        const created = await createRuleMutation.mutateAsync({ origin, base_percent: bp, increment_percent: ip });
        // 2. POST cada bracket con el disability_rule_id de la regla recién creada
        for (const b of brackets) {
          await createBracketMutation.mutateAsync({
            disability_rule_id: created.id!,
            min_years: b.min_years,
            max_years: b.max_years,
            annual_increment_percent: b.annual_increment_percent,
          });
        }
      }
      onClose();
    } catch { /* toast handled by mutation.onError */ }
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
            <Input type="number" step="0.01" min="0" max="100" placeholder="50" value={basePercent} onChange={(e) => setBasePercent(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('rule.fields.increment_percent')}</label>
            <Input type="number" step="0.01" min="0" max="100" placeholder="0" value={incrementPercent} onChange={(e) => setIncrementPercent(e.target.value)} />
          </div>
        </div>

        {/* Brackets — se gestionan via /disability-increment-brackets */}
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
            {isPending ? tc('status.loading') + '…' : tc('actions.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
