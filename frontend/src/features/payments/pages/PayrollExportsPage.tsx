import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import { Plus, Download } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePayrollExports, useCreatePayrollExport } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { http } from '@/lib/http';
import { formatDate, formatCUP, cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const STATUS_BADGE: Record<string, string> = { queued: 'badge-submitted', processing: 'badge-under_review', completed: 'badge-approved', failed: 'badge-rejected' };

export function PayrollExportsPage() {
  const { t } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const { data, isLoading } = usePayrollExports({ page, per_page });
  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-foreground">{t('export.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('export.description')}</p></div>
        {can('payments.export') && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" />{t('export.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('export.columns.period')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('export.columns.agency')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('export.columns.status')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('export.columns.records')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('export.columns.total')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('export.columns.created_at')}</th>
            <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
            : items.map((r) => (
              <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.period ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.agency?.name ?? '—'}</td>
                <td className="px-4 py-3"><span className={cn('badge', STATUS_BADGE[r.status ?? 'queued'] ?? '')}>{t(`export.status.${r.status}`)}</span></td>
                <td className="px-4 py-3 text-right font-mono">{r.records_count ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono">{r.total_amount != null ? formatCUP(Number(r.total_amount)) : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.created_at ? formatDate(r.created_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'completed' && r.id && (
                    <button onClick={() => window.open(`${http.defaults?.baseURL ?? 'http://localhost:8000/api/v1'}/payroll-exports/${r.id}/download`, '_blank')} className="p-1.5 rounded hover:bg-muted" title={t('export.download')}>
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => { const np = new URLSearchParams(searchParams); np.set('page', String(p)); if (pp) np.set('per_page', String(pp)); setSearchParams(np); }} />}
      </div>

      {createOpen && <CreateExportModal onClose={() => setCreateOpen(false)} t={t} tc={tc} />}
    </div>
  );
}

function CreateExportModal({ onClose, t, tc }: { onClose: () => void; t: (k: string) => string; tc: (k: string) => string }) {
  const mutation = useCreatePayrollExport();
  const [agencyId, setAgencyId] = useState(0);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));

  const { data: agenciesData } = useQuery({
    queryKey: ['agencies', 'all'],
    queryFn: async () => { const r = await http.get<{ data: { id: number; code: string; name: string }[] }>('/agencies', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open onClose={onClose} title={t('export_create.title')} size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('export_create.agency')} *</label>
          <SearchSelect value={agencyId || undefined} onChange={(v) => setAgencyId(Number(v) || 0)} options={(agenciesData?.data ?? []).map((a) => ({ value: a.id, label: a.name, secondary: a.code }))} placeholder={tc('actions.select')} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('export_create.year')} *</label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('export_create.month')} *</label><Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-border"><Button variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button disabled={!agencyId || !year || !month || mutation.isPending} onClick={async () => { try { await mutation.mutateAsync({ agency_id: agencyId, year: Number(year), month: Number(month) }); onClose(); } catch { /* toast */ } }}>{mutation.isPending ? tc('status.loading') + '…' : t('export_create.confirm')}</Button></div>
      </div>
    </Dialog>
  );
}
