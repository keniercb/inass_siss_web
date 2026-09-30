import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import type { FieldValues } from 'react-hook-form';
import { useCrudResource } from '@/hooks/crud/useCrudResource';
import { usePermiso } from '@/hooks/use-permiso';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from './Pagination';
import { ResourceFormModal } from './ResourceFormModal';
import { ResourceDeleteModal } from './ResourceDeleteModal';
import type { CrudConfig, ListResponse } from '@/types/crud';

interface ResourceListPageProps<TResource, TCreateInput, TUpdateInput> {
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
  /** Form modal personalizado (para recursos con UI específica, p. ej. cascading selects) */
  customFormModal?: React.ComponentType<{
    config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
    resource?: TResource;
    onClose: () => void;
  }>;
}

/**
 * Página de listado genérica para el patrón CRUD.
 * Incluye: búsqueda, filtros, tabla con sort y acciones, paginación,
 * modal de creación/edición y modal de desactivación.
 *
 * Si se pasa `customFormModal`, se usa en lugar de ResourceFormModal
 * (para recursos con UI específica como municipios/agencias con cascading selects).
 */
export function ResourceListPage<
  TResource extends { id: number | string },
  TCreateInput extends FieldValues,
  TUpdateInput extends FieldValues,
>({ config, customFormModal }: ResourceListPageProps<TResource, TCreateInput, TUpdateInput>) {
  const { t } = useTranslation(config.resourceKey);
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parsear parámetros de la URL
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const per_page = parseInt(searchParams.get('per_page') ?? '15', 10);
  const search = searchParams.get('search') ?? '';
  const sort = searchParams.get('sort') ?? 'name';
  const order = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  // Filtros adicionales desde URL
  const filterParams: Record<string, string> = {};
  config.filters?.forEach((f) => {
    const val = searchParams.get(f.name);
    if (val) filterParams[f.name] = val;
  });

  // Búsqueda con debounce
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, config.search?.debounce ?? 300);

  // Actualizar URL cuando cambia el debounced search
  if (debouncedSearch !== search) {
    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) newParams.set('search', debouncedSearch);
    else newParams.delete('search');
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  const { useList, useDelete, canCreate, canEdit, canDelete } = useCrudResource(config);

  // Llamar useList incondicionalmente con todos los params
  const queryParams: Record<string, unknown> = {
    page,
    per_page,
    search: debouncedSearch || undefined,
    sort,
    order,
    ...filterParams,
  };

  const { data, isLoading, isError } = useList(queryParams);
  const deleteMutation = useDelete();

  // Estado de modales
  const [formModalState, setFormModalState] = useState<{
    open: boolean;
    resource?: TResource;
  }>({ open: false });
  const [deleteModalState, setDeleteModalState] = useState<{
    open: boolean;
    resource?: TResource;
  }>({ open: false });

  const updateParams = (patch: Record<string, string | number>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null) newParams.delete(k);
      else newParams.set(k, String(v));
    });
    setSearchParams(newParams);
  };

  const handleSort = (column: string) => {
    if (sort === column) {
      updateParams({ order: order === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sort: column, order: 'asc' });
    }
  };

  const envelope = data as ListResponse<TResource> | undefined;
  const items = envelope?.data ?? [];
  const meta = envelope?.meta;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {config.title ?? t('list.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('list.description')}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormModalState({ open: true })}>
            <span className="w-4 h-4">+</span>
            {t('list.new')}
          </Button>
        )}
      </div>

      {/* Filtros + búsqueda */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4 flex flex-wrap gap-3 items-center">
        {config.search && (
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={config.search.placeholder ?? `${tc('actions.search')}…`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {config.filters?.map((filter) => {
          if (filter.type === 'select') {
            return (
              <select
                key={filter.name}
                value={filterParams[filter.name] ?? ''}
                onChange={(e) => updateParams({ [filter.name]: e.target.value, page: 1 })}
                className="px-3 py-2 text-sm rounded-md border border-input bg-white"
              >
                <option value="">{filter.label}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          }
          return null;
        })}

        {config.export?.enabled && can(config.export.permiso) && (
          <Button
            variant="outline"
            onClick={() => window.open(config.export!.endpoint, '_blank')}
          >
            {tc('actions.export')}
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              {/* Renderizar headers de columnas (sortable) */}
              {config.columns.map((col) => {
                const colId = (col as { id?: string }).id ?? '';
                const sortable = colId !== 'actions' && colId !== '';
                const isSorted = sort === colId;
                // Traducir el header usando i18n: ${resourceKey}:list.columns.${colId}
                // Si la clave no existe, fallback al colId en capitalizado
                const headerLabel = t(`list.columns.${colId}`, colId);
                return (
                  <th
                    key={colId || Math.random().toString()}
                    className="text-left px-4 py-3 font-medium"
                  >
                    {sortable ? (
                      <button
                        onClick={() => handleSort(colId)}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {headerLabel}
                        {isSorted ? (
                          order === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <span>{headerLabel}</span>
                    )}
                  </th>
                );
              })}
              {/* Columna de acciones */}
              {(canEdit || canDelete) && (
                <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={config.columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {tc('status.loading')}…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={config.columns.length + 1}
                  className="px-4 py-8 text-center text-destructive"
                >
                  {tc('errors.server')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={config.columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t('list.empty')}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={String(item.id)} className="hover:bg-muted/50 transition-colors">
                  {config.columns.map((col) => {
                    const colId = (col as { id?: string }).id ?? '';
                    const value = (item as Record<string, unknown>)[colId];
                    // Mostrar '—' para valores nulos/vacíos; strings/numbers directos;
                    // objetos anidados (type, province, organization, etc.) → extraer .name
                    let display: React.ReactNode = '—';
                    if (value == null || value === '') {
                      display = '—';
                    } else if (typeof value === 'string' || typeof value === 'number') {
                      display = value;
                    } else if (typeof value === 'object') {
                      const obj = value as { name?: string; code?: string; title?: string };
                      display = obj.name ?? obj.code ?? obj.title ?? '—';
                    } else {
                      display = String(value);
                    }
                    return (
                      <td key={colId || Math.random().toString()} className="px-4 py-3">
                        {display}
                      </td>
                    );
                  })}
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => setFormModalState({ open: true, resource: item })}
                            className="p-1.5 rounded hover:bg-muted"
                            title={tc('actions.edit')}
                            aria-label={tc('actions.edit')}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteModalState({ open: true, resource: item })}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                            title={t('delete.title')}
                            aria-label={t('delete.title')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginación */}
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

      {/* Modal de creación/edición (custom o default) */}
      {formModalState.open && (() => {
        const FormModal = customFormModal ?? ResourceFormModal;
        return (
          <FormModal
            config={config}
            resource={formModalState.resource}
            onClose={() => setFormModalState({ open: false })}
          />
        );
      })()}

      {/* Modal de desactivación */}
      {deleteModalState.open && deleteModalState.resource && (
        <ResourceDeleteModal
          config={config}
          resource={deleteModalState.resource}
          onConfirm={async () => {
            await deleteMutation.mutateAsync(deleteModalState.resource!);
            setDeleteModalState({ open: false });
          }}
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteModalState({ open: false })}
        />
      )}
    </div>
  );
}

/** Helper para generar columnas estándar (id, code, name, description, actions) */
export function standardColumns(
  t: (key: string) => string,
): Array<{ id: string; header: string }> {
  return [
    { id: 'code', header: t('list.columns.code') },
    { id: 'name', header: t('list.columns.name') },
    { id: 'description', header: t('list.columns.description') },
  ];
}
