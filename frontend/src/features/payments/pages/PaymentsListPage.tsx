import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePayments, useGeneratePayments } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, formatCUP, cn } from '@/lib/utils';
import { http } from '@/lib/http';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-submitted',
  paid: 'badge-approved',
  cancelled: 'badge-rejected',
  provitional: 'badge-under_review',
  expired: 'badge-rejected',
};

interface AgencyListItem { id: number; code: string; name: string; }
interface AgencyListResponse { data: AgencyListItem[]; }

// Tipos de la nueva respuesta del POST /payments/generate (Task 68/SGP-52)
interface GenerateResponsePayment {
  payment_id: number;
  payment_form: 'tarjeta magnetica' | 'nomina electronica';
  created: boolean;
}
interface GenerateResponse {
  period: string;
  payments: GenerateResponsePayment[];
  pensioner_payments: {
    created_count: number;
    skipped_count: number;
    skipped_no_control: number;
  };
}

export function PaymentsListPage() {
  const { t } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [lastGenerateResult, setLastGenerateResult] = useState<GenerateResponse | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const status = searchParams.get('status') ?? '';
  const year = searchParams.get('year') ?? '';
  const month = searchParams.get('month') ?? '';
  const paymentForm = searchParams.get('payment_form') ?? '';
  const agencyId = searchParams.get('agency_id') ?? '';

  const { data, isLoading } = usePayments({
    page, per_page,
    status: status || undefined,
    year: year ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
    payment_form: paymentForm || undefined,
    agency_id: agencyId ? Number(agencyId) : undefined,
  });
  const items = data?.data ?? [];
  const meta = data?.meta;

  // Catálogo de agencias para el filtro (carga perezosa, solo si el usuario usa el filtro)
  const { data: agenciesData } = useQuery<AgencyListResponse>({
    queryKey: ['agencies', 'filter'],
    queryFn: async () => { const r = await http.get<AgencyListResponse>('/agencies', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  const updateParams = (patch: Record<string, string | number>) => {
    const np = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => { if (!v) np.delete(k); else np.set(k, String(v)); });
    setSearchParams(np);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p></div>
        {can('payments.manage') && <Button onClick={() => setGenerateOpen(true)}><Plus className="w-4 h-4" />{t('list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="w-32">
          <SearchSelect value={year || undefined} onChange={(v) => updateParams({ year: String(v ?? ''), page: 1 })} options={Array.from({ length: 10 }, (_, i) => ({ value: new Date().getFullYear() - i, label: String(new Date().getFullYear() - i) }))} placeholder="Año" />
        </div>
        <div className="w-40">
          <SearchSelect value={month || undefined} onChange={(v) => updateParams({ month: String(v ?? ''), page: 1 })} options={[{ value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' }, { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }]} placeholder="Mes" />
        </div>
        <div className="w-48">
          <SearchSelect
            value={status || undefined}
            onChange={(v) => updateParams({ status: String(v ?? ''), page: 1 })}
            options={[
              { value: '', label: t('list.filters.payment_form_all') },
              { value: 'pending', label: t('list.status.pending') },
              { value: 'provitional', label: t('list.status.provitional') },
              { value: 'paid', label: t('list.status.paid') },
              { value: 'expired', label: t('list.status.expired') },
              { value: 'cancelled', label: t('list.status.cancelled') },
            ]}
            placeholder="Todos"
          />
        </div>
        <div className="w-56">
          <SearchSelect
            value={paymentForm || undefined}
            onChange={(v) => updateParams({ payment_form: String(v ?? ''), page: 1 })}
            options={[
              { value: '', label: t('list.filters.payment_form_all') },
              { value: 'tarjeta magnetica', label: t('list.filters.payment_form_tarjeta') },
              { value: 'nomina electronica', label: t('list.filters.payment_form_nomina') },
            ]}
            placeholder={t('list.filters.payment_form')}
          />
        </div>
        <div className="w-56">
          <SearchSelect
            value={agencyId || undefined}
            onChange={(v) => updateParams({ agency_id: String(v ?? ''), page: 1 })}
            options={[
              { value: '', label: t('list.filters.agency_all') },
              ...((agenciesData?.data ?? []).map((a) => ({ value: a.id, label: a.name, secondary: a.code }))),
            ]}
            placeholder={t('list.filters.agency')}
          />
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.pensioner')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.period')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.payment_form')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.amount')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.agency')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.created_at')}</th>
            <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((p) => {
              const personName = p.pensioner?.person?.full_name ?? '—';
              const frozenAgencyName = p.agency?.name ?? '—';
              const paymentFormLabel = p.payment?.payment_form
                ? (p.payment.payment_form === 'tarjeta magnetica' ? t('list.filters.payment_form_tarjeta') : t('list.filters.payment_form_nomina'))
                : '—';
              return (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/pagos/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{personName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.payment?.period ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{paymentFormLabel}</td>
                  <td className="px-4 py-3 font-mono">{p.amount != null ? formatCUP(Number(p.amount)) : '—'}</td>
                  <td className="px-4 py-3"><span className={cn('badge', STATUS_BADGE[p.status ?? 'pending'] ?? '')}>{t(`list.status.${p.status}`)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{frozenAgencyName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.created_at ? formatDate(p.created_at) : '—'}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => navigate(`/pagos/${p.id}`)} className="p-1.5 rounded hover:bg-muted" title={tc('actions.view')}><Eye className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>

      {/* Modal: Generar pagos */}
      {generateOpen && (
        <GenerateModal
          onClose={() => setGenerateOpen(false)}
          onResult={(result) => setLastGenerateResult(result)}
          t={t}
          tc={tc}
        />
      )}
      {/* Modal: Resumen de la generación (desglose a dos niveles) */}
      {lastGenerateResult && (
        <GenerateResultModal
          result={lastGenerateResult}
          onClose={() => setLastGenerateResult(null)}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

function GenerateModal({ onClose, onResult, t, tc }: {
  onClose: () => void;
  onResult: (result: GenerateResponse) => void;
  t: (k: string) => string;
  tc: (k: string) => string;
}) {
  const mutation = useGeneratePayments();

  const handleGenerate = async () => {
    try {
      // Task 71/SGP-55: el período se resuelve AUTOMÁTICO en el servidor (mes siguiente).
      const r = await mutation.mutateAsync();
      const data = (r?.data ?? r) as GenerateResponse;
      onClose();
      if (data && data.payments && data.pensioner_payments) {
        onResult(data);
      }
    } catch {
      /* el toast de error lo muestra el mutation.onError */
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('generate.title')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('generate.description')}</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={mutation.isPending} onClick={handleGenerate}>
            {mutation.isPending ? tc('status.loading') + '…' : t('generate.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function GenerateResultModal({ result, onClose, t, tc }: {
  result: GenerateResponse;
  onClose: () => void;
  t: (k: string) => string;
  tc: (k: string) => string;
}) {
  return (
    <Dialog open onClose={onClose} title={t('generate.success')} size="md">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t('generate.result.period')}</p>
          <p className="text-sm font-mono text-foreground">{result.period}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{t('generate.result.anchor_payments')}</p>
          <ul className="space-y-1">
            {result.payments.map((p) => {
              const formLabel = p.payment_form === 'tarjeta magnetica' ? t('list.filters.payment_form_tarjeta') : t('list.filters.payment_form_nomina');
              return (
                <li key={p.payment_id} className="text-sm flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">#{p.payment_id}</span>
                  <span className="text-foreground">{formLabel}</span>
                  <span className={cn('badge', p.created ? 'badge-approved' : 'badge-under_review')}>
                    {p.created ? t('generate.result.form_created') : t('generate.result.form_existing')}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{t('generate.result.pensioner_payments')}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">{t('generate.result.created')}</p>
              <p className="text-lg font-semibold text-foreground">{result.pensioner_payments.created_count}</p>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">{t('generate.result.skipped')}</p>
              <p className="text-lg font-semibold text-foreground">{result.pensioner_payments.skipped_count}</p>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">{t('generate.result.skipped_no_control')}</p>
              <p className="text-lg font-semibold text-foreground">{result.pensioner_payments.skipped_no_control}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{tc('actions.close')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
