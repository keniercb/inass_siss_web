import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Eye } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePayments, useGeneratePayments } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { formatDate, formatCUP, cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = { pending: 'badge-submitted', paid: 'badge-approved', cancelled: 'badge-rejected' };

export function PaymentsListPage() {
  const { t } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [generateOpen, setGenerateOpen] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const status = searchParams.get('status') ?? '';
  const year = searchParams.get('year') ?? '';
  const month = searchParams.get('month') ?? '';

  const { data, isLoading } = usePayments({ page, per_page, status: status || undefined, year: year ? Number(year) : undefined, month: month ? Number(month) : undefined });
  const items = data?.data ?? [];
  const meta = data?.meta;

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
          <SearchSelect value={status || undefined} onChange={(v) => updateParams({ status: String(v ?? ''), page: 1 })} options={[{ value: '', label: 'Todos' }, { value: 'pending', label: t('list.status.pending') }, { value: 'paid', label: t('list.status.paid') }, { value: 'cancelled', label: t('list.status.cancelled') }]} placeholder="Todos" />
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.pensioner')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.period')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.amount')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.agency')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.created_at')}</th>
            <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((p) => {
              const personName = p.pensioner?.person?.full_name ?? '—';
              const agencyName = p.bank_control?.agency?.name ?? '—';
              return (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/pagos/${p.id}`)}>
                  <td className="px-4 py-3 font-medium">{personName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.period ?? '—'}</td>
                  <td className="px-4 py-3 font-mono">{p.amount != null ? formatCUP(Number(p.amount)) : '—'}</td>
                  <td className="px-4 py-3"><span className={cn('badge', STATUS_BADGE[p.status ?? 'pending'] ?? '')}>{t(`list.status.${p.status}`)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{agencyName}</td>
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
      {generateOpen && <GenerateModal onClose={() => setGenerateOpen(false)} t={t} tc={tc} />}
    </div>
  );
}

function GenerateModal({ onClose, t, tc }: { onClose: () => void; t: (k: string) => string; tc: (k: string) => string }) {
  const mutation = useGeneratePayments();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  return (
    <Dialog open onClose={onClose} title={t('generate.title')} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('generate.year')} *</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('generate.month')} *</label><Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!year || !month || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ year: Number(year), month: Number(month) }); onClose(); } catch { /* toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : t('generate.confirm')}</Button></div>
      </div>
    </Dialog>
  );
}
