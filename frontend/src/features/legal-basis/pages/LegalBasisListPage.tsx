import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { http } from '@/lib/http';
import { formatDate } from '@/lib/utils';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import { legalBasisSchema, type LegalBasisInput } from '../schemas/legal-basis.schema';
import type { LegalBasis } from '@/types/domain';
import type { AxiosError } from 'axios';

interface ApiResponse<T> { data: T; }
interface PaginatedResponse<T> { data: T[]; meta: { current_page: number; per_page: number; total: number; last_page: number }; }

export function LegalBasisListPage() {
  const { t } = useTranslation('legal-basis');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<LegalBasis | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) newParams.set('search', debouncedSearch); else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  const { data, isLoading } = useQuery({
    queryKey: ['legal-bases', 'list', { page, per_page, search: debouncedSearch, status }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page, search: debouncedSearch || undefined };
      if (status === 'vigent') params.derogation_date = 'null';
      if (status === 'derogated') params.has_derogation = 'true';
      const r = await http.get<PaginatedResponse<LegalBasis>>('/legal-bases', { params });
      return r.data;
    },
    placeholderData: (prev) => prev,
  });

  const updateParams = (patch: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v === undefined || v === null) newParams.delete(k); else newParams.set(k, String(v)); });
    setSearchParams(newParams);
  };

  const items = data?.data ?? [];
  const meta = data?.meta;
  const canManage = can('legalbases.manage');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1><p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p></div>
        {canManage && <Button onClick={() => { setEditItem(null); setFormOpen(true); }}><Plus className="w-4 h-4" />{t('list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="text" placeholder={t('list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" /></div>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value, page: 1 })} className="px-3 py-2 text-sm rounded-md border border-input bg-white">
          <option value="all">{t('list.filter.all')}</option>
          <option value="vigent">{t('list.filter.vigent')}</option>
          <option value="derogated">{t('list.filter.derogated')}</option>
        </select>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.type')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.number')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.year')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.issuing_organization')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.effective_date')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.reference')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
            {canManage && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((lb) => {
              const isVigent = !lb.derogation_date;
              return (
                <tr key={lb.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">{lb.legal_basis_type?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{lb.number}</td>
                  <td className="px-4 py-3">{lb.year}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lb.issuing_organization?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(lb.effective_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{lb.reference ?? '—'}</td>
                  <td className="px-4 py-3">{isVigent ? <span className="badge badge-approved"><CheckCircle className="w-3 h-3" />{t('list.status.vigent')}</span> : <span className="badge badge-rejected">{t('list.status.derogated')}</span>}</td>
                  {canManage && <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-1"><button onClick={() => { setEditItem(lb); setFormOpen(true); }} className="p-1.5 rounded hover:bg-muted"><Edit className="w-4 h-4" /></button><button onClick={() => setDeleteId(lb.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button></div></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <LegalBasisFormModal item={editItem} onClose={() => { setFormOpen(false); setEditItem(null); }} />}
      {deleteId !== null && (
        <Dialog open onClose={() => setDeleteId(null)} title={t('delete.title')} size="sm">
          <div className="space-y-4"><p className="text-sm">{t('delete.confirm')}</p><div className="flex items-center justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeleteId(null)}>{tc('actions.cancel')}</Button><Button type="button" variant="destructive" onClick={async () => { await http.delete(`/legal-bases/${deleteId}`); setDeleteId(null); }} >{t('delete.confirm_button')}</Button></div></div>
        </Dialog>
      )}
    </div>
  );
}

function LegalBasisFormModal({ item, onClose }: { item: LegalBasis | null; onClose: () => void }) {
  const { t } = useTranslation('legal-basis');
  const { t: tc } = useTranslation('common');
  const isEdit = !!item;
  const queryClient = useQueryClient();
  const toast = useToast();

  const form = useForm<LegalBasisInput>({ resolver: zodResolver(legalBasisSchema), defaultValues: item ? { legal_basis_type_id: item.legal_basis_type_id, number: item.number, issue_date: item.issue_date, effective_date: item.effective_date, derogation_date: item.derogation_date ?? '', issuing_organization_id: item.issuing_organization_id, reference: item.reference ?? '' } : { legal_basis_type_id: 0, number: '', issue_date: '', effective_date: '', derogation_date: '', issuing_organization_id: 0, reference: '' } });

  const mutation = useMutation({
    mutationFn: async (input: LegalBasisInput) => { if (isEdit && item) { const r = await http.patch<ApiResponse<LegalBasis>>(`/legal-bases/${item.id}`, input); return r.data.data; } else { const r = await http.post<ApiResponse<LegalBasis>>('/legal-bases', input); return r.data.data; } },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['legal-bases', 'list'] }); toast.success(t(isEdit ? 'update.success' : 'create.success')); onClose(); },
    onError: (err: unknown) => {
      // 422: mapear a campos del form + toast resumen
      if (err instanceof Error && 'response' in err) {
        const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
        if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
          Object.entries(axiosErr.response.data.errors).forEach(([f, m]) => { if (m[0]) form.setError(f as keyof LegalBasisInput, { message: m[0] }); });
          const allMessages = Object.values(axiosErr.response.data.errors).flat();
          if (allMessages.length > 0) toast.errorDetail(t(isEdit ? 'update.error' : 'create.error'), allMessages.join(' · '));
          return;
        }
      }
      toast.error(t(isEdit ? 'update.error' : 'create.error'));
    },
  });

  const onSubmit = form.handleSubmit((input) => mutation.mutate(input));

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'edit.title' : 'create.title')} description={t(isEdit ? 'edit.description' : 'create.description')} size="md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="legal-basis-types"
            label={t('form.legal_basis_type')}
            placeholder={tc('actions.search') + '…'}
            required
            initialDisplayValue={item?.legal_basis_type?.name}
            initialSelectedId={item?.legal_basis_type_id}
            onSelect={(it) => form.setValue('legal_basis_type_id', it.id)}
          />
          <div><label className="block text-sm font-medium mb-1">{t('form.number')} *</label><Input type="text" error={!!form.formState.errors.number} {...form.register('number')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.issue_date')} *</label><Input type="date" error={!!form.formState.errors.issue_date} {...form.register('issue_date')} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.effective_date')} *</label><Input type="date" error={!!form.formState.errors.effective_date} {...form.register('effective_date')} /></div>
        </div>
        <CatalogSearchSelect
          type="organizations"
          label={t('form.issuing_organization')}
          placeholder={tc('actions.search') + '…'}
          required
          initialDisplayValue={item?.issuing_organization?.name}
          initialSelectedId={item?.issuing_organization_id}
          onSelect={(it) => form.setValue('issuing_organization_id', it.id)}
        />
        <div><label className="block text-sm font-medium mb-1">{t('form.derogation_date')}</label><Input type="date" {...form.register('derogation_date')} /><p className="text-xs text-muted-foreground mt-1">{t('form.derogation_date_help')}</p></div>
        <div><label className="block text-sm font-medium mb-1">{t('form.reference')}</label><Input type="text" {...form.register('reference')} /></div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border"><Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button></div>
      </form>
    </Dialog>
  );
}
