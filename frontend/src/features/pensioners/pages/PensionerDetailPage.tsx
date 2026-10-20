import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Clock, ArrowRight, GitBranch, CreditCard, Wallet } from 'lucide-react';
import { usePayments } from '@/features/payments/api/queries';
import { usePensioner, useUpdatePensionerStatus, useUpdateBankControl } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { usePermiso } from '@/hooks/use-permiso';
import { http } from '@/lib/http';
import { formatDate, formatCUP, cn } from '@/lib/utils';

type Tab = 'summary' | 'history' | 'payments';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-approved',
  suspended: 'badge-under_review',
  terminated: 'badge-rejected',
};

// Matriz del operador: qué destinos son válos desde cada estado
const STATUS_MATRIX: Record<string, Array<{ value: string; labelKey: string }>> = {
  active: [
    { value: 'suspended', labelKey: 'list.status.suspended' },
    { value: 'terminated', labelKey: 'list.status.terminated' },
  ],
  suspended: [
    { value: 'active', labelKey: 'list.status.active' },
    { value: 'terminated', labelKey: 'list.status.terminated' },
  ],
  terminated: [],
};

export function PensionerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('pensioners');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);

  const { data: pensioner, isLoading, isError } = usePensioner(id);
  const statusMutation = useUpdatePensionerStatus(id);
  const bankMutation = useUpdateBankControl(id);

  // Cargar agencias para el select de bank control
  const { data: agenciesData } = useQuery({
    queryKey: ['agencies', 'all'],
    queryFn: async () => { const r = await http.get<{ data: { id: number; code: string; name: string }[] }>('/agencies', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
    enabled: bankModalOpen,
  });

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !pensioner) return (
    <div className="max-w-7xl mx-auto text-center py-12">
      <h1 className="text-xl font-semibold text-foreground mb-2">{t('detail.not_found')}</h1>
      <Link to="/pensionados" className="text-primary hover:underline">{t('detail.back_to_list')}</Link>
    </div>
  );

  const person = pensioner.person;
  const personName = person ? [person.first_surname, person.second_surname, person.first_name, person.middle_name].filter(Boolean).join(' ') : '—';
  const canManage = can('pensioners.manage');
  const currentStatus = pensioner.status ?? 'active';
  const availableStatuses = STATUS_MATRIX[currentStatus] ?? [];

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/pensionados')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{personName}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{person?.identity_number ?? '—'} · <span className={cn('badge', STATUS_BADGE[currentStatus] ?? '')}>{t(`list.status.${currentStatus}`)}</span></p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {availableStatuses.length > 0 && (
              <Button variant="outline" onClick={() => setStatusModalOpen(true)}>
                <GitBranch className="w-4 h-4" />
                {t('status_change.button')}
              </Button>
            )}
            {currentStatus !== 'terminated' && (
              <Button variant="outline" onClick={() => setBankModalOpen(true)}>
                <CreditCard className="w-4 h-4" />
                {t('bank_control.button')}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <button onClick={() => setActiveTab('summary')} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t('detail.tabs.summary')}</button>
          <button onClick={() => setActiveTab('history')} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Clock className="w-4 h-4" />{t('detail.tabs.history')}</button>
          <button onClick={() => setActiveTab('payments')} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Wallet className="w-4 h-4" />{t('detail.tabs.payments')}</button>
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {person && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.person_data')}</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label={t('detail.fields.identity_number')} value={person.identity_number ?? '—'} mono />
                <Field label={t('detail.fields.full_name')} value={personName} />
                <Field label={t('detail.fields.sex')} value={person.sex === 'M' ? tc('people:detail.fields.sex_male') : tc('people:detail.fields.sex_female')} />
                <Field label={t('detail.fields.birth_date')} value={person.birth_date ? formatDate(person.birth_date) : '—'} />
                <Field label={t('detail.fields.address')} value={person.address ?? '—'} fullWidth />
                <Field label={t('detail.fields.deceased')} value={person.deceased ? tc('booleans.yes') : tc('booleans.no')} />
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.pension_data')}</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label={t('detail.fields.amount')} value={pensioner.amount != null ? formatCUP(Number(pensioner.amount)) : '—'} mono />
              <Field label={t('detail.fields.status')} value={t(`list.status.${currentStatus}`)} />
              <Field label={t('detail.fields.status_reason')} value={pensioner.status_reason ?? '—'} />
              <Field label={t('detail.fields.pension_type')} value={pensioner.pension_type?.name ?? '—'} />
              <Field label={t('detail.fields.pension_regime')} value={pensioner.pension_regime?.name ?? '—'} />
              <Field label={t('detail.fields.origin_case')} value={pensioner.origin_case?.number ?? '—'} mono />
              <Field label={t('detail.fields.created_at')} value={pensioner.created_at ? formatDate(pensioner.created_at) : '—'} />
              <Field label={t('detail.fields.updated_at')} value={pensioner.updated_at ? formatDate(pensioner.updated_at) : '—'} />
            </div>
          </div>
          {/* Control bancario */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.bank_controls')}</h3>
            {pensioner.bank_control ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label={t('bank_control.number')} value={`#${pensioner.bank_control.number ?? '—'}`} mono />
                <Field label={t('bank_control.agency_label')} value={pensioner.bank_control.agency ? `${pensioner.bank_control.agency.code} — ${pensioner.bank_control.agency.name}` : '—'} />
                <Field label={t('bank_control.account_label')} value={pensioner.bank_control.account ?? '—'} mono />
                <Field label={t('bank_control.electronic_payroll')} value={pensioner.bank_control.electronic_payroll ? t('bank_control.yes') : t('bank_control.no')} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t('detail.bank_controls_empty')}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="max-w-3xl">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('detail.section.status_history')}</h3>
          {(pensioner.status_history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-0">
              {(pensioner.status_history ?? []).map((row, idx) => {
                const isLast = idx === (pensioner.status_history ?? []).length - 1;
                return (
                  <div key={idx} className="relative flex gap-4 pb-6">
                    {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center z-10">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {row.from_status && <span className={cn('badge', STATUS_BADGE[row.from_status] ?? '')}>{t(`list.status.${row.from_status}`)}</span>}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className={cn('badge', STATUS_BADGE[row.to_status ?? 'active'] ?? '')}>{t(`list.status.${row.to_status}`)}</span>
                        {row.changed_at && <span className="text-xs text-muted-foreground ml-auto">{formatDate(row.changed_at)}</span>}
                      </div>
                      {row.changed_by?.name && <p className="text-xs text-muted-foreground mb-1">{row.changed_by.name}</p>}
                      {row.status_reason && <p className="text-sm text-foreground bg-muted/50 rounded-md p-2 mt-1">{row.status_reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <PensionerPaymentsTab pensionerId={id} t={t} tc={tc} />
      )}

      {/* Modal: Cambiar estado */}
      {statusModalOpen && (
        <StatusChangeModal
          caseId={id}
          currentStatus={currentStatus}
          availableStatuses={availableStatuses}
          t={t}
          tc={tc}
          onClose={() => setStatusModalOpen(false)}
          mutation={statusMutation}
        />
      )}

      {/* Modal: Control bancario */}
      {bankModalOpen && (
        <BankControlModal
          caseId={id}
          agencies={agenciesData?.data ?? []}
          currentBankControl={pensioner.bank_control as { agency?: { id: number }; account?: string } | null}
          t={t}
          tc={tc}
          onClose={() => setBankModalOpen(false)}
          mutation={bankMutation}
        />
      )}
    </div>
  );
}

function StatusChangeModal({ currentStatus: _currentStatus, availableStatuses, t, tc, onClose, mutation }: {
  caseId: string;
  currentStatus: string;
  availableStatuses: Array<{ value: string; labelKey: string }>;
  t: (key: string) => string;
  tc: (key: string) => string;
  onClose: () => void;
  mutation: ReturnType<typeof useUpdatePensionerStatus>;
}) {
  const [status, setStatus] = useState<string | null>(availableStatuses.length > 0 ? availableStatuses[0]!.value : null);
  const [reason, setReason] = useState('');
  const reasonTooShort = reason.length > 0 && reason.length < 10;
  const canSubmit = !!status && reason.length >= 10 && !mutation.isPending;

  return (
    <Dialog open onClose={onClose} title={t('status_change.title')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('status_change.status_label')} *</label>
          <SearchSelect
            value={status ?? undefined}
            onChange={(v) => setStatus(String(v))}
            options={availableStatuses.map((s) => ({ value: s.value, label: t(s.labelKey) }))}
            placeholder={tc('actions.select')}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('status_change.reason_label')} * <span className="text-xs text-muted-foreground ml-2">{t('status_change.reason_hint')}</span></label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('status_change.reason_placeholder')}
            maxLength={2000}
          />
          {reasonTooShort && <p className="text-xs text-destructive mt-1">{t('status_change.reason_too_short')}</p>}
          <p className="text-xs text-muted-foreground mt-1 text-right">{reason.length}/2000</p>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button>
          <Button disabled={!canSubmit} onClick={async () => { try { await mutation.mutateAsync({ status: status!, status_reason: reason }); onClose(); } catch { /* toast handled */ } }}>
            {mutation.isPending ? tc('status.loading') + '…' : t('status_change.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function BankControlModal({ agencies, currentBankControl, t, tc, onClose, mutation }: {
  caseId: string;
  agencies: Array<{ id: number; code: string; name: string }>;
  currentBankControl: { agency?: { id: number }; account?: string } | null;
  t: (key: string) => string;
  tc: (key: string) => string;
  onClose: () => void;
  mutation: ReturnType<typeof useUpdateBankControl>;
}) {
  const [agencyId, setAgencyId] = useState<number>(currentBankControl?.agency?.id ?? 0);
  const [account, setAccount] = useState(currentBankControl?.account ?? '');
  const canSubmit = agencyId !== 0 && account.length >= 10 && account.length <= 34 && !mutation.isPending;

  return (
    <Dialog open onClose={onClose} title={t('bank_control.title')} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('bank_control.agency_label')} *</label>
          <SearchSelect
            value={agencyId || undefined}
            onChange={(v) => setAgencyId(Number(v) || 0)}
            options={agencies.map((a) => ({ value: a.id, label: a.name, secondary: a.code }))}
            placeholder={tc('actions.select')}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('bank_control.account_label')} * <span className="text-xs text-muted-foreground ml-2">{t('bank_control.account_hint')}</span></label>
          <Input type="text" maxLength={34} value={account} onChange={(e) => setAccount(e.target.value)} placeholder="02000012345678901234" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button>
          <Button disabled={!canSubmit} onClick={async () => { try { await mutation.mutateAsync({ agency_id: agencyId, account }); onClose(); } catch { /* toast handled */ } }}>
            {mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return <div className={fullWidth ? 'col-span-2' : ''}><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p><p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value}</p></div>;
}

// Constantes para selects de año y mes
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ value: CURRENT_YEAR - i, label: String(CURRENT_YEAR - i) }));
const MONTH_OPTIONS = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];
const PAYMENT_STATUS_BADGE: Record<string, string> = { pending: 'badge-submitted', paid: 'badge-approved', cancelled: 'badge-rejected' };

/**
 * Tab Pagos del pensionado — lista los pagos del pensionado ordenados
 * cronológicamente de mayor a menor fecha, con filtros por mes, año y estado.
 */
function PensionerPaymentsTab({ pensionerId, t, tc }: { pensionerId: string; t: (k: string) => string; tc: (k: string) => string }) {
  const { t: tp } = useTranslation('payments');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Cargar TODOS los pagos del pensionado — filtramos en cliente por pensioner_id
  // El endpoint GET /payments no filtra por pensioner_id directamente en el mock,
  // pero en producción el backend podría soportarlo. Cargamos una página amplia.
  const { data, isLoading } = usePayments({
    per_page: 100,
    year: filterYear ? Number(filterYear) : undefined,
    month: filterMonth ? Number(filterMonth) : undefined,
    status: filterStatus || undefined,
  });

  // Filtrar por pensioner_id en cliente (el endpoint no lo soporta en el mock)
  const allPayments = (data?.data ?? []).filter((p) => String(p.pensioner_id) === String(pensionerId));
  // Ordenar cronológicamente de mayor a menor fecha (created_at DESC)
  allPayments.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-32">
          <SearchSelect
            value={filterYear || undefined}
            onChange={(v) => setFilterYear(String(v ?? ''))}
            options={YEAR_OPTIONS}
            placeholder="Año"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            value={filterMonth || undefined}
            onChange={(v) => setFilterMonth(String(v ?? ''))}
            options={MONTH_OPTIONS}
            placeholder="Mes"
          />
        </div>
        <div className="w-40">
          <SearchSelect
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(String(v ?? ''))}
            options={[
              { value: '', label: 'Todos' },
              { value: 'pending', label: tp('list.status.pending') },
              { value: 'paid', label: tp('list.status.paid') },
              { value: 'cancelled', label: tp('list.status.cancelled') },
            ]}
            placeholder="Todos"
          />
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{tp('list.columns.period')}</th>
              <th className="text-left px-4 py-3 font-medium">{tp('list.columns.amount')}</th>
              <th className="text-left px-4 py-3 font-medium">{tp('list.columns.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{tp('list.columns.agency')}</th>
              <th className="text-left px-4 py-3 font-medium">{tp('list.columns.created_at')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('detail.fields.paid_at') || tp('detail.fields.paid_at')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            ) : allPayments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
            ) : (
              allPayments.map((p) => {
                const agencyName = p.bank_control?.agency?.name ?? '—';
                return (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/pagos/${p.id}`}>
                    <td className="px-4 py-3 font-mono text-xs">{p.period ?? '—'}</td>
                    <td className="px-4 py-3 font-mono">{p.amount != null ? formatCUP(Number(p.amount)) : '—'}</td>
                    <td className="px-4 py-3"><span className={cn('badge', PAYMENT_STATUS_BADGE[p.status ?? 'pending'] ?? '')}>{tp(`list.status.${p.status}`)}</span></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{agencyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.created_at ? formatDate(p.created_at) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
