import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreatePerson, useUpdatePerson } from '../api/mutations';
import { personSchema, type PersonInput } from '../schemas/person.schema';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

type Person = components['schemas']['Person'];

interface CatalogItem {
  id: number;
  name: string;
}

interface CatalogListResponse {
  data: CatalogItem[];
}

interface PersonFormModalProps {
  person?: Person;
  onClose: () => void;
}

/**
 * Form modal para crear/editar una persona.
 *
 * Incluye:
 *  - Validación client-side del CI cubano (formato + fecha + dígito verificador)
 *  - CI inmutable en edición (no se puede modificar tras creación)
 *  - Selector de raza cargado async desde /catalogs/races
 *  - Sexo como radio M/F
 *  - Campos de padre/madre para desambiguación de homónimos
 *  - citizen_card_id opcional único (ficha única de ciudadano)
 *  - Mapeo de errores 422 del backend a campos
 */
export function PersonFormModal({ person, onClose }: PersonFormModalProps) {
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const isEdit = !!person;
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();

  // Cargar razas para el select
  const { data: racesData } = useQuery({
    queryKey: ['catalogs', 'races', 'all'],
    queryFn: async () => {
      const response = await http.get<CatalogListResponse>('/catalogs/races', {
        params: { per_page: 100 },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<PersonInput>({
    resolver: zodResolver(personSchema) as never,
    defaultValues: person
      ? {
          identity_number: person.identity_number ?? '',
          first_name: person.first_name ?? '',
          middle_name: person.middle_name ?? '',
          first_surname: person.first_surname ?? '',
          second_surname: person.second_surname ?? '',
          sex: person.sex ?? 'M',
          race_id: person.race_id ?? null,
          address: person.address ?? '',
          birth_date: person.birth_date ?? '',
          father_name: person.father_name ?? '',
          mother_name: person.mother_name ?? '',
          citizen_card_id: person.citizen_card_id ?? '',
        }
      : {
          identity_number: '',
          first_name: '',
          middle_name: '',
          first_surname: '',
          second_surname: '',
          sex: 'M',
          race_id: null,
          address: '',
          birth_date: '',
          father_name: '',
          mother_name: '',
          citizen_card_id: '',
        },
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && person) {
        // No enviar identity_number en PATCH (es inmutable tras creación,
        // el backend rechaza con 422 si se incluye)
        const { identity_number: _ci, ...updateInput } = input;
        await updateMutation.mutateAsync({ id: person.id!, input: updateInput as PersonInput });
      } else {
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as keyof PersonInput, { message: messages[0] });
          }
        });
      }
    }
  });

  const races = racesData?.data ?? [];
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
        {/* Número de identidad (CI cubano) */}
        <div>
          <label htmlFor="identity_number" className="block text-sm font-medium text-foreground mb-1">
            {t('form.identity_number')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="identity_number"
            type="text"
            inputMode="numeric"
            maxLength={11}
            placeholder="85061547812"
            disabled={isEdit}
            error={!!form.formState.errors.identity_number}
            {...form.register('identity_number')}
          />
          {form.formState.errors.identity_number && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.identity_number.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{t('form.identity_number_help')}</p>
        </div>

        {/* Nombres (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-foreground mb-1">
              {t('form.first_name')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="first_name"
              type="text"
              error={!!form.formState.errors.first_name}
              {...form.register('first_name')}
            />
            {form.formState.errors.first_name && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.first_name.message)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="middle_name" className="block text-sm font-medium text-foreground mb-1">
              {t('form.middle_name')}
            </label>
            <Input id="middle_name" type="text" {...form.register('middle_name')} />
          </div>
        </div>

        {/* Apellidos (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_surname" className="block text-sm font-medium text-foreground mb-1">
              {t('form.first_surname')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="first_surname"
              type="text"
              error={!!form.formState.errors.first_surname}
              {...form.register('first_surname')}
            />
            {form.formState.errors.first_surname && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.first_surname.message)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="second_surname" className="block text-sm font-medium text-foreground mb-1">
              {t('form.second_surname')}
            </label>
            <Input id="second_surname" type="text" {...form.register('second_surname')} />
          </div>
        </div>

        {/* Sexo + Fecha nacimiento (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('form.sex')} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="M"
                  className="w-4 h-4"
                  {...form.register('sex')}
                />
                <span className="text-sm">{t('form.sex_male')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="F"
                  className="w-4 h-4"
                  {...form.register('sex')}
                />
                <span className="text-sm">{t('form.sex_female')}</span>
              </label>
            </div>
            {form.formState.errors.sex && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.sex.message)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="birth_date" className="block text-sm font-medium text-foreground mb-1">
              {t('form.birth_date')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="birth_date"
              type="date"
              error={!!form.formState.errors.birth_date}
              {...form.register('birth_date')}
            />
            {form.formState.errors.birth_date && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.birth_date.message)}
              </p>
            )}
          </div>
        </div>

        {/* Raza */}
        <div>
          <label htmlFor="race_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.race')}
          </label>
          <select
            id="race_id"
            className={selectClass}
            {...form.register('race_id', { setValueAs: (v) => v === '' ? null : v ? Number(v) : null })}
          >
            <option value="">{tc('actions.select')}</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dirección */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
            {t('form.address')} <span className="text-destructive">*</span>
          </label>
          <Input
            id="address"
            type="text"
            placeholder="Calle 23 #45, Vedado, La Habana"
            error={!!form.formState.errors.address}
            {...form.register('address')}
          />
          {form.formState.errors.address && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {String(form.formState.errors.address.message)}
            </p>
          )}
        </div>

        {/* Padre/Madre (desambiguación) — 2 columnas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="father_name" className="block text-sm font-medium text-foreground mb-1">
              {t('form.father_name')}
            </label>
            <Input id="father_name" type="text" {...form.register('father_name')} />
          </div>
          <div>
            <label htmlFor="mother_name" className="block text-sm font-medium text-foreground mb-1">
              {t('form.mother_name')}
            </label>
            <Input id="mother_name" type="text" {...form.register('mother_name')} />
          </div>
        </div>

        {/* Ficha única de ciudadano */}
        <div>
          <label htmlFor="citizen_card_id" className="block text-sm font-medium text-foreground mb-1">
            {t('form.citizen_card_id')}
          </label>
          <Input
            id="citizen_card_id"
            type="text"
            {...form.register('citizen_card_id')}
          />
          <p className="text-xs text-muted-foreground mt-1">{t('form.citizen_card_id_help')}</p>
        </div>

        {/* Footer */}
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
