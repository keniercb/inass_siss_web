import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { Button } from '@/components/ui/Button';
import { useDisabilityRules, useSpecialModifications, useBeneficiaryRules } from '../api/queries';
import { useDeleteDisabilityRule, useDeleteSpecialModification, useDeleteBeneficiaryRule } from '../api/mutations';
import { DisabilityRuleFormModal } from '../components/DisabilityRuleFormModal';
import { SpecialModificationFormModal } from '../components/SpecialModificationFormModal';
import { BeneficiaryRuleFormModal } from '../components/BeneficiaryRuleFormModal';
import type { components } from '@/types/api';

type DisabilityRule = components['schemas']['DisabilityRule'];
type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

type ModalState =
  | { type: 'rule'; rule?: DisabilityRule | null }
  | { type: 'special'; modification?: SpecialDisabilityModification | null }
  | { type: 'beneficiary'; rule?: BeneficiaryRule | null }
  | null;

export function DisabilityConfigPage() {
  const { t } = useTranslation('disability-config');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const canManage = can('settings.manage');

  const [modal, setModal] = useState<ModalState>(null);

  const { data: rulesData, isLoading: rulesLoading } = useDisabilityRules({ per_page: 100 });
  const { data: specialData, isLoading: specialLoading } = useSpecialModifications({ per_page: 100 });
  const { data: beneficiaryData, isLoading: beneficiaryLoading } = useBeneficiaryRules({ per_page: 100 });

  const deleteRuleMutation = useDeleteDisabilityRule();
  const deleteSpecialMutation = useDeleteSpecialModification();
  const deleteBeneficiaryMutation = useDeleteBeneficiaryRule();

  const rules = rulesData?.data ?? [];
  const specials = specialData?.data ?? [];
  const beneficiaries = beneficiaryData?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('page.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('page.description')}</p>
      </div>

      {/* Sección 1: Reglas de invalidez por origen */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t('section.rules')}</h2>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setModal({ type: 'rule', rule: null })}>
              <Plus className="w-3.5 h-3.5" />{t('rule.add')}
            </Button>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('rule.fields.origin')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('rule.fields.base_percent')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('rule.fields.increment_percent')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('rule.fields.brackets')}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rulesLoading ? (
                <tr><td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={canManage ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground">{t('empty')}</td></tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3"><span className="badge badge-info">{t(`rule.origin.${rule.origin}`)}</span></td>
                    <td className="px-4 py-3 text-right font-mono">{rule.base_percent}%</td>
                    <td className="px-4 py-3 text-right font-mono">{rule.increment_percent}%</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(rule.brackets ?? []).length > 0
                        ? (rule.brackets ?? []).map(b => `${b.min_years}-${b.max_years ?? '+'}: ${b.annual_increment_percent}%`).join(' · ')
                        : '—'}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ type: 'rule', rule })} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteRuleMutation.mutate(rule.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección 2: Modificaciones especiales */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t('section.special')}</h2>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setModal({ type: 'special', modification: null })}>
              <Plus className="w-3.5 h-3.5" />{t('special.add')}
            </Button>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('special.fields.code')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('special.fields.description')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('special.fields.percent_to_apply')}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {specialLoading ? (
                <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
              ) : specials.length === 0 ? (
                <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">{t('empty')}</td></tr>
              ) : (
                specials.map((mod) => (
                  <tr key={mod.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono">{mod.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{mod.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-mono">{mod.percent_to_apply}%</td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ type: 'special', modification: mod })} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteSpecialMutation.mutate(mod.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección 3: Reglas de beneficiario */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t('section.beneficiary')}</h2>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setModal({ type: 'beneficiary', rule: null })}>
              <Plus className="w-3.5 h-3.5" />{t('beneficiary.add')}
            </Button>
          )}
        </div>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-right px-4 py-3 font-medium">{t('beneficiary.fields.min_quantity')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('beneficiary.fields.max_quantity')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('beneficiary.fields.percent_to_apply')}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {beneficiaryLoading ? (
                <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
              ) : beneficiaries.length === 0 ? (
                <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">{t('empty')}</td></tr>
              ) : (
                beneficiaries.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-right font-mono">{rule.min_quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">{rule.max_quantity ?? t('beneficiary.fields.max_quantity_unbounded')}</td>
                    <td className="px-4 py-3 text-right font-mono">{rule.percent_to_apply}%</td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setModal({ type: 'beneficiary', rule })} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteBeneficiaryMutation.mutate(rule.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modales */}
      {modal?.type === 'rule' && <DisabilityRuleFormModal rule={modal.rule} onClose={() => setModal(null)} />}
      {modal?.type === 'special' && <SpecialModificationFormModal modification={modal.modification} onClose={() => setModal(null)} />}
      {modal?.type === 'beneficiary' && <BeneficiaryRuleFormModal rule={modal.rule} onClose={() => setModal(null)} />}
    </div>
  );
}
