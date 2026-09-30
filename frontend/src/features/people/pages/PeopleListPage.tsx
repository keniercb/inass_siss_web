import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Edit, Trash2, Eye, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { usePeople } from '../api/queries';
import { useDeletePerson } from '../api/mutations';
import { formatCI } from '@/lib/cuban-ci';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/crud/Pagination';
import { Dialog } from '@/components/ui/Dialog';
import { PersonFormModal } from '../components/PersonFormModal';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];

export function PeopleListPage() {
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [deletePerson, setDeletePerson] = useState<Person | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const deceased = searchParams.get('deceased') ?? 'all';
  const sort = searchParams.get('sort') ?? 'first_surname';
  const order = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  if (debouncedSearch !== search) {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) newParams.set('search', debouncedSearch);
    else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  const { data, isLoading, isError } = usePeople({
    page,
    per_page,
    search: debouncedSearch || undefined,
    deceased: (deceased as 'all' | 'alive' | 'deceased') ?? 'all',
    sort,
    order,
  });

  const deleteMutation = useDeletePerson();
  const items = data?.data ?? [];
  const meta = data?.meta;
  const canManage = can('people.manage');

  const updateParams = (patch: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null) newParams.delete(k);
      else newParams.set(k, String(v));
    });
    setSearchParams(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('list.new')}
          </Button>
        )}
      </div>

      {/* Filtros + búsqueda */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('list.search_placeholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={deceased}
          onChange={(e) => updateParams({ deceased: e.target.value, page: 1 })}
          className="px-3 py-2 text-sm rounded-md border border-input bg-white"
        >
          <option value="all">{t('list.filter.all')}</option>
          <option value="alive">{t('list.filter.alive')}</option>
          <option value="deceased">{t('list.filter.deceased')}</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.ci')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.name')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.sex')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.citizen_card_id')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.birth_date')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('list.columns.status')}</th>
              {(canManage || can('people.view')) && (
                <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {tc('status.loading')}…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-destructive">
                  {tc('errors.server')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {t('list.empty')}
                </td>
              </tr>
            ) : (
              items.map((person) => {
                const fullName = [person.first_surname, person.second_surname, person.first_name, person.middle_name]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <tr
                    key={person.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/personas/${person.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{formatCI(person.identity_number ?? '')}</td>
                    <td className="px-4 py-3 font-medium">{fullName}</td>
                    <td className="px-4 py-3 text-xs">
                      {person.sex === 'M' ? t('list.columns.sex_male') : t('list.columns.sex_female')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{person.citizen_card_id || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {person.birth_date ? formatDate(person.birth_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {person.deceased ? (
                        <span className="badge badge-rejected">
                          <UserX className="w-3 h-3" />
                          {t('list.status.deceased')}
                        </span>
                      ) : (
                        <span className="badge badge-approved">
                          <UserCheck className="w-3 h-3" />
                          {t('list.status.alive')}
                        </span>
                      )}
                    </td>
                    {(canManage || can('people.view')) && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/personas/${person.id}`)}
                            className="p-1.5 rounded hover:bg-muted"
                            title={tc('actions.view')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setFormOpen(true)}
                                className="p-1.5 rounded hover:bg-muted"
                                title={tc('actions.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletePerson(person)}
                                className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                                title={tc('actions.deactivate')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {meta && meta.total > 0 && (
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            perPage={meta.per_page}
            total={meta.total}
            onChange={(p, pp) => updateParams({ page: p, ...(pp ? { per_page: pp } : {}) })}
          />
        )}
      </div>

      {formOpen && <PersonFormModal onClose={() => setFormOpen(false)} />}

      {deletePerson && (
        <Dialog
          open
          onClose={() => setDeletePerson(null)}
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
              <Button type="button" variant="outline" onClick={() => setDeletePerson(null)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  await deleteMutation.mutateAsync(deletePerson.id!);
                  setDeletePerson(null);
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
