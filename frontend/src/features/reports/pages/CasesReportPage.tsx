import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Filter, X } from 'lucide-react';
import { http } from '@/lib/http';
import { useCasesReport } from '../api/queries';
import { ExportButton } from '../components/ExportButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';

const CASE_STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'deceased'] as const;

export function CasesReportPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  // Filtros desde URL
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const officeIdRaw = searchParams.get('office_id');
  const officeId = officeIdRaw ? Number(officeIdRaw) : 0;

  // Inputs locales para edición
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  const [officeInput, setOfficeInput] = useState<number>(officeId);

  // Sync inputs cuando cambian los search params (back/forward)
  useEffect(() => {
    setFromInput(searchParams.get('from') ?? '');
    setToInput(searchParams.get('to') ?? '');
    const o = searchParams.get('office_id');
    setOfficeInput(o ? Number(o) : 0);
  }, [searchParams]);

  // Cargar oficinas para el SearchSelect
  const { data: officesData } = useQuery({
    queryKey: ['organizations', 'offices', 'all'],
    queryFn: async () => {
      const r = await http.get<{ data: { id: number; office_type?: string; municipality?: string; address?: string }[] }>('/offices', { params: { per_page: 100 } });
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const officeOptions = (officesData?.data ?? []).map((o) => ({
    value: o.id,
    label: `${o.municipality ?? '—'} · ${o.address ?? '—'}`,
    secondary: `#${o.id}`,
  }));

  const params: { from?: string; to?: string; office_id?: number } = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (officeId) params.office_id = officeId;

  const { data, isLoading, error } = useCasesReport(params);
  const rows = data?.rows ?? [];
  const totals = data?.totals ?? {};

  function applyFilters() {
    const np = new URLSearchParams();
    if (fromInput) np.set('from', fromInput);
    if (toInput) np.set('to', toInput);
    if (officeInput) np.set('office_id', String(officeInput));
    setSearchParams(np);
  }
  function clearFilters() {
    setFromInput(''); setToInput(''); setOfficeInput(0);
    setSearchParams(new URLSearchParams());
  }

  const hasActiveFilters = !!(from || to || officeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('cases.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('cases.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" />{t('common.filters')}
          </Button>
          <ExportButton defaultReport="cases" defaultFilters={params} />
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.from')}</label>
            <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.to')}</label>
            <Input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.office')}</label>
            <SearchSelect value={officeInput || undefined} onChange={(v) => setOfficeInput(Number(v) || 0)} options={officeOptions} placeholder={t('common.office_all')} />
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

      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md p-4">{t('errors.load')}</div>
      ) : isLoading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{tc('status.loading')}…</div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{t('common.no_data')}</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">{t('cases.columns.office')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('cases.columns.office_type')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('cases.columns.municipality')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('cases.columns.province')}</th>
                  {CASE_STATUSES.map((s) => (
                    <th key={s} className="text-right px-4 py-3 font-medium">{t(`cases.columns.status_${s}`)}</th>
                  ))}
                  <th className="text-right px-4 py-3 font-medium">{t('cases.columns.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.office_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.address}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.office_type}</td>
                    <td className="px-4 py-3">{r.municipality}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.province ?? '—'}</td>
                    {CASE_STATUSES.map((s) => (
                      <td key={s} className="px-4 py-3 text-right font-mono tabular-nums">{r.status_counts[s] ?? 0}</td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">{r.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-semibold border-t-2 border-border">
                  <td colSpan={4} className="px-4 py-3 text-right text-foreground">{t('common.totals')}</td>
                  {CASE_STATUSES.map((s) => (
                    <td key={s} className="px-4 py-3 text-right font-mono tabular-nums">{totals[s] ?? 0}</td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{totals.total ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
