import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateEntity, useUpdateEntity } from '../api/mutations';
import { entitySchema, type EntityInput } from '../schemas/organization.schema';
import { PersonSearchWithCreate } from '@/features/people/components/PersonSearchWithCreate';
import type { Entity } from '@/types/domain';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

interface CatalogItem { id: number; name: string; code?: string; }
interface CatalogListResponse { data: CatalogItem[]; }

interface EntityFormModalProps {
  entity?: Entity;
  onClose: () => void;
}

export function EntityFormModal({ entity, onClose }: EntityFormModalProps) {
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const isEdit = !!entity;
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();

  const { data: orgsData } = useQuery({
    queryKey: ['catalogs', 'organizations', 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/organizations', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: entityTypesData } = useQuery({
    queryKey: ['catalogs', 'entity-types', 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/entity-types', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const { data: provincesData } = useQuery({
    queryKey: ['catalogs', 'provinces', 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/provinces', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(entity?.province_id ?? null);

  const { data: municipalitiesData } = useQuery({
    queryKey: ['municipalities', 'list', { province_id: selectedProvinceId }],
    queryFn: async () => {
      if (!selectedProvinceId) return { data: [] as CatalogItem[] };
      const r = await http.get<CatalogListResponse>('/municipalities', { params: { per_page: 100, province_id: selectedProvinceId } });
      return r.data;
    },
    enabled: !!selectedProvinceId,
    staleTime: 60_000,
  });

  const form = useForm<EntityInput>({
    resolver: zodResolver(entitySchema),
    defaultValues: entity ? {
      code: entity.code, tax_id_number: entity.tax_id_number, organization_id: entity.organization_id,
      province_id: entity.province_id, municipality_id: entity.municipality_id, entity_type_id: entity.entity_type_id,
      address: entity.address, phone: entity.phone ?? '', fax: entity.fax ?? '', email: entity.email ?? '',
      director_person_id: entity.director_person_id ?? null, economic_director_person_id: entity.economic_director_person_id ?? null,
      parent_entity_id: entity.parent_entity_id ?? null, social_purpose: entity.social_purpose ?? '',
    } : {
      code: '', tax_id_number: '', organization_id: 0, province_id: 0, municipality_id: 0, entity_type_id: 0,
      address: '', phone: '', fax: '', email: '', director_person_id: null, economic_director_person_id: null,
      parent_entity_id: null, social_purpose: '',
    },
  });

  useEffect(() => { if (!isEdit) form.setValue('municipality_id', 0); }, [selectedProvinceId, form, isEdit]);

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && entity) { await updateMutation.mutateAsync({ id: entity.id!, input }); }
      else { await createMutation.mutateAsync(input); }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([f, m]) => { if (m[0]) form.setError(f as keyof EntityInput, { message: m[0] }); });
      }
    }
  });

  const selectClass = cn('flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50');

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'entities.edit.title' : 'entities.create.title')} description={t(isEdit ? 'entities.edit.description' : 'entities.create.description')} size="xl">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.code')} *</label>
            <Input type="text" disabled={isEdit} error={!!form.formState.errors.code} {...form.register('code')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.tax_id_number')} *</label>
            <Input type="text" disabled={isEdit} error={!!form.formState.errors.tax_id_number} {...form.register('tax_id_number')} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.organization')} *</label>
            <select className={selectClass} {...form.register('organization_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}>
              <option value="">{tc('actions.select')}</option>
              {(orgsData?.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.entity_type')} *</label>
            <select className={selectClass} {...form.register('entity_type_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}>
              <option value="">{tc('actions.select')}</option>
              {(entityTypesData?.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.province')} *</label>
            <select className={selectClass} disabled={isEdit} value={selectedProvinceId ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setSelectedProvinceId(v); form.setValue('province_id', v ?? 0); }}>
              <option value="">{tc('actions.select')}</option>
              {(provincesData?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {/* Municipio + Dirección (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.municipality')} *</label>
            <select className={selectClass} disabled={!selectedProvinceId} {...form.register('municipality_id', { setValueAs: (v) => v === '' ? 0 : Number(v) })}>
              <option value="">{!selectedProvinceId ? t('agencies.form.select_province_first') : tc('actions.select')}</option>
              {(municipalitiesData?.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('entities.form.address')} *</label>
            <Input type="text" error={!!form.formState.errors.address} {...form.register('address')} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('entities.form.phone')}</label><Input type="text" {...form.register('phone')} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('entities.form.fax')}</label><Input type="text" {...form.register('fax')} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('entities.form.email')}</label><Input type="email" error={!!form.formState.errors.email} {...form.register('email')} /></div>
        </div>
        {/* Director + Director económico (búsqueda de persona con opción de registrar nueva) */}
        <div className="grid grid-cols-2 gap-3">
          <PersonSearchWithCreate
            label={t('entities.form.director')}
            placeholder={tc('actions.search') + '…'}
            initialDisplayValue={entity?.director ? `${entity.director.first_name ?? ''} ${entity.director.first_surname ?? ''} (${entity.director.identity_number ?? ''})`.trim() : undefined}
            initialSelectedId={entity?.director_person_id ?? undefined}
            onSelect={(p) => form.setValue('director_person_id', p.id)}
          />
          <PersonSearchWithCreate
            label={t('entities.form.economic_director')}
            placeholder={tc('actions.search') + '…'}
            initialDisplayValue={entity?.economic_director ? `${entity.economic_director.first_name ?? ''} ${entity.economic_director.first_surname ?? ''} (${entity.economic_director.identity_number ?? ''})`.trim() : undefined}
            initialSelectedId={entity?.economic_director_person_id ?? undefined}
            onSelect={(p) => form.setValue('economic_director_person_id', p.id)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('entities.form.social_purpose')}</label>
          <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register('social_purpose')} />
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
