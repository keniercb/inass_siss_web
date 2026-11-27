import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Eye } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePaymentInstruments } from '../api/queries';
import { INSTRUMENT_STATUSES, INSTRUMENT_TYPES, type InstrumentStatus } from '../api/schemas';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Pagination } from '@/components/crud/Pagination';
import { formatDate, formatCUP, cn } from '@/lib/utils';
import { PaymentInstrumentFormModal } from '../components/PaymentInstrumentFormModal';

/** Badges por estado: reutiliza las clases de badge existentes del sistema. */
const STATUS_BADGE: Record<InstrumentStatus, string> = {
  created: 'badge-submitted',
  pending: 'badge-under_review',
  paid: 'badge-approved',
  expired: 'badge-rejected',
  cancelled: 'badge-deceased',
};

export function PaymentInstrumentsListPage() {
  const { t } = useTranslation('payment-instruments');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';
  const pensionerId = searchParams.get('pensioner_id') ?? '';

  const { data, isLoading } = usePaymentInstruments({
    page,
    per_page,
    status: (status || undefined) as InstrumentStatus | undefined,
    type: (type || undefined) as 'provisional_payment' | 'electronic_check' | undefined,
    pensioner_id: pensionerId ? Number(pensionerId) : undefined,
  });
  const items = data?.data ?? [];
  const meta = data?.meta;

  const statusOptions = INSTRUMENT_STATUSES.map((s) => ({ value: s, label: t(`list.status.${s}`) }));
  const typeOptions = INSTRUMENT_TYPES.map((tp) => ({ value: tp, label: t(`list.type.${tp}`) }));

  const updateParams = (patch: Record<string, string | number>) => {
    const np = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => { if (!v) np.delete(k); else np.set(k, String(v)); });
    setSearchParams(np);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p>
        </div>
        {can('payments.manage') && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />{t('list.new')}
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="w-44">
          <SearchSelect
            value={status || undefined}
            onChange={(v) => updateParams({ status: String(v ?? ''), page: 1 })}
            options={statusOptions}
            placeholder={t('list.filters.status_all')}
          />
        </div>
        <div className="w-52">
          <SearchSelect
            value={type || undefined}
            onChange={(v) => updateParams({ type: String(v ?? ''), page: 1 })}
            options={typeOptions}
            placeholder={t('list.filters.type_all')}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.id')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.pensioner')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.beneficiary')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.type')}</th>
              <th className="text-right px-4 py-3 font-medium">{t('list.columns.amount')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.set_expired_at')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.created_at')}</th>
              <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            ) : items.map((inst) => (
              <tr key={inst.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{inst.id}</td>
                <td className="px-4 py-3 font-medium">{inst.pensioner?.person?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{inst.beneficiary?.full_name ?? '—'}</td>
                <td className="px-4 py-3">{inst.type ? t(`list.type.${inst.type}`) : '—'}</td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCUP(Number(inst.amount))}</td>
                <td className="px-4 py-3">
                  <span className={cn('badge', STATUS_BADGE[inst.status] ?? '')}>{t(`list.status.${inst.status}`)}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{inst.set_expired_at ? formatDate(inst.set_expired_at) : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{inst.created_at ? formatDate(inst.created_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/instrumentos/${inst.id}`)}
                    className="p-1.5 rounded hover:bg-muted"
                    title={tc('actions.view')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.total > 0 && (
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            perPage={meta.per_page}
            total={meta.total}
            onChange={(p, pp) => updateParams(pp ? { page: p, per_page: pp } : { page: p })}
          />
        )}
      </div>

      {createOpen && <PaymentInstrumentFormModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
