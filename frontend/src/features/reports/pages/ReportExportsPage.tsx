import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download } from 'lucide-react';
import { useReportExports } from '../api/queries';
import { useDownloadExportRun } from '../api/mutations';
import { ExportButton } from '../components/ExportButton';
import { Pagination } from '@/components/crud/Pagination';
import { Button } from '@/components/ui/Button';
import { formatDate, cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = {
  queued: 'badge-submitted',
  processing: 'badge-under_review',
  completed: 'badge-approved',
  failed: 'badge-rejected',
};

export function ReportExportsPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);

  const { data, isLoading, refetch, isFetching } = useReportExports({ page, per_page });
  const downloadMutation = useDownloadExportRun();

  const items = data?.data ?? [];
  const meta = data?.meta;
  const hasPending = items.some((r) => r.status === 'queued' || r.status === 'processing');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('exports.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('exports.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />{t('exports.refresh')}
          </Button>
          <ExportButton defaultReport="cases" lockReport={false} label={t('exports.new')} size="sm" />
        </div>
      </div>

      {hasPending && (
        <div className="bg-muted/60 border border-border rounded-md px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {t('exports.pending_hint')}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.id')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.report')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.format')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.status')}</th>
              <th className="text-right px-4 py-3 font-medium">{t('exports.columns.records')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.filename')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('exports.columns.created_at')}</th>
              <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">—</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{r.id}</td>
                <td className="px-4 py-3">{t(`exports.report_types.${r.report}`)}</td>
                <td className="px-4 py-3"><span className="font-mono text-xs uppercase">{r.format}</span></td>
                <td className="px-4 py-3">
                  <span className={cn('badge', STATUS_BADGE[r.status] ?? '')}>{t(`exports.status.${r.status}`)}</span>
                  {r.status === 'failed' && r.error_message && (
                    <span className="block text-xs text-destructive mt-1">{r.error_message}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">{r.records_count ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground truncate max-w-xs">{r.filename ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.created_at ? formatDate(r.created_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'completed' && (
                    <button
                      onClick={() => downloadMutation.mutate(r.id)}
                      disabled={downloadMutation.isPending}
                      className="p-1.5 rounded hover:bg-muted text-foreground disabled:opacity-50"
                      title={t('exports.download')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
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
            onChange={(p, pp) => {
              const np = new URLSearchParams(searchParams);
              np.set('page', String(p));
              if (pp) np.set('per_page', String(pp));
              setSearchParams(np);
            }}
          />
        )}
      </div>
    </div>
  );
}
