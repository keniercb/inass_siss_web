import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Eye } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { usePensionCases } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { PensionCaseFormModal } from '../components/PensionCaseFormModal';
import { CASE_STATUS_META } from '../schemas/pension-case.schema';
import { formatDate } from '@/lib/utils';

export function PensionCasesListPage() {
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const np = new URLSearchParams(searchParams);
    if (debouncedSearch) np.set('search', debouncedSearch); else np.delete('search');
    np.set('page', '1'); setSearchParams(np, { replace: true });
  }

  const { data, isLoading } = usePensionCases({ page, per_page, search: debouncedSearch || undefined, status: status || undefined });
  const canCreate = can('cases.create');
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
        {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />{t('list.new')}</Button>}
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input type="text" placeholder={t('list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" /></div>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value, page: 1 })} className="px-3 py-2 text-sm rounded-md border border-input bg-white">
          <option value="">{t('list.filter.all')}</option>
          <option value="submitted">{t('list.filter.submitted')}</option>
          <option value="under_review">{t('list.filter.under_review')}</option>
          <option value="approved">{t('list.filter.approved')}</option>
          <option value="rejected">{t('list.filter.rejected')}</option>
        </select>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.number')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.applicant')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
            <th className="text-left px-4 py-3 font-medium">{t('list.columns.requested_at')}</th>
            <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            : items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            : items.map((c) => {
              const statusMeta = CASE_STATUS_META[c.status ?? 'submitted'] ?? { label: c.status ?? '—', badgeClass: '' };
              const applicantName = c.applicant ? `${c.applicant.first_surname ?? ''} ${c.applicant.first_name ?? ''}`.trim() : '—';
              return (
                <tr key={c.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/expedientes/${c.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs">{c.number}</td>
                  <td className="px-4 py-3 font-medium">{applicantName}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusMeta.badgeClass}`}>{t(`list.status.${c.status}`)}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.requested_at ? formatDate(c.requested_at) : '—'}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => navigate(`/expedientes/${c.id}`)} className="p-1.5 rounded hover:bg-muted" title={tc('actions.view')}><Eye className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
      {formOpen && <PensionCaseFormModal onClose={() => setFormOpen(false)} />}
    </div>
  );
}
