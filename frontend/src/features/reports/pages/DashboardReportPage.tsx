import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { useDashboardReport } from '../api/queries';
import { ExportButton } from '../components/ExportButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';

export function DashboardReportPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  useEffect(() => {
    setFromInput(searchParams.get('from') ?? '');
    setToInput(searchParams.get('to') ?? '');
  }, [searchParams]);

  const params: { from?: string; to?: string } = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const { data, isLoading, error } = useDashboardReport(params);
  const workload = data?.workload ?? [];
  const global = data?.global;
  const window = data?.window;
  const generatedAt = data?.generated_at;

  function applyFilters() {
    const np = new URLSearchParams();
    if (fromInput) np.set('from', fromInput);
    if (toInput) np.set('to', toInput);
    setSearchParams(np);
  }
  function clearFilters() {
    setFromInput(''); setToInput('');
    setSearchParams(new URLSearchParams());
  }
  const hasActiveFilters = !!(from || to);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('dashboard.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('dashboard.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" />{t('common.filters')}
          </Button>
          <ExportButton defaultReport="dashboard" defaultFilters={params} />
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.from')}</label>
            <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.to')}</label>
            <Input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} autoComplete="off" />
          </div>
          <div className="flex gap-2 justify-end">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4" />{t('common.clear')}
              </Button>
            )}
            <Button size="sm" onClick={applyFilters}>{t('common.apply')}</Button>
          </div>
        </div>
      )}

      {window && (
        <div className="text-xs text-muted-foreground">
          {t('dashboard.window')}: {window.from} → {window.to}{generatedAt && ` · ${t('common.generated_at')}: ${formatDate(generatedAt)}`}
        </div>
      )}

      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md p-4">{t('errors.load')}</div>
      ) : isLoading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{tc('status.loading')}…</div>
      ) : !data ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{t('common.no_data')}</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
            <div className="px-4 py-2 bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('dashboard.workload.title')}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">{t('dashboard.workload.columns.office')}</th>
                  <th className="text-left px-4 py-2 font-medium">{t('dashboard.workload.columns.office_type')}</th>
                  <th className="text-left px-4 py-2 font-medium">{t('dashboard.workload.columns.municipality')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('dashboard.workload.columns.open_cases')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('dashboard.workload.columns.average_processing_days')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('dashboard.workload.columns.approval_rate')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('dashboard.workload.columns.approved')}</th>
                  <th className="text-right px-4 py-2 font-medium">{t('dashboard.workload.columns.rejected')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workload.map((r) => (
                  <tr key={r.office_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-2 font-medium">{r.municipality}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.office_type}</td>
                    <td className="px-4 py-2">{r.municipality}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{r.open_cases}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{r.average_processing_days ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{r.approval_rate ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{r.approved}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{r.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {global && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t('dashboard.global.title')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <GlobalStat label={t('dashboard.global.open_cases')} value={String(global.open_cases)} />
                <GlobalStat label={t('dashboard.global.approved')} value={String(global.approved)} />
                <GlobalStat label={t('dashboard.global.rejected')} value={String(global.rejected)} />
                <GlobalStat label={t('dashboard.global.average_processing_days')} value={global.average_processing_days ?? '—'} />
                <GlobalStat label={t('dashboard.global.approval_rate')} value={global.approval_rate ?? '—'} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GlobalStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-mono font-semibold text-foreground mt-1">{value}</div>
    </div>
  );
}
