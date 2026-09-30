import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { useEntities } from '../api/queries';
import { useDeleteEntity } from '../api/mutations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { EntityFormModal } from '../components/EntityFormModal';

export function EntitiesListPage() {
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'code';
  const order = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) newParams.set('search', debouncedSearch); else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  const { data, isLoading, isError } = useEntities({ page, per_page, search: debouncedSearch || undefined, sort, order });
  const deleteMutation = useDeleteEntity();
  const canManage = can('organizations.manage');
  const items = data?.data ?? [];
  const meta = data?.meta;

  const updateParams = (patch: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v === undefined || v === null) newParams.delete(k); else newParams.set(k, String(v)); });
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('entities.list.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('entities.list.description')}</p>
        </div>
        {canManage && <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />{t('entities.list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder={t('entities.list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.code')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.tax_id_number')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.organization')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.type')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.location')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.director')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('entities.list.columns.contact')}</th>
              {(canManage || can('organizations.view')) && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (<tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>)
            : isError ? (<tr><td colSpan={8} className="px-4 py-8 text-center text-destructive">{tc('errors.server')}</td></tr>)
            : items.length === 0 ? (<tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('entities.list.empty')}</td></tr>)
            : items.map((e) => {
              const directorName = e.director ? `${e.director.first_surname ?? ''} ${e.director.first_name ?? ''}`.trim() : null;
              const contact = [e.phone, e.email].filter(Boolean).join(' · ') || null;
              return (
              <tr key={e.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/entidades/${e.id}`)}>
                <td className="px-4 py-3 font-mono text-xs">{e.code}</td>
                <td className="px-4 py-3 font-medium font-mono text-xs">{e.tax_id_number}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.organization?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.entity_type?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.province?.name}{e.municipality ? `, ${e.municipality.name}` : ''}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{directorName ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{contact ?? '—'}</td>
                <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <button onClick={() => navigate(`/entidades/${e.id}`)} className="p-1.5 rounded hover:bg-muted" title={tc('actions.view')}><Eye className="w-4 h-4" /></button>
                    {canManage && <>
                      <button onClick={() => setFormOpen(true)} className="p-1.5 rounded hover:bg-muted" title={tc('actions.edit')}><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title={tc('actions.deactivate')}><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <EntityFormModal onClose={() => setFormOpen(false)} />}
      {deleteId !== null && (
        <Dialog open onClose={() => setDeleteId(null)} title={t('entities.delete.title')} description={t('entities.delete.description')} size="sm">
          <div className="space-y-4">
            <p className="text-sm">{t('entities.delete.confirm')}</p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>{tc('actions.cancel')}</Button>
              <Button type="button" variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? tc('status.loading') + '…' : t('entities.delete.confirm_button')}</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
