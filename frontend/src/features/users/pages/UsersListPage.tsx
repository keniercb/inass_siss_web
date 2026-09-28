import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit, Trash2, Lock, Unlock, RotateCcw, KeyRound } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { useUsers } from '../api/queries';
import { useDeleteUser, useRestoreUser, useUnlockUser, useResetPassword } from '../api/mutations';
import { ROLE_LABELS } from '../schemas/user.schema';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { UserFormModal } from '../components/UserFormModal';
import type { components } from '@/types/api';

type User = components['schemas']['User'];

export function UsersListPage() {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const np = new URLSearchParams(searchParams);
    if (debouncedSearch) np.set('search', debouncedSearch); else np.delete('search');
    np.set('page', '1'); setSearchParams(np, { replace: true });
  }

  const { data, isLoading } = useUsers({ page, per_page, search: debouncedSearch || undefined, status: status as 'all' | 'active' | 'inactive' | 'locked' });
  const deleteMutation = useDeleteUser();
  const restoreMutation = useRestoreUser();
  const unlockMutation = useUnlockUser();
  const resetPwdMutation = useResetPassword();
  const canManage = can('users.manage');
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
        {canManage && <Button onClick={() => { setEditUser(null); setFormOpen(true); }}><Plus className="w-4 h-4" />{t('list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="text" placeholder={t('list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" /></div>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value, page: 1 })} className="px-3 py-2 text-sm rounded-md border border-input bg-white">
          <option value="all">{t('list.filter.all')}</option>
          <option value="active">{t('list.filter.active')}</option>
          <option value="inactive">{t('list.filter.inactive')}</option>
          <option value="locked">{t('list.filter.locked')}</option>
        </select>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.name')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.email')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.roles')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
            {canManage && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((u) => (
              <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(u.roles ?? []).map((r) => <span key={r} className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">{ROLE_LABELS[r] ?? r}</span>)}</div></td>
                <td className="px-4 py-3">
                  {u.locked && <span className="badge badge-rejected"><Lock className="w-3 h-3" />{t('list.status.locked')}</span>}
                  {!u.locked && u.status === 'active' && <span className="badge badge-approved">{t('list.status.active')}</span>}
                  {!u.locked && u.status === 'inactive' && <span className="badge badge-rejected">{t('list.status.inactive')}</span>}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {u.status === 'active' && !u.locked && <button onClick={() => { setEditUser(u); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted" title={tc('actions.edit')}><Edit className="w-4 h-4" /></button>}
                      {u.locked && <button onClick={() => unlockMutation.mutate(u.id!)} className="p-1.5 rounded hover:bg-muted text-primary" title={t('unlock.title')}><Unlock className="w-4 h-4" /></button>}
                      <button onClick={() => setResetPasswordUser(u)} className="p-1.5 rounded hover:bg-muted text-primary" title={t('reset_password.title')}><KeyRound className="w-4 h-4" /></button>
                      {u.status === 'active' && <button onClick={() => setDeleteId(u.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title={tc('actions.deactivate')}><Trash2 className="w-4 h-4" /></button>}
                      {u.status === 'inactive' && <button onClick={() => restoreMutation.mutate(u.id!)} className="p-1.5 rounded hover:bg-muted text-success" title={t('restore.title')}><RotateCcw className="w-4 h-4" /></button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <UserFormModal user={editUser ?? undefined} onClose={() => { setFormOpen(false); setEditUser(null); }} />}
      {deleteId !== null && (
        <Dialog open onClose={() => setDeleteId(null)} title={t('delete.title')} size="sm">
          <div className="space-y-4"><p className="text-sm">{t('delete.confirm')}</p><div className="flex items-center justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeleteId(null)}>{tc('actions.cancel')}</Button><Button type="button" variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? tc('status.loading') + '…' : t('delete.confirm_button')}</Button></div></div>
        </Dialog>
      )}
      {resetPasswordUser && (
        <Dialog open onClose={() => { setResetPasswordUser(null); setResetPassword(''); }} title={t('reset_password.title')} description={`${t('reset_password.for_user')}: ${resetPasswordUser.name}`} size="sm">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">{t('form.new_password')} *</label><Input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" /></div>
            {resetPassword.length > 0 && resetPassword.length < 8 && <p className="text-xs text-destructive">{t('form.password_min')}</p>}
            <div className="flex items-center justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setResetPasswordUser(null); setResetPassword(''); }}>{tc('actions.cancel')}</Button><Button type="button" disabled={resetPassword.length < 8 || resetPwdMutation.isPending} onClick={async () => { await resetPwdMutation.mutateAsync({ id: resetPasswordUser.id!, input: { password: resetPassword } }); setResetPasswordUser(null); setResetPassword(''); }}>{resetPwdMutation.isPending ? tc('status.loading') + '…' : t('reset_password.confirm')}</Button></div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
