import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileText, Clock, Calculator, ClipboardList, Plus, Trash2, GitBranch, ArrowRight, CheckCircle2, XCircle, AlertTriangle, History as HistoryIcon, Users, Lock, FileDown } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePensionCase, usePensionCaseHistory, useCaseCalculation, useCalculationPreview } from '../api/queries';
import { useAddSalaryRecord, useRemoveSalaryRecord, useAddServiceRecord, useRemoveServiceRecord, useAddWorkCycle, useRemoveWorkCycle, useAddIncomeConceptRecord, useRemoveIncomeConceptRecord, useRemoveEntitledRelative } from '../api/mutations';
import { CASE_STATUS_META, type CaseStatus, type PensionCase, type SalaryRecordInput, type ServiceRecordInput, type WorkCycleInput, type IncomeConceptRecordInput } from '../schemas/pension-case.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { formatDate, formatCUP, cn, personFullName } from '@/lib/utils';
import { http } from '@/lib/http';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import type { components } from '@/types/api';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { CaseTransitionModal } from '../components/CaseTransitionModal';
import { EntitledRelativeFormModal } from '../components/EntitledRelativeFormModal';
import { useDownloadCaseFicha } from '@/features/reports/api/mutations';

type Person = components['schemas']['Person'];
interface EntityItem { id: number; code: string; name?: string; tax_id_number: string; }
interface EntityListResponse { data: EntityItem[]; }
interface CatalogItem { id: number; name: string; }
interface CatalogListResponse { data: CatalogItem[]; }
interface OfficeItem { id: number; address: string; type?: { name: string }; province?: { name: string }; municipality?: { name: string }; }

type Tab = 'summary' | 'subrecords' | 'relatives' | 'history' | 'calculation';
type SubModalKind = 'salary' | 'service' | 'cycle' | 'income' | null;

export function PensionCaseDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [subModal, setSubModal] = useState<SubModalKind>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [relativesModal, setRelativesModal] = useState(false);

  const downloadFichaMutation = useDownloadCaseFicha();
  const { t: tr } = useTranslation('reports');

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

  // Copia heredada de una declaración de fallecimiento: la fila nació con el
  // expediente derivado y su eliminación está bloqueada por contrato (422).
  // Se presenta el candado y el distintivo «copia»; el backend sigue siendo
  // la autoridad si la petición llegara a escaparse.
  const DerivedBadge = () => (
    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-zinc-200 text-zinc-700 align-middle">{t('subrecord.derived_badge')}</span>
  );
  const DerivedLock = () => (
    <span className="inline-flex p-1 text-muted-foreground" title={t('subrecord.derived_help')}>
      <Lock className="w-3.5 h-3.5" />
    </span>
  );

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !pensionCase) return <div className="max-w-7xl mx-auto text-center py-12"><h1 className="text-xl font-semibold text-foreground mb-2">{t('detail.not_found')}</h1><button onClick={() => navigate('/expedientes')} className="text-primary hover:underline">{t('detail.back_to_list')}</button></div>;

  const statusMeta = CASE_STATUS_META[pensionCase.status ?? 'submitted'] ?? { label: pensionCase.status ?? '—', badgeClass: '' };
  const applicantName = pensionCase.applicant ? `${pensionCase.applicant.first_surname ?? ''} ${pensionCase.applicant.first_name ?? ''}`.trim() : '—';
  const currentStatus = (pensionCase.status ?? 'submitted') as CaseStatus;
  // Botón Transitar visible si el usuario tiene al menos un permiso de transición
  const canTransition = (['cases.review', 'cases.approve', 'cases.reject', 'cases.reopen'] as const).some((p) => can(p));
  // Botón Vista previa del cálculo: solo en submitted/under_review + permiso cases.calculate
  const canCalculate = can('cases.calculate') && (currentStatus === 'submitted' || currentStatus === 'under_review');

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/expedientes')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-mono">{pensionCase.number}</h1>
          <p className="text-sm text-muted-foreground mt-1">{applicantName} · <span className={`badge ${statusMeta.badgeClass}`}>{t(`list.status.${pensionCase.status}`)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón Ficha PDF del expediente (RF-REP-004) */}
          <Button
            variant="outline"
            onClick={() => downloadFichaMutation.mutate(id)}
            disabled={downloadFichaMutation.isPending}
            title={tr('ficha.case_button')}
          >
            <FileDown className="w-4 h-4" />
            {tr('ficha.case_button')}
          </Button>
          {/* Botón Vista previa del cálculo — visible si el estado es submitted/under_review + permiso cases.calculate */}
          {canCalculate && (
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Calculator className="w-4 h-4" />
              {t('calculation_preview.button')}
            </Button>
          )}
          {/* Botón Transitar estado — visible si hay transiciones legales permitidas para el usuario */}
          {canTransition && (
            <Button variant="outline" onClick={() => setTransitionOpen(true)}>
              <GitBranch className="w-4 h-4" />
              {t('transition.button')}
            </Button>
          )}
        </div>
      </div>
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <TabBtn active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}><ClipboardList className="w-4 h-4" />{t('detail.tabs.summary')}</TabBtn>
          <TabBtn active={activeTab === 'subrecords'} onClick={() => setActiveTab('subrecords')}><FileText className="w-4 h-4" />{t('detail.tabs.subrecords')}</TabBtn>
          {pensionCase.entitled_relatives != null && (
            <TabBtn active={activeTab === 'relatives'} onClick={() => setActiveTab('relatives')}><Users className="w-4 h-4" />{t('detail.tabs.relatives')}</TabBtn>
          )}
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
                <tbody className="divide-y divide-border">{(pensionCase.salary_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.year}{r.derived && <DerivedBadge />}</td><td className="px-3 py-2">{formatCUP(Number(r.earned_salary ?? 0))}</td>{canEdit && <td className="text-right px-3 py-2">{r.derived ? <DerivedLock /> : <button onClick={() => removeSalaryMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}</td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Servicios */}
          <SubrecordSection title={t('service.title')} onAdd={canEdit ? () => setSubModal('service') : undefined} addLabel={t('service.add')}>
            {(pensionCase.service_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('service.columns.entity')}</th><th className="text-left px-3 py-2">{t('service.columns.start_date')}</th><th className="text-left px-3 py-2">{t('service.columns.end_date')}</th><th className="text-right px-3 py-2">{t('service.columns.worked_months')}</th><th className="text-right px-3 py-2">{t('service.columns.worked_years')}</th><th className="text-left px-3 py-2">{t('service.columns.is_appendix')}</th><th className="text-left px-3 py-2">{t('service.columns.declaration_form')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.service_records ?? []).map((r) => {
                  const entityLabel = r.entity ? (r.entity.name ?? `${r.entity.code ?? ''} ${r.entity.tax_id_number ?? ''}`.trim()) : (r.entity_id ? `#${r.entity_id}` : '—');
                  return (<tr key={r.id}><td className="px-3 py-2 text-xs">{entityLabel}{r.derived && <DerivedBadge />}</td><td className="px-3 py-2">{r.start_date ? formatDate(r.start_date) : '—'}</td><td className="px-3 py-2">{r.end_date ? formatDate(r.end_date) : '—'}</td><td className="px-3 py-2 text-right font-mono">{r.worked_months != null ? r.worked_months : '—'}</td><td className="px-3 py-2 text-right font-mono">{r.worked_years != null ? r.worked_years : '—'}</td><td className="px-3 py-2">{r.is_appendix ? '✓' : '—'}</td><td className="px-3 py-2 text-xs">{r.declaration_form ?? '—'}</td>{canEdit && <td className="text-right px-3 py-2">{r.derived ? <DerivedLock /> : <button onClick={() => removeServiceMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}</td>}</tr>);
                })}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Ciclos */}
          <SubrecordSection title={t('cycle.title')} onAdd={canEdit ? () => setSubModal('cycle') : undefined} addLabel={t('cycle.add')}>
            {(pensionCase.work_cycles ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('cycle.columns.planned_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.actual_days')}</th><th className="text-left px-3 py-2">{t('cycle.columns.cycles_count')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.work_cycles ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{r.planned_days}{r.derived && <DerivedBadge />}</td><td className="px-3 py-2">{r.actual_days}</td><td className="px-3 py-2">{r.cycles_count}</td>{canEdit && <td className="text-right px-3 py-2">{r.derived ? <DerivedLock /> : <button onClick={() => removeWorkCycleMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}</td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
          {/* Conceptos de ingreso */}
          <SubrecordSection title={t('income_concept.title')} onAdd={canEdit ? () => setSubModal('income') : undefined} addLabel={t('income_concept.add')}>
            {(pensionCase.income_concept_records ?? []).length > 0 ? (
              <table className="w-full text-sm"><thead><tr className="bg-muted text-xs uppercase tracking-wider text-muted-foreground"><th className="text-left px-3 py-2">{t('income_concept.columns.income_concept')}</th><th className="text-right px-3 py-2">{t('income_concept.columns.applied_percent')}</th>{canEdit && <th className="text-right px-3 py-2"></th>}</tr></thead>
                <tbody className="divide-y divide-border">{(pensionCase.income_concept_records ?? []).map((r) => (<tr key={r.id}><td className="px-3 py-2">{incomeConceptLabel(r.income_concept_id)}</td><td className="px-3 py-2 text-right font-mono">{r.applied_percent != null ? `${r.applied_percent}%` : '—'}</td>{canEdit && <td className="text-right px-3 py-2"><button onClick={() => removeIncomeConceptMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></td>}</tr>))}</tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground py-2">—</p>}
          </SubrecordSection>
        </div>
      )}

      {activeTab === 'relatives' && (
        <EntitledRelativesTab pensionCase={pensionCase} caseId={id} canEdit={canEdit} onAdd={() => setRelativesModal(true)} t={t} />
      )}
      {activeTab === 'history' && (
        <HistoryTab caseId={id} t={t} />
      )}
      {activeTab === 'calculation' && (
        <CalculationTab caseId={id} currentStatus={currentStatus} t={t} />
      )}

      {/* Modales de subregistros */}
      {subModal === 'salary' && <SalaryRecordModal caseId={id} onClose={() => setSubModal(null)} />}
      {subModal === 'service' && <ServiceRecordModal caseId={id} onClose={() => setSubModal(null)} />}
      {subModal === 'cycle' && <WorkCycleModal caseId={id} onClose={() => setSubModal(null)} />}
      {subModal === 'income' && <IncomeConceptRecordModal caseId={id} onClose={() => setSubModal(null)} />}

      {relativesModal && <EntitledRelativeFormModal caseId={id} onClose={() => setRelativesModal(false)} />}

      {/* Modal de transición de estado */}
      {transitionOpen && (
        <CaseTransitionModal
          caseId={id}
          currentStatus={currentStatus}
          pensionTypeId={pensionCase.pension_type_id}
          onClose={() => setTransitionOpen(false)}
        />
      )}

      {/* Modal de vista previa del cálculo */}
      {previewOpen && (
        <CalculationPreviewModal caseId={id} onClose={() => setPreviewOpen(false)} t={t} tc={tc} />
      )}
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
  // Task 74/Bloque C: catálogo diseases — para lookup del disease_id del bloque de invalidez
  const { data: diseasesData } = useCatalog('diseases');
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
          {/* Expediente de origen — presente solo en los derivados de una declaración de fallecimiento */}
          {pensionCase.parent_case_id != null && (
            <Field label={t('detail.fields.parent_case_id')} value={`#${pensionCase.parent_case_id}`} mono />
          )}
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

      {/* Domicilio y cobro del promovente */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.residence')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.current_address')} value={pensionCase.current_address ?? '—'} fullWidth />
          <Field label={t('detail.fields.residence_province')} value={pensionCase.residence_province?.name ?? '—'} />
          <Field label={t('detail.fields.residence_municipality')} value={pensionCase.residence_municipality?.name ?? '—'} />
          <Field label={t('detail.fields.collection_agency_type')} value={pensionCase.collection_agency_type?.name ?? '—'} />
          <Field label={t('detail.fields.collection_agency')} value={pensionCase.collection_agency ? `${pensionCase.collection_agency.code ?? ''} — ${pensionCase.collection_agency.name ?? ''}`.trim() : '—'} />
          <Field label={t('detail.fields.bank_account')} value={pensionCase.bank_account ?? '—'} mono />
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
          <Field label={t('detail.fields.missing_salaries_attributable')} value={
            pensionCase.missing_salaries_attributable == null ? t('detail.fields.missing_salaries_attributable_unset')
              : pensionCase.missing_salaries_attributable ? t('detail.fields.missing_salaries_attributable_true')
              : t('detail.fields.missing_salaries_attributable_false')
          } />
          {/* Task 73/B-2: meses de salarios imputables declarados en el expediente */}
          <Field label={t('detail.fields.imputable_salary_months')} value={
            pensionCase.imputable_salary_months != null
              ? String(pensionCase.imputable_salary_months)
              : '—'
          } mono />
        </div>
      </div>

      {/* Task 74/Bloque C: bloque de invalidez del expediente.
          Se muestra solo si disease_id != null (indicador de que el expediente tiene el bloque).
          Los 5 campos son obligatorios con invalidez y prohibidos en el resto (D-7408). */}
      {pensionCase.disease_id != null && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.invalidez_block')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label={t('detail.fields.disease_id')} value={lookup(diseasesData, pensionCase.disease_id)} />
            <Field label={t('detail.fields.disease_origin')} value={
              pensionCase.disease_origin
                ? t(`detail.fields.disease_origin_${pensionCase.disease_origin}`)
                : '—'
            } />
            <Field label={t('detail.fields.requires_personal_care')} value={
              pensionCase.requires_personal_care != null
                ? (pensionCase.requires_personal_care ? tc('booleans.yes') : tc('booleans.no'))
                : '—'
            } />
            <Field label={t('detail.fields.temporary_disability')} value={
              pensionCase.temporary_disability != null
                ? (pensionCase.temporary_disability ? tc('booleans.yes') : tc('booleans.no'))
                : '—'
            } />
            {pensionCase.temporary_disability === true && (
              <Field label={t('detail.fields.re_assessment_date')} value={
                pensionCase.re_assessment_date ? formatDate(pensionCase.re_assessment_date) : '—'
              } mono />
            )}
          </div>
        </div>
      )}

      {/* Bloque de defunción: se muestra solo si death_date != null. */}
      {pensionCase.death_date != null && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.death_block')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label={t('detail.fields.death_cause')} value={lookup(diseasesData, pensionCase.disease_id)} />
            <Field label={t('detail.fields.death_origin_type')} value={
              pensionCase.disease_origin
                ? t(`detail.fields.disease_origin_${pensionCase.disease_origin}`) ?? t(`form.disease_origin_${pensionCase.disease_origin}`)
                : '—'
            } />
            <Field label={t('detail.fields.death_date')} value={pensionCase.death_date ? formatDate(pensionCase.death_date) : '—'} mono />
            <Field label={t('detail.fields.death_certificate_date')} value={pensionCase.death_certificate_date ? formatDate(pensionCase.death_certificate_date) : '—'} mono />
            <Field label={t('detail.fields.death_certificate')} value={pensionCase.death_certificate ?? '—'} mono fullWidth />
            <Field label={t('detail.fields.forced_age_retirement')} value={
              pensionCase.forced_age_retirement != null
                ? (pensionCase.forced_age_retirement ? tc('booleans.yes') : tc('booleans.no'))
                : '—'
            } />
          </div>
        </div>
      )}

      {/* Decisión (solo si hay datos de decisión) */}
      {isApproved && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.decision')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label={t('detail.fields.decided_at')} value={pensionCase.decided_at ? formatDate(pensionCase.decided_at) : '—'} />
            <Field label={t('detail.fields.decided_by')} value={pensionCase.decided_by != null ? `Usuario #${pensionCase.decided_by}` : '—'} />
            {pensionCase.computed_amount != null && <Field label={t('detail.fields.computed_amount')} value={formatCUP(Number(pensionCase.computed_amount))} />}
            <Field label={t('detail.fields.approval_legal_basis')} value={lookup(legalBasesData, pensionCase.approval_legal_basis_id, (lb) => (lb as { title: string }).title)} />
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
            <Field label={tc('people:detail.fields.full_name')} value={personFullName(person) || '—'} />
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

/**
 * Tab Historial — línea de tiempo append-only de transiciones del expediente
 * (S6, RF-EXP-009, RN-010/DA H-09). Solo lectura: cada fila muestra estado
 * previo → nuevo, usuario responsable, momento y nota de evidencia.
 */
/**
 * Tab Familiares con derecho — muestra los familiares con derecho del expediente.
 * Solo aparece cuando pensionCase.entitled_relatives != null (rama fallecimiento).
 * Cada fila tiene: persona beneficiaria, tipo, agencia de cobro, cuenta, tutor, monto asignado.
 * Add (POST) + Delete (DELETE) via subresource endpoints.
 */
function EntitledRelativesTab({ pensionCase, caseId, canEdit, onAdd, t }: {
  pensionCase: PensionCase;
  caseId: string;
  canEdit: boolean;
  onAdd: () => void;
  t: (key: string) => string;
}) {
  const removeMutation = useRemoveEntitledRelative(caseId);
  const relatives = pensionCase.entitled_relatives ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('entitled_relative.title')}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('entitled_relative.description')}</p>
        </div>
        {canEdit && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="w-3.5 h-3.5" />{t('entitled_relative.add')}</Button>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('entitled_relative.beneficiary_person')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('entitled_relative.beneficiary_type')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('entitled_relative.agency')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('entitled_relative.assigned_amount')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('entitled_relative.tutor')}</th>
            {canEdit && <th className="text-right px-4 py-3 font-medium"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {relatives.length === 0 ? (
            <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">{t('entitled_relative.empty')}</td></tr>
          ) : (
            relatives.map((r) => {
              const personName = r.beneficiary ? [r.beneficiary.first_surname, r.beneficiary.first_name].filter(Boolean).join(' ') : '—';
              const tutorName = r.tutor ? [r.tutor.first_surname, r.tutor.first_name].filter(Boolean).join(' ') : null;
              return (
                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">{personName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.beneficiary_type?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.agency?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.assigned_amount != null ? formatCUP(Number(r.assigned_amount)) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{tutorName ?? '—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeMutation.mutate(r.id!)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTab({ caseId, t }: { caseId: string; t: (key: string) => string }) {
  const { data: history, isLoading, isError } = usePensionCaseHistory(caseId);
  const { t: tc } = useTranslation('common');

  if (isLoading) return <div className="text-sm text-muted-foreground">{tc('status.loading')}…</div>;
  if (isError) return <div className="text-sm text-destructive">{tc('status.error')}</div>;
  if (!history || history.length === 0) {
    return <EmptyTab icon={Clock} title={t('detail.tabs_empty.history')} desc={t('detail.tabs_empty.history_description')} />;
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-0">
        {history.map((row, idx) => {
          const fromMeta = CASE_STATUS_META[row.from_status ?? 'submitted'] ?? { label: row.from_status ?? '—', badgeClass: '' };
          const toMeta = CASE_STATUS_META[row.to_status ?? 'submitted'] ?? { label: row.to_status ?? '—', badgeClass: '' };
          const isLast = idx === history.length - 1;
          return (
            <div key={row.id ?? idx} className="relative flex gap-4 pb-6">
              {/* Línea conectora */}
              {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
              {/* Nodo */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center z-10">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              {/* Contenido */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('badge', fromMeta.badgeClass)}>{t(`list.status.${row.from_status}`)}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className={cn('badge', toMeta.badgeClass)}>{t(`list.status.${row.to_status}`)}</span>
                  {row.changed_at && (
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(row.changed_at)}</span>
                  )}
                </div>
                {row.changed_by?.name && (
                  <p className="text-xs text-muted-foreground mb-1">{t('history.by')} {row.changed_by.name}</p>
                )}
                {row.note && (
                  <p className="text-sm text-foreground bg-muted/50 rounded-md p-2 mt-1">{row.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tab Cálculo — muestra el snapshot congelado del expediente aprobado (RF-CAL-008, S8.4).
 * Si el expediente NO está aprobado, muestra EmptyTab con instrucciones.
 * Si está aprobado, renderiza el snapshot vigente + línea de versiones por sequence.
 */
function CalculationTab({ caseId, currentStatus, t }: { caseId: string; currentStatus: CaseStatus; t: (key: string, options?: Record<string, unknown>) => string }) {
  const { t: tc } = useTranslation('common');
  const { data: calculation, isLoading } = useCaseCalculation(caseId);

  if (currentStatus !== 'approved') {
    return <EmptyTab icon={Calculator} title={t('detail.tabs_empty.calculation')} desc={t('detail.tabs_empty.calculation_description')} />;
  }
  if (isLoading) return <div className="text-sm text-muted-foreground">{tc('status.loading')}…</div>;
  if (!calculation) {
    return <EmptyTab icon={Calculator} title={t('detail.tabs_empty.calculation')} desc={t('detail.tabs_empty.calculation_description')} />;
  }

  // Casts necesarios porque el api.ts codegen tipa estos como Record<string, never>
  const eligibility = calculation.eligibility as unknown as { eligible?: boolean; criteria?: Array<{ criterion: string; passes: boolean; explanation: string }> } | null;
  const regimeParameters = calculation.regime_parameters as unknown as Record<string, string | number | null> | null;
  const inputs = calculation.inputs as unknown as Record<string, string | number | null> | null;
  const versions = (calculation.versions ?? []) as Array<{ sequence?: number; amount?: string; computed_at?: string; computed_by?: { id?: number; name?: string } }>;

  // Helpers para traducir claves de datos crudos del backend
  const catalogLabel = (k: string): string => t(`catalogs:form.${k}`, { defaultValue: k });
  const criterionLabel = (k: string): string => t(`calculation.criteria.${k}`, { defaultValue: k });
  const inputLabel = (k: string): string => t(`calculation.inputs.${k}`, { defaultValue: k });

  return (
    <div className="space-y-6">
      {/* Resumen del snapshot vigente */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('calculation.current_snapshot')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('calculation.fields.sequence')} value={`#${calculation.sequence}`} mono />
          <Field label={t('calculation.fields.computed_at')} value={calculation.computed_at ? formatDate(calculation.computed_at) : '—'} />
          <Field label={t('calculation.fields.computed_by')} value={calculation.computed_by?.name ?? `Usuario #${calculation.computed_by?.id ?? '—'}`} />
          <Field label={t('calculation.fields.amount')} value={calculation.amount != null ? formatCUP(Number(calculation.amount)) : '—'} mono />
          <Field label={t('calculation.fields.service_months')} value={String(calculation.service_months ?? '—')} mono />
          <Field label={t('calculation.fields.service_years_exact')} value={String(calculation.service_years_exact ?? '—')} mono />
          <Field label={t('calculation.fields.service_years_truncated')} value={String(calculation.service_years_truncated ?? '—')} mono />
          <Field label={t('calculation.fields.average_strategy')} value={calculation.average_strategy ?? '—'} />
          <Field label={t('calculation.fields.average_years_count')} value={String(calculation.average_years_count ?? '—')} mono />
          <Field label={t('calculation.fields.average_monthly_salary')} value={calculation.average_monthly_salary != null ? formatCUP(Number(calculation.average_monthly_salary)) : '—'} mono />
          <Field label={t('calculation.fields.excess_years')} value={String(calculation.excess_years ?? '—')} mono />
          {/* Task 52/S8.8 V-8: N efectivo divisor congelado (api usa 'average_years_effective' en el snapshot) */}
          <Field label={t('calculation.fields.average_years_used')} value={String((calculation as { average_years_effective?: number }).average_years_effective ?? '—')} mono />
          {/* Task 52/S8.8 V-8: declaración de imputabilidad congelada */}
          <Field label={t('detail.fields.missing_salaries_attributable')} value={
            calculation.missing_salaries_attributable == null ? t('detail.fields.missing_salaries_attributable_unset')
              : calculation.missing_salaries_attributable ? t('detail.fields.missing_salaries_attributable_true')
              : t('detail.fields.missing_salaries_attributable_false')
          } />
          {/* Task 73/B-2: meses de salarios imputables congelados con la resolución (D-7308(a)) */}
          <Field label={t('calculation.fields.imputable_salary_months')} value={
            calculation.imputable_salary_months != null
              ? String(calculation.imputable_salary_months)
              : '—'
          } mono />
        </div>
      </div>

      {/* Elegibilidad */}
      {eligibility?.criteria && eligibility.criteria.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('calculation.eligibility_section')}</h3>
          <ul className="space-y-2">
            {eligibility.criteria.map((c, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                {c.passes
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                  : <XCircle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />}
                <div>
                  <span className="font-medium text-foreground">{criterionLabel(c.criterion)}</span>
                  <span className="text-muted-foreground ml-2">{c.explanation}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parámetros del régimen congelados */}
      {regimeParameters && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('calculation.regime_parameters_section')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {Object.entries(regimeParameters).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground text-xs">{catalogLabel(k)}</span>
                <span className="text-foreground font-mono">{String(v ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs congelados */}
      {inputs && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('calculation.inputs_section')}</h3>
          <div className="space-y-2">
            {Object.entries(inputs).map(([k, v]) => {
              // Detectar tipos compuestos: arrays y objetos anidados
              const isObjectOrArray = v !== null && typeof v === 'object';
              const isArray = Array.isArray(v);
              const entries = isObjectOrArray ? Object.entries(v as Record<string, unknown>) : [];
              const arrayLen = isArray ? (v as unknown[]).length : 0;

              return (
                <div key={k} className="border-l-2 border-border pl-3 py-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">{inputLabel(k)}</span>
                    <span className="text-xs text-muted-foreground">
                      {isArray
                        ? `${arrayLen} ${arrayLen === 1 ? 'registro' : 'registros'}`
                        : isObjectOrArray
                          ? `${entries.length} ${entries.length === 1 ? 'campo' : 'campos'}`
                          : null}
                    </span>
                  </div>
                  {/* Valor simple */}
                  {!isObjectOrArray && (
                    <p className="text-sm text-foreground font-mono">{String(v ?? '—')}</p>
                  )}
                  {/* Array de salarios: mostrar como tabla compacta año + salario */}
                  {isArray && k === 'salaries' && arrayLen > 0 && (
                    <table className="w-full text-xs mt-1 border border-border rounded">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-1">{t('calculation.inputs.year')}</th>
                          <th className="text-right px-2 py-1">{t('calculation.inputs.earned_salary')}</th>
                          {(() => {
                            const first = (v as Array<Record<string, unknown>>)[0] ?? {};
                            return Object.keys(first).filter(kk => !['year', 'earned_salary', 'id', 'pension_case_id'].includes(kk)).map((kk) => (
                              <th key={kk} className="text-left px-2 py-1">{kk}</th>
                            ));
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {(v as Array<Record<string, unknown>>).map((row, idx) => (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-2 py-1 font-mono">{String(row.year ?? '—')}</td>
                            <td className="px-2 py-1 text-right font-mono">{row.earned_salary != null ? formatCUP(Number(row.earned_salary)) : '—'}</td>
                            {Object.keys(row).filter(kk => !['year', 'earned_salary', 'id', 'pension_case_id'].includes(kk)).map((kk) => (
                              <td key={kk} className="px-2 py-1 font-mono">{String(row[kk] ?? '—')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {/* Array genérico (no salaries): mostrar items como lista */}
                  {isArray && k !== 'salaries' && arrayLen > 0 && (
                    <ul className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                      {(v as unknown[]).slice(0, 5).map((item, idx) => (
                        <li key={idx} className="font-mono">• {typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)}</li>
                      ))}
                      {arrayLen > 5 && <li className="italic">…{arrayLen - 5} más</li>}
                    </ul>
                  )}
                  {/* Objeto anidado (no array): mostrar claves como mini-tabla */}
                  {!isArray && isObjectOrArray && entries.length > 0 && (
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      {entries.map(([sk, sv]) => (
                        <div key={sk} className="flex justify-between">
                          <span className="text-muted-foreground font-mono">{sk}</span>
                          <span className="text-foreground font-mono">{typeof sv === 'object' && sv !== null ? JSON.stringify(sv) : String(sv ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Array vacío u objeto vacío */}
                  {isObjectOrArray && entries.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Línea de versiones por reapertura/re-aprobación */}
      {versions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('calculation.versions_section')}</h3>
          <div className="space-y-2">
            {versions.map((v, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">#{v.sequence}</span>
                <span className="text-sm font-mono text-foreground">{v.amount != null ? formatCUP(Number(v.amount)) : '—'}</span>
                <span className="text-xs text-muted-foreground ml-auto">{v.computed_at ? formatDate(v.computed_at) : '—'}</span>
                <span className="text-xs text-muted-foreground">· {v.computed_by?.name ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal de vista previa del cálculo — POST /pension-cases/{id}/calculation-preview
 * Ejecuta el motor SIN persistir (RF-CAL-006, S8.2). Disponible en submitted/under_review.
 */
function CalculationPreviewModal({ caseId, onClose, t, tc }: { caseId: string; onClose: () => void; t: (key: string, options?: Record<string, unknown>) => string; tc: (key: string, options?: Record<string, unknown>) => string }) {
  const mutation = useCalculationPreview(caseId);
  const preview = mutation.data;

  // Casts para los objects anidados (api.ts codegen)
  const eligibility = preview?.eligibility as unknown as { eligible?: boolean; criteria?: Array<{ criterion: string; passes: boolean; explanation: string }> } | null;
  const regimeParameters = preview?.regime_parameters as unknown as Record<string, string | number | null> | null;

  // Helper para traducir claves de catálogo cross-namespace (catalogs:form.{key})
  const catalogLabel = (k: string): string => t(`catalogs:form.${k}`, { defaultValue: k });

  // Helper para traducir criterios de elegibilidad (pension-cases:calculation.criteria.{key})
  const criterionLabel = (k: string): string => t(`calculation.criteria.${k}`, { defaultValue: k });

  return (
    <Dialog open onClose={onClose} title={t('calculation_preview.title')} size="lg">
      <div className="space-y-4">
        {/* Botón ejecutar simulación */}
        {!preview && (
          <div className="flex flex-col items-center justify-center py-8">
            <Calculator className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">{t('calculation_preview.help')}</p>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? tc('status.loading') + '…' : t('calculation_preview.run')}
            </Button>
          </div>
        )}

        {/* Error / loading */}
        {mutation.isError && !mutation.isPending && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{t('calculation_preview.error')}</p>
          </div>
        )}

        {/* Resultado */}
        {preview && (
          <div className="space-y-4">
            {/* Elegibilidad */}
            {eligibility && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t('calculation.eligibility_section')}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">{t('calculation_preview.status')}:</span>
                  {eligibility.eligible
                    ? <span className="badge badge-approved"><CheckCircle2 className="w-3 h-3" />{t('calculation_preview.eligible')}</span>
                    : <span className="badge badge-rejected"><XCircle className="w-3 h-3" />{t('calculation_preview.not_eligible')}</span>}
                </div>
                <ul className="space-y-1">
                  {eligibility.criteria?.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      {c.passes
                        ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                        : <XCircle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />}
                      <div>
                        <span className="font-medium text-foreground">{criterionLabel(c.criterion)}</span>
                        <span className="text-muted-foreground ml-2">{c.explanation}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resultados numéricos */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{t('calculation_preview.results_section')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('calculation.fields.service_months')} value={String(preview.service_years?.months ?? '—')} mono />
                <Field label={t('calculation.fields.service_years_exact')} value={String(preview.service_years?.exact ?? '—')} mono />
                <Field label={t('calculation.fields.service_years_truncated')} value={String(preview.service_years?.truncated ?? '—')} mono />
                <Field label={t('calculation.fields.excess_years')} value={String(preview.excess_years ?? '—')} mono />
                <Field label={t('calculation.fields.average_monthly_salary')} value={preview.average_monthly_salary != null ? formatCUP(Number(preview.average_monthly_salary)) : '—'} mono />
                <Field label={t('calculation.fields.amount')} value={preview.amount != null ? formatCUP(Number(preview.amount)) : '—'} mono />
                {/* Task 52/S8.8 V-7: N efectivo divisor */}
                <Field label={t('calculation.fields.average_years_used')} value={String(preview.average_years_used ?? '—')} mono />
                {/* Task 52/S8.8 V-6: declaración de imputabilidad */}
                <Field label={t('detail.fields.missing_salaries_attributable')} value={
                  preview.missing_salaries_attributable == null ? t('detail.fields.missing_salaries_attributable_unset')
                    : preview.missing_salaries_attributable ? t('detail.fields.missing_salaries_attributable_true')
                    : t('detail.fields.missing_salaries_attributable_false')
                } />
                {/* Task 73/B-2: meses de salarios imputables declarados (divisor explícito del SPM) */}
                <Field label={t('calculation.fields.imputable_salary_months')} value={
                  preview.imputable_salary_months != null
                    ? String(preview.imputable_salary_months)
                    : '—'
                } mono />
                {/* Task 73/B-2: meses EXACTOS que dividieron el SPM (imputable_salary_months o N_eff × 12) */}
                <Field label={t('calculation.fields.average_divisor_months')} value={
                  preview.average_divisor_months != null
                    ? String(preview.average_divisor_months)
                    : '—'
                } mono />
                {/* Rama fallecimiento: cantidad de familiares y cuantía individual */}
                <Field label={t('calculation.fields.entitled_relatives_count')} value={
                  preview.entitled_relatives_count != null
                    ? String(preview.entitled_relatives_count)
                    : '—'
                } mono />
                <Field label={t('calculation.fields.individual_amount')} value={
                  preview.individual_amount != null
                    ? formatCUP(Number(preview.individual_amount))
                    : '—'
                } mono />
                {/* Task 53/S8.9: porciento total de conceptos aplicables */}
                <Field label={t('calculation.fields.income_concept_percent')} value={preview.income_concept_percent != null ? `${preview.income_concept_percent}%` : '—'} mono />
                {/* Task 57-58/SGP-42-43: indicadores de la fórmula */}
                {preview.internationalist_applied != null && <Field label={t('calculation.fields.internationalist_applied')} value={preview.internationalist_applied ? tc('booleans.yes') : tc('booleans.no')} />}
                {preview.minimum_increment_applied != null && <Field label={t('calculation.fields.minimum_increment_applied')} value={preview.minimum_increment_applied ? tc('booleans.yes') : tc('booleans.no')} />}
                {preview.capped_by_maximum != null && <Field label={t('calculation.fields.capped_by_maximum')} value={preview.capped_by_maximum ? tc('booleans.yes') : tc('booleans.no')} />}
                {preview.above_maximum != null && <Field label={t('calculation.fields.above_maximum')} value={preview.above_maximum ? tc('booleans.yes') : tc('booleans.no')} />}
              </div>
            </div>

            {/* Task 53/S8.9: conceptos de ingreso aplicables */}
            {preview.income_concept_terms && preview.income_concept_terms.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t('calculation.income_concept_terms_section')}</h3>
                <table className="w-full text-xs border border-border rounded">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left px-2 py-1">{t('calculation.income_concept_terms.code')}</th>
                      <th className="text-left px-2 py-1">{t('calculation.income_concept_terms.name')}</th>
                      <th className="text-right px-2 py-1">{t('calculation.income_concept_terms.applied_percent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.income_concept_terms.map((term, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-2 py-1 font-mono">{String(term.code ?? '—')}</td>
                        <td className="px-2 py-1">{String(term.name ?? '—')}</td>
                        <td className="px-2 py-1 text-right font-mono">{term.applied_percent != null ? `${term.applied_percent}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Warnings */}
            {preview.warnings && preview.warnings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t('calculation_preview.warnings_section')}</h3>
                <ul className="space-y-1">
                  {preview.warnings.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                      <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Parámetros del régimen usados */}
            {regimeParameters && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{t('calculation.regime_parameters_section')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(regimeParameters).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{catalogLabel(k)}</span>
                      <span className="text-foreground font-mono">{String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground italic">{t('calculation_preview.no_persistence_warning')}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button>
        {preview && (
          <Button variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? tc('status.loading') + '…' : t('calculation_preview.run_again')}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function EmptyTab({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return <div className="flex flex-col items-center justify-center min-h-[30vh] text-center"><div className="p-4 rounded-full bg-muted mb-4"><Icon className="w-10 h-10 text-muted-foreground" /></div><h2 className="text-lg font-medium text-foreground mb-1">{title}</h2><p className="text-sm text-muted-foreground max-w-md">{desc}</p></div>;
}

// Modales de subregistros
function SalaryRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddSalaryRecord(caseId);
  const [year, setYear] = useState(''); const [salary, setSalary] = useState('');
  const reset = () => { setYear(''); setSalary(''); };
  return <Dialog open onClose={onClose} title={t('salary.add')} size="md"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">{t('salary.form.year')} *</label><Input type="number" min="1950" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('salary.form.earned_salary')} *</label><Input type="number" step="0.01" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} /></div><div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button><Button disabled={!year || !salary || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ year: Number(year), earned_salary: Number(salary) } as SalaryRecordInput); reset(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save_and_continue')}</Button></div></div></Dialog>;
}

function ServiceRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddServiceRecord(caseId);
  const [entityId, setEntityId] = useState(0); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState(''); const [isAppendix, setIsAppendix] = useState(false); const [formaDeclaracion, setFormaDeclaracion] = useState<'Documental' | 'Testifical' | null>(null);
  const reset = () => { setEntityId(0); setStartDate(''); setEndDate(''); setIsAppendix(false); setFormaDeclaracion(null); };
  // Cargar entidades del backend
  const { data: entitiesData } = useQuery({
    queryKey: ['entities', 'all'],
    queryFn: async () => { const r = await http.get<EntityListResponse>('/entities', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const entities = entitiesData?.data ?? [];
  return <Dialog open onClose={onClose} title={t('service.add')} size="lg"><div className="grid grid-cols-2 gap-3">
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('service.form.entity_id')} *</label>
      <SearchSelect
        value={entityId || undefined}
        onChange={(v) => setEntityId(Number(v) || 0)}
        options={entities.map((e) => ({ value: e.id, label: e.name ?? e.tax_id_number, secondary: e.code }))}
        placeholder={tc('actions.select')}
        required
        error={!entityId}
      /></div>
    <div><label className="block text-sm font-medium mb-1">{t('service.form.start_date')} *</label><DatePickerField value={startDate} onChange={setStartDate} /></div>
    <div><label className="block text-sm font-medium mb-1">{t('service.form.end_date')} *</label><DatePickerField value={endDate} onChange={setEndDate} /></div>
    <label className="col-span-2 flex items-center gap-2 pt-1"><input type="checkbox" checked={isAppendix} onChange={(e) => setIsAppendix(e.target.checked)} className="w-4 h-4" /><span className="text-sm">{t('service.form.is_appendix')}</span></label>
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('service.form.declaration_form')}</label>
      <SearchSelect
        value={formaDeclaracion ?? undefined}
        onChange={(v) => setFormaDeclaracion(v as 'Documental' | 'Testifical')}
        options={[
          { value: 'Documental', label: t('service.form.declaration_form_documental') },
          { value: 'Testifical', label: t('service.form.declaration_form_testifical') },
        ]}
        placeholder={tc('actions.select')}
      /></div>
    <div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button><Button disabled={!entityId || !startDate || !endDate || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ entity_id: entityId, start_date: startDate, end_date: endDate || null, is_appendix: isAppendix, declaration_form: formaDeclaracion ?? 'Documental' } as ServiceRecordInput); reset(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save_and_continue')}</Button></div>
  </div></Dialog>;
}

function WorkCycleModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddWorkCycle(caseId);
  const [planned, setPlanned] = useState(''); const [actual, setActual] = useState(''); const [count, setCount] = useState('');
  const reset = () => { setPlanned(''); setActual(''); setCount(''); };
  return <Dialog open onClose={onClose} title={t('cycle.add')} size="md"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">{t('cycle.form.planned_days')} *</label><Input type="number" min="0" value={planned} onChange={(e) => setPlanned(e.target.value)} /></div><div><label className="block text-sm font-medium mb-1">{t('cycle.form.actual_days')} *</label><Input type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} /></div><div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('cycle.form.cycles_count')} *</label><Input type="number" min="0" value={count} onChange={(e) => setCount(e.target.value)} /></div><div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button><Button disabled={!planned || !actual || !count || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ planned_days: Number(planned), actual_days: Number(actual), cycles_count: Number(count) } as WorkCycleInput); reset(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save_and_continue')}</Button></div></div></Dialog>;
}

function IncomeConceptRecordModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { t } = useTranslation('pension-cases'); const { t: tc } = useTranslation('common');
  const mutation = useAddIncomeConceptRecord(caseId);
  const [conceptId, setConceptId] = useState(0); const [appliedPercent, setAppliedPercent] = useState('');
  // resetKey fuerza el remount del CatalogSearchSelect (que mantiene estado interno)
  const [resetKey, setResetKey] = useState(0);
  const reset = () => { setConceptId(0); setAppliedPercent(''); setResetKey((k) => k + 1); };
  return <Dialog open onClose={onClose} title={t('income_concept.add')} size="md"><div className="grid grid-cols-2 gap-3">
    <div className="col-span-2"><CatalogSearchSelect
      key={`concept-${resetKey}`}
      type="income-concepts"
      label={t('income_concept.form.income_concept_id')}
      placeholder={tc('actions.search') + '…'}
      required
      onSelect={(item) => setConceptId(item.id)}
    /></div>
    <div className="col-span-2"><label className="block text-sm font-medium mb-1">{t('income_concept.form.applied_percent')} *</label><Input type="number" step="0.01" min="0" max="100" placeholder="100.00" value={appliedPercent} onChange={(e) => setAppliedPercent(e.target.value)} /></div>
    <div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button><Button disabled={!conceptId || !appliedPercent || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ income_concept_id: conceptId, applied_percent: Number(appliedPercent) } as IncomeConceptRecordInput); reset(); } catch { /* error handled by mutation.onError toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save_and_continue')}</Button></div>
  </div></Dialog>;
}
