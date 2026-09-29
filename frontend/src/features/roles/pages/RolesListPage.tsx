import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit, Trash2, ShieldCheck, Lock } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { useRoles } from '../api/queries';
import { useDeleteRole } from '../api/mutations';
import { ROLE_LABELS } from '@/features/users/schemas/user.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { RoleFormModal } from '../components/RoleFormModal';
import type { components } from '@/types/api';

type Role = components['schemas']['Role'];

export function RolesListPage() {
  const { t } = useTranslation('roles');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const filter = searchParams.get('filter') ?? 'all';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const np = new URLSearchParams(searchParams);
    if (debouncedSearch) np.set('search', debouncedSearch); else np.delete('search');
    np.set('page', '1'); setSearchParams(np, { replace: true });
  }

  const { data, isLoading } = useRoles({ page, per_page, search: debouncedSearch || undefined, is_system: filter as 'all' | 'system' | 'custom' });
  const deleteMutation = useDeleteRole();
  const canManage = can('roles.manage');
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
        {canManage && <Button onClick={() => { setEditRole(null); setFormOpen(true); }}><Plus className="w-4 h-4" />{t('list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="text" placeholder={t('list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" /></div>
        <select value={filter} onChange={(e) => updateParams({ filter: e.target.value, page: 1 })} className="px-3 py-2 text-sm rounded-md border border-input bg-white">
          <option value="all">{t('list.filter.all')}</option>
          <option value="system">{t('list.filter.system')}</option>
          <option value="custom">{t('list.filter.custom')}</option>
        </select>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.name')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.description')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.type')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.permissions')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.users')}</th>
            {canManage && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((r) => {
              const isSystem = r.is_system === true;
              const label = ROLE_LABELS[r.name ?? ''] ?? r.name;
              return (
                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    {isSystem
                      ? <span className="badge badge-under_review"><Lock className="w-3 h-3" />{t('list.type.system')}</span>
                      : <span className="badge badge-approved"><ShieldCheck className="w-3 h-3" />{t('list.type.custom')}</span>}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{(r.permissions ?? []).length} {t('list.permissions_count')}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{r.users_count ?? 0}</span></td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditRole(r); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted" title={isSystem ? t('list.view_permissions') : tc('actions.edit')}><Edit className="w-4 h-4" /></button>
                        {!isSystem && <button onClick={() => setDeleteRole(r)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title={tc('actions.delete')}><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <RoleFormModal role={editRole ?? undefined} onClose={() => { setFormOpen(false); setEditRole(null); }} />}
      {deleteRole && (
        <Dialog open onClose={() => setDeleteRole(null)} title={t('delete.title')} description={t('delete.description', { name: deleteRole.name })} size="sm">
          <div className="space-y-4">
            <p className="text-sm">{t('delete.confirm')}</p>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteRole(null)}>{tc('actions.cancel')}</Button>
              <Button type="button" variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(deleteRole.id!); setDeleteRole(null); }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? tc('status.loading') + '…' : t('delete.confirm_button')}</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
