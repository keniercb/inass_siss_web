import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileText, Clock, Calculator, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePensionCase } from '../api/queries';
import { useAddSalaryRecord, useRemoveSalaryRecord, useAddServiceRecord, useRemoveServiceRecord, useAddWorkCycle, useRemoveWorkCycle, useAddIncomeConceptRecord, useRemoveIncomeConceptRecord } from '../api/mutations';
import { CASE_STATUS_META, type SalaryRecordInput, type ServiceRecordInput, type WorkCycleInput, type IncomeConceptRecordInput } from '../schemas/pension-case.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, formatCUP, cn } from '@/lib/utils';
import { http } from '@/lib/http';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];
interface EntityItem { id: number; code: string; name?: string; tax_id_number: string; }
interface EntityListResponse { data: EntityItem[]; }
interface CatalogItem { id: number; name: string; }
interface CatalogListResponse { data: CatalogItem[]; }
interface OfficeItem { id: number; address: string; type?: { name: string }; province?: { name: string }; municipality?: { name: string }; }

type Tab = 'summary' | 'subrecords' | 'history' | 'calculation';
type SubModalKind = 'salary' | 'service' | 'cycle' | 'income' | null;

export function PensionCaseDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [subModal, setSubModal] = useState<SubModalKind>(null);

  const { data: pensionCase, isLoading, isError } = usePensionCase(id);
  // Cargar catálogo de conceptos de ingreso para etiquetar las filas
  const { data: incomeConceptsData } = useQuery({
    queryKey: ['catalogs', 'income-concepts', 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/income-concepts', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const incomeConceptMap = new Map<number, string>((incomeConceptsData?.data ?? []).map((c) => [c.id, c.name]));
  const incomeConceptLabel = (id?: number | null) => (id != null ? (incomeConceptMap.get(id) ?? `#${id}`) : '—');
  const canEdit = can('cases.edit');

  // Mutaciones de eliminación de subregistros (al nivel del componente, no en onClick)
  const removeSalaryMutation = useRemoveSalaryRecord(id);
  const removeServiceMutation = useRemoveServiceRecord(id);
  const removeWorkCycleMutation = useRemoveWorkCycle(id);
  const removeIncomeConceptMutation = useRemoveIncomeConceptRecord(id);

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
        <SummaryTab pensionCase={pensionCase} t={t} tc={tc} />
      )}

      {activeTab === 'subrecords' && (
        <div className="space-y-6">
          {/* Salarios */}
          <SubrecordSection title={t('salary.title')} onAdd={canEdit ? () => setSubModal('salary') : undefined} addLabel={t('salary.add')}>
            {(pensionCase.salary_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('salary.columns.year')}</th><th className="text-left px-3 py-2">{t('salary.columns.earned_salary')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.salary_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.year}</td><td className="px-3 py-2">{formatCUP(Number(r.earned_salary ?? 0))}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => removeSalaryMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Servicios */}
          <SubrecordSection title={t('service.title')} onAdd={canEdit ? () => setSubModal('service') : undefined} addLabel={t('service.add')}>
            {(pensionCase.service_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('service.columns.entity')}</th><th className="text-left px-3 py-2">{t('service.columns.start_date')}</th><th className="text-left px-3 py-2">{t('service.columns.end_date')}</th><th className="text-left px-3 py-2">{t('service.columns.is_appendix')}</th><th className="text-left px-3 py-2">{t('service.columns.declaration_form')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.service_records ?? []).map((r) => {
                  const entityLabel = r.entity ? (r.entity.name ?? `${r.entity.code ?? ''} ${r.entity.tax_id_number ?? ''}`.trim()) : (r.entity_id ? `#${r.entity_id}` : '—');
                  return (<tr key={r.id}><td className="px-3 py-2 text-xs">{entityLabel}</td><td className="px-3 py-2">{r.start_date ? formatDate(r.start_date) : '—'}</td><td className="px-3 py-2">{r.end_date ? formatDate(r.end_date) : '—'}</td><td className="px-3 py-2">{r.is_appendix ? '✓' : '—'}</td><td className="px-3 py-2 text-xs">{r.declaration_form ?? '—'}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => removeServiceMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>);
                })}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Ciclos */}
          <SubrecordSection title={t('cycle.title')} onAdd={canEdit ? () => setSubModal('cycle') : undefined} addLabel={t('cycle.add')}>
            {(pensionCase.work_cycles ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('cycle.columns.planned_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.actual_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.cycles_count')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.work_cycles ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.planned_days}</td><td className="px-3 py-2">{r.actual_days}</td><td className="px-3 py-2">{r.cycles_count}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => removeWorkCycleMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Conceptos de ingreso */}
          <SubrecordSection title={t('income_concept.title')} onAdd={canEdit ? () => setSubModal('income') : undefined} addLabel={t('income_concept.add')}>
            {(pensionCase.income_concept_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('income_concept.columns.income_concept')}</th><th className="text-left px-3 py-2">{t('income_concept.columns.amount')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.income_concept_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{incomeConceptLabel(r.income_concept_id)}</td><td className="px-3 py-2">{formatCUP(Number(r.amount ?? 0))}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => removeIncomeConceptMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
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
      {subModal === 'income' && <IncomeConceptRecordModal caseId={id} onClose={() => setSubModal(null)} />}
    </div>
  );
}

function SummaryTab({ pensionCase, t, tc }: { pensionCase: import('@/types/api').components['schemas']['PensionCase']; t: (key: string) => string; tc: (key: string) => string }) {
  // Cargar datos completos del proponente
  const { data: person } = useQuery({
    queryKey: ['people', 'detail', pensionCase.applicant_person_id],
    queryFn: async () => {
      const r = await http.get<{ data: Person }>(`/people/${pensionCase.applicant_person_id}`);
      return r.data.data;
    },
    enabled: !!pensionCase.applicant_person_id,
    staleTime: 60_000,
  });

  // Cargar catálogos y entidades para resolver IDs a nombres legibles
  const useCatalog = (type: string) => useQuery({
    queryKey: ['catalogs', type, 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>(`/catalogs/${type}`, { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: pensionTypesData } = useCatalog('pension-types');
  const { data: pensionRegimesData } = useCatalog('pension-regimes');
  const { data: positionsData } = useCatalog('positions');
  const { data: occCatsData } = useCatalog('occupational-categories');
  const { data: eduLevelsData } = useCatalog('educational-levels');
  const { data: sciCatsData } = useCatalog('scientific-categories');
  const { data: entitiesData } = useQuery({
    queryKey: ['entities', 'all'],
    queryFn: async () => { const r = await http.get<EntityListResponse>('/entities', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: officesData } = useQuery({
    queryKey: ['offices', 'all'],
    queryFn: async () => { const r = await http.get<{ data: OfficeItem[] }>('/offices', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: legalBasesData } = useQuery({
    queryKey: ['legal-bases', 'all'],
    queryFn: async () => { const r = await http.get<{ data: { id: number; title: string }[] }>('/legal-bases', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  const lookup = (data: { data?: CatalogItem[] | EntityItem[] | OfficeItem[] | { id: number; title: string }[] } | undefined, id?: number | null, fallback?: (item: never) => string): string => {
    if (!id || !data?.data) return '—';
    const item = (data.data as never[]).find((x) => (x as { id: number }).id === id);
    if (!item) return `#${id}`;
    if (fallback) return fallback(item);
    return (item as { name?: string; title?: string }).name ?? (item as { title?: string }).title ?? `#${id}`;
  };

  const isApproved = pensionCase.status === 'approved' || pensionCase.status === 'rejected';

  return (
    <div className="space-y-6">
      {/* Datos del expediente */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.case_data')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.number')} value={pensionCase.number ?? '—'} mono />
          <Field label={t('detail.fields.status')} value={t(`list.status.${pensionCase.status}`)} />
          <Field label={t('detail.fields.requested_at')} value={pensionCase.requested_at ? formatDate(pensionCase.requested_at) : '—'} />
          <Field label={t('detail.fields.last_salary')} value={pensionCase.last_salary != null ? formatCUP(Number(pensionCase.last_salary)) : '—'} />
          <Field label={t('detail.fields.pension_type')} value={lookup(pensionTypesData, pensionCase.pension_type_id)} />
          <Field label={t('detail.fields.pension_regime')} value={lookup(pensionRegimesData, pensionCase.pension_regime_id)} />
          <Field label={t('detail.fields.employer_entity')} value={lookup(entitiesData, pensionCase.employer_entity_id, (e) => `${(e as EntityItem).code} — ${(e as EntityItem).name ?? (e as EntityItem).tax_id_number}`)} />
          <Field label={t('detail.fields.office')} value={lookup(officesData, pensionCase.office_id, (o) => { const off = o as OfficeItem; return [off.type?.name, off.province?.name, off.municipality?.name].filter(Boolean).join(' — ') || off.address; })} />
          <Field label={t('detail.fields.position')} value={lookup(positionsData, pensionCase.position_id)} />
          <Field label={t('detail.fields.occupational_category')} value={lookup(occCatsData, pensionCase.occupational_category_id)} />
          <Field label={t('detail.fields.educational_level')} value={lookup(eduLevelsData, pensionCase.educational_level_id)} />
          <Field label={t('detail.fields.scientific_category')} value={lookup(sciCatsData, pensionCase.scientific_category_id)} />
        </div>
      </div>

      {/* Ejército Rebelde + Internacionalista + Contacto */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.rebel_army')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.rebel_army_member')} value={pensionCase.rebel_army_member ? tc('booleans.yes') : tc('booleans.no')} />
          {pensionCase.rebel_army_member && (
            <Field label={t('detail.fields.rebel_army_join_date')} value={pensionCase.rebel_army_join_date ? formatDate(pensionCase.rebel_army_join_date) : '—'} />
          )}
          <Field label={t('detail.fields.internationalist')} value={pensionCase.internationalist ? tc('booleans.yes') : tc('booleans.no')} />
          <Field label={t('detail.fields.phone')} value={pensionCase.phone ?? '—'} />
          <Field label={t('detail.fields.popular_council')} value={pensionCase.popular_council ?? '—'} />
          <Field label={t('detail.fields.termination_date')} value={pensionCase.termination_date ? formatDate(pensionCase.termination_date) : '—'} />
        </div>
      </div>

      {/* Decisión (solo si hay datos de decisión) */}
      {isApproved && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.decision')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label={t('detail.fields.decided_at')} value={pensionCase.decided_at ? formatDate(pensionCase.decided_at) : '—'} />
            <Field label={t('detail.fields.decided_by')} value={pensionCase.decided_by != null ? `Usuario #${pensionCase.decided_by}` : '—'} />
            {pensionCase.computed_amount != null && <Field label={t('detail.fields.computed_amount')} value={formatCUP(Number(pensionCase.computed_amount))} />}
            <Field label={t('detail.fields.approval_legal_basis')} value={lookup(legalBasesData, pensionCase.approval_legal_basis_id, (lb) => (lb as { title: string }).title)} />
            {pensionCase.calculation_setting_id != null && <Field label={t('detail.fields.calculation_setting')} value={`#${pensionCase.calculation_setting_id}`} />}
            {pensionCase.decision_notes && <Field label={t('detail.fields.decision_notes')} value={pensionCase.decision_notes} fullWidth />}
          </div>
        </div>
      )}

      {/* Datos del proponente */}
      {person && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.fields.applicant')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label={tc('people:detail.fields.identity_number')} value={person.identity_number ?? '—'} mono />
            <Field label={tc('people:detail.fields.citizen_card_id')} value={person.citizen_card_id ?? '—'} />
            <Field label={tc('people:detail.fields.full_name')} value={[person.first_surname, person.second_surname, person.first_name, person.middle_name].filter(Boolean).join(' ')} />
            <Field label={tc('people:detail.fields.sex')} value={person.sex === 'M' ? tc('people:detail.fields.sex_male') : tc('people:detail.fields.sex_female')} />
            <Field label={tc('people:detail.fields.birth_date')} value={person.birth_date ? formatDate(person.birth_date) : '—'} />
            <Field label={tc('people:detail.fields.address')} value={person.address ?? '—'} fullWidth />
            <Field label={tc('people:detail.fields.father_name')} value={person.father_name ?? '—'} />
            <Field label={tc('people:detail.fields.mother_name')} value={person.mother_name ?? '—'} />
          </div>
        </div>
      )}
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
  return <Dialog open onClose={onClose} title={t('salary.add')} size="md"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">{t('salary.form.year')} *</label><Input type="number" min="1950" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('salary.form.earned_salary')} *</label><Input type="number" step="0.01" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} /></div><div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!year || !salary || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ year: Number(year), earned_salary: Number(salary) } as SalaryRecordInput); onClose(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div></div></Dialog>;
}

function ServiceRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddServiceRecord(caseId);
  const [entityId, setEntityId] = useState(0); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [isAppendix, setIsAppendix] = useState(false); const [formaDeclaracion, setFormaDeclaracion] = useState<'Documental' | 'Testifical'>('Documental');
  // Cargar entidades del backend
  const { data: entitiesData } = useQuery({
    queryKey: ['entities', 'all'],
    queryFn: async () => { const r = await http.get<EntityListResponse>('/entities', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const entities = entitiesData?.data ?? [];
  const selectClass = cn('flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50');
  return <Dialog open onClose={onClose} title={t('service.add')} size="lg"><div className="grid grid-cols-2 gap-3">
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('service.form.entity_id')} *</label>
      <select className={selectClass} value={entityId} onChange={(e) => setEntityId(Number(e.target.value))}>
        <option value="0">{tc('actions.select')}</option>
        {entities.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.name ?? e.tax_id_number}</option>)}
      </select></div>
    <div><label className="block text-sm font-medium mb-1">{t('service.form.start_date')} *</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
    <div><label className="block text-sm font-medium mb-1">{t('service.form.end_date')} *</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
    <label className="col-span-2 flex items-center gap-2 pt-1"><input type="checkbox" checked={isAppendix} onChange={(e) => setIsAppendix(e.target.checked)} className="w-4 h-4" /><span className="text-sm">{t('service.form.is_appendix')}</span></label>
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('service.form.declaration_form')}</label>
      <select className={selectClass} value={formaDeclaracion} onChange={(e) => setFormaDeclaracion(e.target.value as 'Documental' | 'Testifical')}>
        <option value="Documental">{t('service.form.declaration_form_documental')}</option>
        <option value="Testifical">{t('service.form.declaration_form_testifical')}</option>
      </select></div>
    <div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!entityId || !startDate || !endDate || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ entity_id: entityId, start_date: startDate, end_date: endDate || null, is_appendix: isAppendix, declaration_form: formaDeclaracion } as ServiceRecordInput); onClose(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div>
  </div></Dialog>;
}

function WorkCycleModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddWorkCycle(caseId);
  const [planned, setPlanned] = useState(''); const [actual, setActual] = useState(''); const [count, setCount] = useState('');
  return <Dialog open onClose={onClose} title={t('cycle.add')} size="md"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">{t('cycle.form.planned_days')} *</label><Input type="number" min="0" value={planned} onChange={(e) => setPlanned(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('cycle.form.actual_days')} *</label><Input type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} /></div><div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('cycle.form.cycles_count')} *</label><Input type="number" min="0" value={count} onChange={(e) => setCount(e.target.value)} /></div><div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!planned || !actual || !count || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ planned_days: Number(planned), actual_days: Number(actual), cycles_count: Number(count) } as WorkCycleInput); onClose(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div></div></Dialog>;
}

function IncomeConceptRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddIncomeConceptRecord(caseId);
  const [conceptId, setConceptId] = useState(0); const [amount, setAmount] = useState('');
  return <Dialog open onClose={onClose} title={t('income_concept.add')} size="md"><div className="grid grid-cols-2 gap-3">
    <div className="col-span-2"><CatalogSearchSelect
      type="income-concepts"
      label={t('income_concept.form.income_concept_id')}
      placeholder={tc('actions.search') + '…'}
      required
      onSelect={(item) => setConceptId(item.id)}
    /></div>
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('income_concept.form.amount')} *</label><Input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
    <div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!conceptId || !amount || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ income_concept_id: conceptId, amount: Number(amount) } as IncomeConceptRecordInput); onClose(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div>
  </div></Dialog>;
}
