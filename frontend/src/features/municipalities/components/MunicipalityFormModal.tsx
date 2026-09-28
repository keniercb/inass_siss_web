import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCrudResource } from '@/hooks/crud/useCrudResource';
import { municipalityConfig, type MunicipalityInput } from '../config/municipality-config';
import type { CrudConfig } from '@/types/crud';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

type Municipality = components['schemas']['Municipality'];

// Tipo para option del select de provincias
interface CatalogItem {
  id: number;
  code: string;
  name: string;
}

interface ProvinceListResponse {
  data: CatalogItem[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

interface MunicipalityFormModalProps<TResource, TCreateInput, TUpdateInput> {
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
  resource?: Municipality;
  onClose: () => void;
}

/**
 * Form modal custom para municipios.
 * Maneja:
 *  - Select de provincia (cargado desde /catalogs/provinces)
 *  - Caso especial Isla de la Juventud (province_id null) con checkbox
 *  - Code inmutable en edición
 *  - Validación client-side con Zod
 *  - Mapeo de errores 422 del backend
 */
export function MunicipalityFormModal<TResource, TCreateInput, TUpdateInput>({
  resource,
  onClose,
}: MunicipalityFormModalProps<TResource, TCreateInput, TUpdateInput>) {
  const { t } = useTranslation('municipalities');
  const { t: tc } = useTranslation('common');
  const isEdit = !!resource;
  const { useCreate, useUpdate } = useCrudResource(municipalityConfig);
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  // Cargar provincias para el select
  const { data: provincesData } = useQuery({
    queryKey: ['catalogs', 'provinces', 'all'],
    queryFn: async () => {
      const response = await http.get<ProvinceListResponse>('/catalogs/provinces', {
        params: { per_page: 100 },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const provinces = provincesData?.data ?? [];
  const isIslaDeLaJuventud = resource && !resource.province?.id;

  const form = useForm<MunicipalityInput>({
    resolver: zodResolver(municipalityConfig.schemas.create),
    defaultValues: resource
      ? {
          code: resource.code ?? '',
          name: resource.name ?? '',
          province_id: resource.province?.id ?? null,
        }
      : { code: '', name: '', province_id: null },
  });

  // Sincronizar el checkbox "Isla de la Juventud" con province_id
  const [isSpecial, setIsSpecial] = useState(isIslaDeLaJuventud ?? false);
  useEffect(() => {
    if (isSpecial) {
      form.setValue('province_id', null);
    }
  }, [isSpecial, form]);

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && resource) {
        await updateMutation.mutateAsync({
          id: resource.id!,
          input: input as never,
        });
      } else {
        await createMutation.mutateAsync(input as never);
      }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as keyof MunicipalityInput, { message: messages[0] });
          }
        });
      }
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(isEdit ? 'edit.title' : 'create.title')}
      description={t(isEdit ? 'edit.description' : 'create.description')}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Checkbox Isla de la Juventud */}
        <div className="flex items-center gap-2 p-3 rounded-md bg-info/10 border border-info/30">
          <input
            id="is_special"
            type="checkbox"
            checked={isSpecial}
            onChange={(e) => setIsSpecial(e.target.checked)}
            disabled={isEdit}
            className="w-4 h-4 rounded border-input"
          />
          <label htmlFor="is_special" className="text-sm font-medium text-foreground">
            {t('form.isla_de_la_juventud')}
          </label>
          <p className="text-xs text-muted-foreground ml-2">
            {t('form.isla_de_la_juventud_help')}
          </p>
        </div>

        {/* Provincia */}
        <div>
          <label htmlFor="province_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.province')}
            {!isSpecial && <span className="text-destructive ml-1">*</span>}
          </label>
          <select
            id="province_id"
            disabled={isSpecial || isEdit}
            className={cn(
              'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              form.formState.errors.province_id ? 'border-destructive' : 'border-input',
            )}
            {...form.register('province_id', { setValueAs: (v) => v === '' ? null : Number(v) })}
            value={String(form.watch('province_id') ?? '')}
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

        {/* Código */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-foreground mb-1">
            {t('form.code')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="code"
            type="text"
            placeholder="0101"
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
            placeholder="La Habana Vieja"
            error={!!form.formState.errors.name}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.name)}
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
