import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { useOffices } from '../api/queries';
import { useCreateOffice, useUpdateOffice, useDeleteOffice } from '../api/mutations';
import { officeSchema, type OfficeInput } from '../schemas/organization.schema';
import { useToast } from '@/components/ui/Toast';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import { handleFormError } from '@/lib/backend-errors';
import type { Office } from '@/types/domain';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

interface CatalogItem { id: number; name: string; }
interface CatalogListResponse { data: CatalogItem[]; }

export function OfficesListPage() {
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editOffice, setEditOffice] = useState<Office | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) newParams.set('search', debouncedSearch); else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  const { data, isLoading } = useOffices({ page, per_page, search: debouncedSearch || undefined });
  const deleteMutation = useDeleteOffice();
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
        <div><h1 className="text-2xl font-semibold text-foreground">{t('offices.list.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('offices.list.description')}</p></div>
        {canManage && <Button onClick={() => { setEditOffice(null); setFormOpen(true); }}><Plus className="w-4 h-4" />{t('offices.list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4">
        <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="text" placeholder={t('offices.list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" /></div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('offices.list.columns.type')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('offices.list.columns.province')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('offices.list.columns.municipality')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('offices.list.columns.address')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('offices.list.columns.cases_count')}</th>
            <th className="text-right px-4 py-3 font-medium">{t('offices.list.columns.scope_cases_count')}</th>
            {canManage && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t('offices.list.empty')}</td></tr>
            : items.map((o) => (
              <tr key={o.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">{o.type?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.province?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.municipality?.name ?? '—'}</td>
                <td className="px-4 py-3">{o.address}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{o.cases_count ?? '—'}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{o.scope_cases_count ?? '—'}</td>
                {canManage && <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-1"><button onClick={() => { setEditOffice(o); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteId(o.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <OfficeFormModal office={editOffice} onClose={() => { setFormOpen(false); setEditOffice(null); }} />}
      {deleteId !== null && (
        <Dialog open onClose={() => setDeleteId(null)} title={t('offices.delete.title')} size="sm">
          <div className="space-y-4"><p className="text-sm">{t('offices.delete.confirm')}</p><div className="flex items-center justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeleteId(null)}>{tc('actions.cancel')}</Button><Button type="button" variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(deleteId); setDeleteId(null); }} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? tc('status.loading') + '…' : t('offices.delete.confirm_button')}</Button></div></div>
        </Dialog>
      )}
    </div>
  );
}

function OfficeFormModal({ office, onClose }: { office: Office | null; onClose: () => void }) {
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const isEdit = !!office;
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const { data: provincesData } = useQuery({ queryKey: ['catalogs', 'provinces', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/provinces', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(office?.province?.id ?? null);
  const { data: municipalitiesData } = useQuery({ queryKey: ['municipalities', 'list', { province_id: selectedProvinceId }], queryFn: async () => { if (!selectedProvinceId) return { data: [] as CatalogItem[] }; const r = await http.get<CatalogListResponse>('/municipalities', { params: { per_page: 100, province_id: selectedProvinceId } }); return r.data; }, enabled: !!selectedProvinceId });

  const form = useForm<OfficeInput>({ resolver: zodResolver(officeSchema), defaultValues: office ? { office_type_id: office.type?.id ?? 0, province_id: office.province?.id ?? 0, municipality_id: office.municipality?.id ?? 0, address: office.address, parent_office_id: office.parent_office_id ?? null } : { office_type_id: 0, province_id: 0, municipality_id: 0, address: '', parent_office_id: null } });
  useEffect(() => { if (!isEdit) form.setValue('municipality_id', 0); }, [selectedProvinceId, form, isEdit]);

  const onSubmit = form.handleSubmit(async (input) => {
    try { if (isEdit && office) { await updateMutation.mutateAsync({ id: office.id!, input }); } else { await createMutation.mutateAsync(input); } onClose(); } catch (err) { handleFormError(err, form, toast, t(isEdit ? 'offices.update.error' : 'offices.create.error')); }
  });

  const selectClass = cn('flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50');
  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'offices.edit.title' : 'offices.create.title')} description={t(isEdit ? 'offices.edit.description' : 'offices.create.description')} size="md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <CatalogSearchSelect
          type="office-types"
          label={t('offices.form.office_type')}
          placeholder={tc('actions.search') + '…'}
          required
          initialDisplayValue={office?.type?.name}
          initialSelectedId={office?.type?.id}
          onSelect={(item) => form.setValue('office_type_id', item.id)}
        />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('offices.form.province')} *</label><select className={selectClass} disabled={isEdit} value={selectedProvinceId ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setSelectedProvinceId(v); form.setValue('province_id', v ?? 0); }}><option value="">{tc('actions.select')}</option>{(provincesData?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">{t('offices.form.municipality')} *</label><select className={selectClass} disabled={!selectedProvinceId} {...form.register('municipality_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}><option value="">{!selectedProvinceId ? t('agencies.form.select_province_first') : tc('actions.select')}</option>{(municipalitiesData?.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        </div>
        <div><label className="block text-sm font-medium mb-1">{t('offices.form.address')} *</label><Input type="text" error={!!form.formState.errors.address} {...form.register('address')} /></div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border"><Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div>
      </form>
    </Dialog>
  );
}
