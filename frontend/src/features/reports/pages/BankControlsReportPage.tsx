import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { useBankControlsReport } from '../api/queries';
import { ExportButton } from '../components/ExportButton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function BankControlsReportPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  const year = searchParams.get('year') ?? '';
  const month = searchParams.get('month') ?? '';
  const [yearInput, setYearInput] = useState(year);
  const [monthInput, setMonthInput] = useState(month);

  useEffect(() => {
    setYearInput(searchParams.get('year') ?? '');
    setMonthInput(searchParams.get('month') ?? '');
  }, [searchParams]);

  const params: { year?: number; month?: number } = {};
  if (year) params.year = Number(year);
  if (month) params.month = Number(month);

  const { data, isLoading, error } = useBankControlsReport(params);
  const rows = data?.rows ?? [];
  const period = data?.period ?? null;

  function applyFilters() {
    const np = new URLSearchParams();
    if (yearInput) np.set('year', yearInput);
    if (monthInput) np.set('month', monthInput);
    setSearchParams(np);
  }
  function clearFilters() {
    setYearInput(''); setMonthInput('');
    setSearchParams(new URLSearchParams());
  }
  const hasActiveFilters = !!(year || month);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('bank_controls.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('bank_controls.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="w-4 h-4" />{t('common.filters')}
          </Button>
          <ExportButton defaultReport="bank-controls" defaultFilters={params} />
        </div>
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-4 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.year')}</label>
            <Input type="number" min="2000" max="2100" value={yearInput} onChange={(e) => setYearInput(e.target.value)} placeholder="2026" autoComplete="off" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('common.month')}</label>
            <Input type="number" min="1" max="12" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} placeholder="1-12" autoComplete="off" />
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

      <div className="text-xs text-muted-foreground">
        {period ? `${t('common.year')}: ${period.year} · ${t('common.month')}: ${period.month}` : t('bank_controls.no_period')}
      </div>

      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md p-4">{t('errors.load')}</div>
      ) : isLoading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{tc('status.loading')}…</div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">{t('common.no_data')}</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('bank_controls.columns.agency')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('bank_controls.columns.code')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('bank_controls.columns.province')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('bank_controls.columns.controls_total')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('bank_controls.columns.electronic_payroll')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('bank_controls.columns.manual_payroll')}</th>
                {period && (
                  <>
                    <th className="text-right px-4 py-3 font-medium">{t('bank_controls.payments.total')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('bank_controls.payments.paid')}</th>
                    <th className="text-right px-4 py-3 font-medium">{t('bank_controls.payments.pending')}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.agency_id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.province ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{r.controls_total}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{r.electronic_payroll}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{r.manual_payroll}</td>
                  {period && r.payments && (
                    <>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{r.payments.total}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{r.payments.paid}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{r.payments.pending}</td>
                    </>
                  )}
                  {period && !r.payments && <td colSpan={3} className="px-4 py-3 text-center text-muted-foreground text-xs">—</td>}
                </tr>
              ))}
            </tbody>
            {period && (
              <tfoot>
                <tr className="bg-muted/60 font-semibold border-t-2 border-border">
                  <td colSpan={3} className="px-4 py-3 text-right">{t('common.totals')}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + r.controls_total, 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + r.electronic_payroll, 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + r.manual_payroll, 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + (r.payments?.total ?? 0), 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + (r.payments?.paid ?? 0), 0)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{rows.reduce((a, r) => a + (r.payments?.pending ?? 0), 0)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
