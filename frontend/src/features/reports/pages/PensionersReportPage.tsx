import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { usePensionersReport } from '../api/queries';
import { ExportButton } from '../components/ExportButton';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { formatCUP } from '@/lib/utils';
import type { PensionerBreakdownRow } from '../api/schemas';

const STATUS_OPTIONS = [
  { value: 'active', label: 'status_active' },
  { value: 'suspended', label: 'status_suspended' },
  { value: 'terminated', label: 'status_terminated' },
] as const;

export function PensionersReportPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  const status = searchParams.get('status') ?? '';
  const [statusInput, setStatusInput] = useState<string>(status);

  useEffect(() => {
    setStatusInput(searchParams.get('status') ?? '');
  }, [searchParams]);

  const statusOptions = STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(`pensioners.filters.${o.label}`) }));

  const params: { status?: 'active' | 'suspended' | 'terminated' } = {};
  if (status === 'active' || status === 'suspended' || status === 'terminated') {
    params.status = status;
  }

  const { data, isLoading, error } = usePensionersReport(params);

  function applyFilters() {
    const np = new URLSearchParams();
    if (statusInput) np.set('status', statusInput);
    setSearchParams(np);
  }
  function clearFilters() {
    setStatusInput('');
    setSearchParams(new URLSearchParams());
  }
  const hasActiveFilters = !!status;

  function renderBreakdownTable(title: string, items: PensionerBreakdownRow[]) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">{t('common.no_data')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">{t('pensioners.tables.columns.label')}</th>
                <th className="text-right px-4 py-2 font-medium">{t('pensioners.tables.columns.count')}</th>
                <th className="text-right px-4 py-2 font-medium">{t('pensioners.tables.columns.total_amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((row) => (
                <tr key={`${row.key ?? 'null'}-${row.label}`} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2">{row.label}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{row.count}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCUP(Number(row.total_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('pensioners.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('pensioners.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" />{t('common.filters')}
          </Button>
          <ExportButton defaultReport="pensioners" defaultFilters={params} />
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.status')}</label>
            <SearchSelect value={statusInput || undefined} onChange={(v) => setStatusInput(String(v ?? ''))} options={statusOptions} placeholder={t('common.status_all')} />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4" />{t('common.clear')}
              </Button>
            )}
            <Button size="sm" onClick={applyFilters}>{t('common.apply')}</Button>
          </div>
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
          <div className="grid sm:grid-cols-2 gap-4">
            {renderBreakdownTable(t('pensioners.tables.by_province'), data.by_province)}
            {renderBreakdownTable(t('pensioners.tables.by_pension_type'), data.by_pension_type)}
          </div>
          {renderBreakdownTable(t('pensioners.tables.by_regime'), data.by_regime)}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">{t('common.totals')}</span>
            <div className="flex gap-6 text-sm">
              <span><span className="text-muted-foreground">{t('pensioners.tables.columns.count')}: </span><span className="font-mono font-semibold">{data.totals.count}</span></span>
              <span><span className="text-muted-foreground">{t('pensioners.tables.columns.total_amount')}: </span><span className="font-mono font-semibold">{formatCUP(Number(data.totals.total_amount))}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
