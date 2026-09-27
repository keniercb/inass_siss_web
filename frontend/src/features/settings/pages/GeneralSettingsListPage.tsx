import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useGeneralSettings } from '../api/queries';
import { useDeleteSetting } from '../api/mutations';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { formatEffectiveDate } from '../schemas/general-settings.schema';
import { GeneralSettingFormModal } from '../components/GeneralSettingFormModal';

export function GeneralSettingsListPage() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, isError } = useGeneralSettings({ page, per_page: 15 });
  const deleteMutation = useDeleteSetting();

  const today = new Date().toISOString().split('T')[0] ?? '';

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p>
        </div>
        {can('settings.manage') && (
          <Button onClick={() => setFormOpen(true)}>
            <span className="w-4 h-4">+</span>
            {t('list.new')}
          </Button>
        )}
      </div>

      {/* Vigente actual (destacado) */}
      <div className="bg-primary/10 border-l-4 border-primary rounded-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('current.title')}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('current.description')}</p>
      </div>

      {/* Tabla de versiones */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.effective_from')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.min_work_years')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.min_age')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.percents')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
              {can('settings.manage') && (
                <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {tc('status.loading')}…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-destructive">
                  {tc('errors.server')}
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t('list.empty')}
                </td>
              </tr>
            ) : (
              data?.data.map((version) => {
                const isCurrent = version.effective_from <= today;
                const isFuture = version.effective_from > today;
                return (
                  <tr key={version.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{formatEffectiveDate(version.effective_from)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{version.min_work_years}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs">{t('list.columns.men')}: {version.min_age_men}</span>
                      <span className="text-xs ml-3">{t('list.columns.women')}: {version.min_age_women}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs">Base: {version.base_calc_percent}%</span>
                      <span className="text-xs ml-2">Max: {version.max_calc_percent}%</span>
                      <span className="text-xs ml-2 text-muted-foreground">
                        Inc: {version.annual_increase_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          {t('list.status.current')}
                        </span>
                      ) : isFuture ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Calendar className="w-3 h-3" />
                          {t('list.status.future')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {t('list.status.past')}
                        </span>
                      )}
                    </td>
                    {can('settings.manage') && (
                      <td className="px-4 py-3 text-right">
                        {isFuture ? (
                          <button
                            onClick={() => setDeleteId(version.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                            title={t('delete.title')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t('list.cannot_delete_in_effect')}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginación simple */}
        {data && data.meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {tc('pagination.page')} {data.meta.current_page} {tc('pagination.of_pages')} {data.meta.last_page} — {data.meta.total} {tc('pagination.results')}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.meta.current_page <= 1}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={data.meta.current_page >= data.meta.last_page}
              >
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de creación */}
      {formOpen && <GeneralSettingFormModal onClose={() => setFormOpen(false)} />}

      {/* Modal de eliminación */}
      {deleteId !== null && (
        <Dialog
          open
          onClose={() => setDeleteId(null)}
          title={t('delete.title')}
          description={t('delete.description')}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{t('delete.confirm')}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deleteId);
                  setDeleteId(null);
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? tc('status.loading') + '…' : t('delete.confirm_button')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
