import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileText, Clock, Calculator, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePensionCase } from '../api/queries';
import { useAddSalaryRecord, useRemoveSalaryRecord, useAddServiceRecord, useRemoveServiceRecord, useAddWorkCycle, useRemoveWorkCycle } from '../api/mutations';
import { CASE_STATUS_META, type SalaryRecordInput, type ServiceRecordInput, type WorkCycleInput } from '../schemas/pension-case.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, formatCUP, cn } from '@/lib/utils';

type Tab = 'summary' | 'subrecords' | 'history' | 'calculation';

export function PensionCaseDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [subModal, setSubModal] = useState<'salary' | 'service' | 'cycle' | null>(null);

  const { data: pensionCase, isLoading, isError } = usePensionCase(id);
  const canEdit = can('cases.edit');

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !pensionCase) return <div className="max-w-7xl mx-auto text-center py-12"><h1 className="text-xl font-semibold mb-2">{t('detail.not_found')}</h1><button onClick={() => navigate('/expedientes')} className="text-primary hover:underline">{t('detail.back_to_list')}</button></div>;

  const statusMeta = CASE_STATUS_META[pensionCase.status ?? 'submitted'] ?? { label: pensionCase.status ?? '—', badgeClass: '' };
  const applicantName = pensionCase.applicant ? `${pensionCase.applicant.first_surname ?? ''} ${pensionCase.applicant.first_name ?? ''}`.trim() : '—';

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/expedientes')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-mono">{pensionCase.number}</h1>
          <p className="text-sm text-muted-foreground mt-1">{applicantName} · <span className={`badge ${statusMeta.badgeClass}`}>{t(`list.status.${pensionCase.status}`)}</span></p>
        </div>
      </div>
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <TabBtn active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}><ClipboardList className="w-4 h-4" />{t('detail.tabs.summary')}</TabBtn>
          <TabBtn active={activeTab === 'subrecords'} onClick={() => setActiveTab('subrecords')}><FileText className="w-4 h-4" />{t('detail.tabs.subrecords')}</TabBtn>
          <TabBtn active={activeTab === 'history'} onClick={() => setActiveTab('history')}><Clock className="w-4 h-4" />{t('detail.tabs.history')}</TabBtn>
          <TabBtn active={activeTab === 'calculation'} onClick={() => setActiveTab('calculation')}><Calculator className="w-4 h-4" />{t('detail.tabs.calculation')}</TabBtn>
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.number')} value={pensionCase.number ?? '—'} mono />
          <Field label={t('detail.fields.status')} value={t(`list.status.${pensionCase.status}`)} />
          <Field label={t('detail.fields.requested_at')} value={pensionCase.requested_at ? formatDate(pensionCase.requested_at) : '—'} />
          <Field label={t('detail.fields.applicant')} value={applicantName} />
          <Field label={t('detail.fields.last_salary')} value={pensionCase.last_salary != null ? formatCUP(Number(pensionCase.last_salary)) : '—'} />
          {pensionCase.computed_amount != null && <Field label={t('detail.fields.computed_amount')} value={formatCUP(Number(pensionCase.computed_amount))} />}
          {pensionCase.decision_notes && <Field label={t('detail.fields.decision_notes')} value={pensionCase.decision_notes} fullWidth />}
          {pensionCase.decided_at && <Field label={t('detail.fields.decided_at')} value={formatDate(pensionCase.decided_at)} />}
        </div>
      )}

      {activeTab === 'subrecords' && (
        <div className="space-y-6">
          {/* Salarios */}
          <SubrecordSection title={t('salary.title')} onAdd={canEdit ? () => setSubModal('salary') : undefined} addLabel={t('salary.add')}>
            {(pensionCase.salary_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('salary.columns.year')}</th><th className="text-left px-3 py-2">{t('salary.columns.earned_salary')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.salary_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.year}</td><td className="px-3 py-2">{formatCUP(Number(r.earned_salary ?? 0))}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => useRemoveSalaryRecord(id).mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Servicios */}
          <SubrecordSection title={t('service.title')} onAdd={canEdit ? () => setSubModal('service') : undefined} addLabel={t('service.add')}>
            {(pensionCase.service_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('service.columns.start_date')}</th><th className="text-left px-3 py-2">{t('service.columns.end_date')}</th><th className="text-left px-3 py-2">{t('service.columns.is_appendix')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.service_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.start_date ? formatDate(r.start_date) : '—'}</td><td className="px-3 py-2">{r.end_date ? formatDate(r.end_date) : '—'}</td><td className="px-3 py-2">{r.is_appendix ? '✓' : '—'}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => useRemoveServiceRecord(id).mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Ciclos */}
          <SubrecordSection title={t('cycle.title')} onAdd={canEdit ? () => setSubModal('cycle') : undefined} addLabel={t('cycle.add')}>
            {(pensionCase.work_cycles ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('cycle.columns.planned_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.actual_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.cycles_count')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.work_cycles ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.planned_days}</td><td className="px-3 py-2">{r.actual_days}</td><td className="px-3 py-2">{r.cycles_count}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => useRemoveWorkCycle(id).mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
        </div>
      )}

      {activeTab === 'history' && <EmptyTab icon={Clock} title={t('detail.tabs_empty.history')} desc={t('detail.tabs_empty.history_description')} />}
      {activeTab === 'calculation' && <EmptyTab icon={Calculator} title={t('detail.tabs_empty.calculation')} desc={t('detail.tabs_empty.calculation_description')} />}

      {/* Modales de subregistros */}
      {subModal === 'salary' && <SalaryRecordModal caseId={id} onClose={() => setSubModal(null)} />}
      {subModal === 'service' && <ServiceRecordModal caseId={id} onClose={() => setSubModal(null)} />}
      {subModal === 'cycle' && <WorkCycleModal caseId={id} onClose={() => setSubModal(null)} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{children}</button>;
}

function Field({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return <div className={fullWidth ? 'col-span-2' : ''}><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p><p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value}</p></div>;
}

function SubrecordSection({ title, onAdd, addLabel, children }: { title: string; onAdd?: () => void; addLabel: string; children: React.ReactNode }) {
  return <div><div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-foreground">{title}</h3>{onAdd && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="w-3.5 h-3.5" />{addLabel}</Button>}</div>{children}</div>;
}

function EmptyTab({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return <div className="flex flex-col items-center justify-center min-h-[30vh] text-center"><div className="p-4 rounded-full bg-muted mb-4"><Icon className="w-10 h-10 text-muted-foreground" /></div><h2 className="text-lg font-medium mb-1">{title}</h2><p className="text-sm text-muted-foreground max-w-md">{desc}</p></div>;
}

// Modales de subregistros
function SalaryRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddSalaryRecord(caseId);
  const [year, setYear] = useState(''); const [salary, setSalary] = useState('');
  return <Dialog open onClose={onClose} title={t('salary.add')} size="sm"><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">{t('salary.form.year')} *</label><Input type="number" min="1950" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('salary.form.earned_salary')} *</label><Input type="number" step="0.01" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} /></div><div className="flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!year || !salary || mutation.isPending} onClick={async () => { await mutation.mutateAsync({ year: Number(year), earned_salary: Number(salary) } as SalaryRecordInput); onClose(); }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div></div></Dialog>;
}

function ServiceRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddServiceRecord(caseId);
  const [entityId, setEntityId] = useState('0'); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [isAppendix, setIsAppendix] = useState(false);
  return <Dialog open onClose={onClose} title={t('service.add')} size="sm"><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">ID entidad *</label><Input type="number" min="1" value={entityId} onChange={(e) => setEntityId(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('service.form.start_date')} *</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('service.form.end_date')}</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div><label className="flex items-center gap-2"><input type="checkbox" checked={isAppendix} onChange={(e) => setIsAppendix(e.target.checked)} className="w-4 h-4" /><span className="text-sm">{t('service.form.is_appendix')}</span></label><div className="flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!entityId || !startDate || mutation.isPending} onClick={async () => { await mutation.mutateAsync({ entity_id: Number(entityId), start_date: startDate, end_date: endDate || null, is_appendix: isAppendix } as ServiceRecordInput); onClose(); }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div></div></Dialog>;
}

function WorkCycleModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddWorkCycle(caseId);
  const [planned, setPlanned] = useState(''); const [actual, setActual] = useState(''); const [count, setCount] = useState('');
  return <Dialog open onClose={onClose} title={t('cycle.add')} size="sm"><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">{t('cycle.form.planned_days')} *</label><Input type="number" min="0" value={planned} onChange={(e) => setPlanned(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('cycle.form.actual_days')} *</label><Input type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('cycle.form.cycles_count')} *</label><Input type="number" min="0" value={count} onChange={(e) => setCount(e.target.value)} /></div><div className="flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!planned || !actual || !count || mutation.isPending} onClick={async () => { await mutation.mutateAsync({ planned_days: Number(planned), actual_days: Number(actual), cycles_count: Number(count) } as WorkCycleInput); onClose(); }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div></div></Dialog>;
}
