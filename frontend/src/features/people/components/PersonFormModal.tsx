import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { SearchCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/lib/utils';
import { useCreatePerson, useUpdatePerson, useFucPersonLookup } from '../api/mutations';
import { personSchema, type PersonInput } from '../schemas/person.schema';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import { handleFormError } from '@/lib/backend-errors';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];

interface PersonFormModalProps {
  person?: Person;
  /** CI cubano pre-cargado (caso de registro desde otro formulario, p. ej. expediente) */
  initialIdentityNumber?: string;
  /** Callback opcional con la persona creada (solo en modo create) */
  onCreated?: (person: Person) => void;
  onClose: () => void;
}

/**
 * Validez estructural del CI para la consulta FUC: 11 dígitos con mes (01-12)
 * y día (01-31) en los dígitos 3-6. Es validación de FORMATO (no de negocio):
 * evita el viaje de red que el endpoint rechazaría con 422. El dígito
 * verificador sigue siendo cosa del backend.
 */
function isStructurallyValidCI(ci: string): boolean {
  if (!/^\d{11}$/.test(ci)) return false;
  const month = parseInt(ci.slice(2, 4), 10);
  const day = parseInt(ci.slice(4, 6), 10);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

/**
 * Form modal para crear/editar una persona.
 *
 * Incluye:
 *  - Validación client-side del CI cubano (formato + fecha + dígito verificador)
 *  - CI inmutable en edición (no se puede modificar tras creación)
 *  - Consulta FUC por CI en modo alta (botón junto al campo) que autollena
 *    los campos del formulario con los datos públicos del ciudadano
 *  - Selector de raza cargado async desde /catalogs/races
 *  - Sexo como radio M/F
 *  - Campos de padre/madre para desambiguación de homónimos
 *  - citizen_card_id opcional único (UID-P de 32 caracteres de la FUC)
 *  - Mapeo de errores 422 del backend a campos
 */
export function PersonFormModal({ person, initialIdentityNumber, onCreated, onClose }: PersonFormModalProps) {
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const isEdit = !!person;
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const fucMutation = useFucPersonLookup();

  // Cargar razas para el select — reemplazado por CatalogSearchSelect que
  // maneja su propia carga de datos.
  // const { data: racesData } = useQuery(...)

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
          identity_number: initialIdentityNumber ?? '',
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

  const watchedCI = form.watch('identity_number') ?? '';
  const fucReady = !isEdit && isStructurallyValidCI(watchedCI);

  /** Consulta la Ficha Única y autollena el formulario con la respuesta.
   *  Solo toca los campos que la FUC aporta (los null del nivel de consulta
   *  configurado dejan el valor actual intacto). El UID-P (fuc_id) persiste
   *  en citizen_card_id. Los errores los presenta el hook (toast). */
  const handleFucLookup = async () => {
    if (!fucReady) return;
    try {
      const fuc = await fucMutation.mutateAsync(watchedCI);
      const set = (field: keyof PersonInput, value: string | null | undefined) => {
        if (value != null && value !== '') {
          form.setValue(field, value as never, { shouldValidate: true, shouldDirty: true });
        }
      };
      set('first_name', fuc.first_name);
      set('middle_name', fuc.middle_name);
      set('first_surname', fuc.first_surname);
      set('second_surname', fuc.second_surname);
      if (fuc.sex === 'M' || fuc.sex === 'F') {
        form.setValue('sex', fuc.sex, { shouldValidate: true, shouldDirty: true });
      }
      set('birth_date', fuc.birth_date);
      set('address', fuc.address);
      set('father_name', fuc.father_name);
      set('mother_name', fuc.mother_name);
      // El identificador único de persona de la FUC persiste en citizen_card_id
      set('citizen_card_id', fuc.fuc_id);
      const fullName = [fuc.first_name, fuc.first_surname].filter(Boolean).join(' ');
      toast.success(t('fuc.success', { name: fullName || watchedCI }));
      // Bandera de fallecido del proveedor: se informa, no se bloquea
      // (el registro de personas admite personas fallecidas).
      if (fuc.deceased === true) {
        toast.errorDetail(
          t('fuc.deceased_warning'),
          fuc.death_date
            ? t('fuc.deceased_warning_detail', { date: formatDate(fuc.death_date) })
            : t('fuc.deceased_warning'),
        );
      }
    } catch {
      /* toast handled by mutation.onError */
    }
  };

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && person) {
        // No enviar identity_number en PATCH (es inmutable tras creación,
        // el backend rechaza con 422 si se incluye)
        const { identity_number: _ci, ...updateInput } = input;
        await updateMutation.mutateAsync({ id: person.id!, input: updateInput as PersonInput });
      } else {
        const created = await createMutation.mutateAsync(input);
        if (onCreated && created) onCreated(created);
      }
      onClose();
    } catch (err) {
      handleFormError(err, form, toast, t(isEdit ? 'update.error' : 'create.error'));
    }
  });

  // CatalogSearchSelect maneja la carga de razas internamente


  return (
    <Dialog
      open
      onClose={onClose}
      title={t(isEdit ? 'edit.title' : 'create.title')}
      description={t(isEdit ? 'edit.description' : 'create.description')}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* CI cubano + Ficha única de ciudadano (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="identity_number" className="block text-sm font-medium text-foreground">
                {t('form.identity_number')} <span className="text-destructive">*</span>
              </label>
              {/* Consulta FUC — solo en modo alta: autollena con los datos públicos del ciudadano */}
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleFucLookup}
                  disabled={!fucReady || fucMutation.isPending}
                  title={t('fuc.button_help')}
                  className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
                >
                  {fucMutation.isPending ? tc('status.loading') + '…' : t('fuc.button')}
                </button>
              )}
            </div>
            <div className="flex gap-2">
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
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleFucLookup}
                  disabled={!fucReady || fucMutation.isPending}
                  aria-label={t('fuc.button')}
                  title={t('fuc.button_help')}
                  className="flex-shrink-0"
                >
                  <SearchCheck className="w-4 h-4" />
                </Button>
              )}
            </div>
            {form.formState.errors.identity_number && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.identity_number.message)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{t('form.identity_number_help')}</p>
          </div>
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
            <DatePickerField
              id="birth_date"
              value={form.watch('birth_date') ?? ''}
              onChange={(v) => form.setValue('birth_date', (v || null) as never, { shouldValidate: true, shouldDirty: true })}
              error={!!form.formState.errors.birth_date}
            />
            {form.formState.errors.birth_date && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.birth_date.message)}
              </p>
            )}
          </div>
        </div>

        {/* Raza (búsqueda con crear nuevo) + Dirección (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="races"
            label={t('form.race')}
            placeholder={tc('actions.search') + '…'}
            initialDisplayValue={person?.race_id ? undefined : undefined}
            initialSelectedId={person?.race_id ?? undefined}
            onSelect={(item) => form.setValue('race_id', item.id)}
          />
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
