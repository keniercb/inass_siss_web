import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCrudResource } from '@/hooks/crud/useCrudResource';
import { agencyConfig, type AgencyInput } from '../config/agency-config';
import type { CrudConfig } from '@/types/crud';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

type Agency = components['schemas']['Agency'];

interface CatalogItem {
  id: number;
  code: string;
  name: string;
}

interface CatalogListResponse {
  data: CatalogItem[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

interface AgencyFormModalProps<TResource, TCreateInput, TUpdateInput> {
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
  resource?: Agency;
  onClose: () => void;
}

/**
 * Form modal custom para agencias con cascading selects:
 * provincia → municipio (filtrado por provincia) + tipo de agencia.
 *
 * Cuando cambia la provincia, se resetea el municipio y se cargan
 * los municipios de esa provincia.
 */
export function AgencyFormModal<TResource, TCreateInput, TUpdateInput>({
  resource,
  onClose,
}: AgencyFormModalProps<TResource, TCreateInput, TUpdateInput>) {
  const { t } = useTranslation('agencies');
  const { t: tc } = useTranslation('common');
  const isEdit = !!resource;
  const { useCreate, useUpdate } = useCrudResource(agencyConfig);
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  // Cargar provincias
  const { data: provincesData } = useQuery({
    queryKey: ['catalogs', 'provinces', 'all'],
    queryFn: async () => {
      const response = await http.get<CatalogListResponse>('/catalogs/provinces', {
        params: { per_page: 100 },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Cargar tipos de agencia
  const { data: agencyTypesData } = useQuery({
    queryKey: ['catalogs', 'agency-types', 'all'],
    queryFn: async () => {
      const response = await http.get<CatalogListResponse>('/catalogs/agency-types', {
        params: { per_page: 100 },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Estado local de provincia seleccionada (para cascading)
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(
    resource?.province?.id ?? null,
  );

  // Cargar municipios filtrados por provincia seleccionada
  const { data: municipalitiesData } = useQuery({
    queryKey: ['municipalities', 'list', { province_id: selectedProvinceId }],
    queryFn: async () => {
      if (!selectedProvinceId) return { data: [], meta: { current_page: 1, per_page: 100, total: 0, last_page: 1 } };
      const response = await http.get<CatalogListResponse>('/municipalities', {
        params: { per_page: 100, province_id: selectedProvinceId },
      });
      return response.data;
    },
    enabled: !!selectedProvinceId,
    staleTime: 60_000,
  });

  const form = useForm<AgencyInput>({
    resolver: zodResolver(agencyConfig.schemas.create),
    defaultValues: resource
      ? {
          code: resource.code ?? '',
          name: resource.name ?? '',
          province_id: resource.province?.id ?? 0,
          municipality_id: resource.municipality?.id ?? 0,
          agency_type_id: resource.type?.id ?? 0,
        }
      : { code: '', name: '', province_id: 0, municipality_id: 0, agency_type_id: 0 },
  });

  // Reset municipio cuando cambia la provincia
  useEffect(() => {
    if (!isEdit) {
      form.setValue('municipality_id', 0);
    }
  }, [selectedProvinceId, form, isEdit]);

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && resource) {
        await updateMutation.mutateAsync({ id: resource.id!, input: input as never });
      } else {
        await createMutation.mutateAsync(input as never);
      }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as keyof AgencyInput, { message: messages[0] });
          }
        });
      }
    }
  });

  const provinces = provincesData?.data ?? [];
  const agencyTypes = agencyTypesData?.data ?? [];
  const municipalities = municipalitiesData?.data ?? [];

  const selectClass = cn(
    'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(isEdit ? 'edit.title' : 'create.title')}
      description={t(isEdit ? 'edit.description' : 'create.description')}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Provincia */}
        <div>
          <label htmlFor="province_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.province')} <span className="text-destructive">*</span>
          </label>
          <select
            id="province_id"
            className={cn(selectClass, form.formState.errors.province_id && 'border-destructive')}
            disabled={isEdit}
            value={selectedProvinceId ?? ''}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setSelectedProvinceId(v);
              form.setValue('province_id', v ?? 0);
            }}
          >
            <option value="">{tc('actions.select')}</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {form.formState.errors.province_id && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.province_id.message)}
            </p>
          )}
        </div>

        {/* Municipio (filtrado por provincia) */}
        <div>
          <label htmlFor="municipality_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.municipality')} <span className="text-destructive">*</span>
          </label>
          <select
            id="municipality_id"
            disabled={!selectedProvinceId}
            className={cn(selectClass, form.formState.errors.municipality_id && 'border-destructive')}
            {...form.register('municipality_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}
          >
            <option value="">
              {!selectedProvinceId ? t('form.select_province_first') : tc('actions.select')}
            </option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {form.formState.errors.municipality_id && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.municipality_id.message)}
            </p>
          )}
        </div>

        {/* Tipo de agencia */}
        <div>
          <label htmlFor="agency_type_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.agency_type')} <span className="text-destructive">*</span>
          </label>
          <select
            id="agency_type_id"
            className={cn(selectClass, form.formState.errors.agency_type_id && 'border-destructive')}
            {...form.register('agency_type_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}
          >
            <option value="">{tc('actions.select')}</option>
            {agencyTypes.map((at) => (
              <option key={at.id} value={at.id}>
                {at.name}
              </option>
            ))}
          </select>
          {form.formState.errors.agency_type_id && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.agency_type_id.message)}
            </p>
          )}
        </div>

        {/* Código */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1">
            {t('form.code')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="code"
            type="text"
            placeholder="BPA0101"
            disabled={isEdit}
            error={!!form.formState.errors.code}
            {...form.register('code')}
          />
          {form.formState.errors.code && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.code.message)}
            </p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            {t('form.name')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Agencia 1 BPA"
            error={!!form.formState.errors.name}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.name.message)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {createMutation.isPending || updateMutation.isPending
              ? tc('status.loading') + '…'
              : tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
