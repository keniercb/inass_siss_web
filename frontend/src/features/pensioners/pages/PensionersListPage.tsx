import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Eye } from 'lucide-react';
import { usePensioners } from '../api/queries';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Pagination } from '@/components/crud/Pagination';
import { formatDate, formatCUP, cn } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  active: { label: 'active', badgeClass: 'badge-approved' },
  suspended: { label: 'suspended', badgeClass: 'badge-under_review' },
  terminated: { label: 'terminated', badgeClass: 'badge-rejected' },
};

export function PensionersListPage() {
  const { t } = useTranslation('pensioners');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const status = searchParams.get('status') ?? '';

  const { data, isLoading } = usePensioners({ page, per_page, status: status || undefined });
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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p>
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder={t('list.search_placeholder')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-9" />
        </div>
        <div className="w-48">
          <SearchSelect
            value={status || undefined}
            onChange={(v) => updateParams({ status: String(v ?? ''), page: 1 })}
            options={[
              { value: '', label: t('list.filter.all') },
              { value: 'active', label: t('list.filter.active') },
              { value: 'suspended', label: t('list.filter.suspended') },
              { value: 'terminated', label: t('list.filter.terminated') },
            ]}
            placeholder={t('list.filter.all')}
          />
        </div>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.person')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.amount')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.type')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.regime')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.origin_case')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.created_at')}</th>
              <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{tc('status.loading')}…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">{t('list.empty')}</td></tr>
            ) : (
              items.map((p) => {
                const personName = p.person ? `${p.person.first_surname ?? ''} ${p.person.first_name ?? ''}`.trim() : '—';
                const statusMeta = STATUS_META[p.status ?? 'active'] ?? { label: p.status ?? '—', badgeClass: '' };
                return (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/pensionados/${p.id}`)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{personName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.person?.identity_number ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{p.amount != null ? formatCUP(Number(p.amount)) : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.pension_type?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.pension_regime?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className={cn('badge', statusMeta.badgeClass)}>{t(`list.status.${statusMeta.label}`)}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{p.origin_case?.number ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.created_at ? formatDate(p.created_at) : '—'}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/pensionados/${p.id}`)} className="p-1.5 rounded hover:bg-muted" title={tc('actions.view')}>
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {meta && meta.total > 0 && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} perPage={meta.per_page} total={meta.total} onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })} />}
      </div>
    </div>
  );
}
