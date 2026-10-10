import { UseFormReturn, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SearchSelect } from '@/components/ui/SearchSelect';
import type { FieldDef } from '@/types/crud';
import { cn } from '@/lib/utils';

interface FieldRendererProps<TFieldValues extends FieldValues> {
  field: FieldDef<unknown>;
  form: UseFormReturn<TFieldValues>;
  disabled?: boolean;
  context?: Record<string, string | number>;
}

/**
 * Renderiza un campo del formulario según su tipo (schema-driven).
 * Cada tipo tiene su implementación específica.
 *
 * IMPORTANTE: `field.label`, `field.help` y `field.placeholder` pueden ser:
 *  - Una clave i18n completa con namespace (ej. "catalogs:form.code")
 *  - Un texto literal (fallback si la clave no existe)
 * Se traducen automáticamente con t().
 */
export function FieldRenderer<TFieldValues extends FieldValues>({
  field,
  form,
  disabled,
  context,
}: FieldRendererProps<TFieldValues>) {
  // useTranslation() sin namespace → permite usar claves con namespace completo
  // (ej. t('catalogs:form.code') o t('common:actions.select'))
  const [t] = useTranslation();
  const tc = t; // alias para claves comunes

  // Verificar condición (ej. months_per_year solo si context.:type === 'pension-regimes')
  if (field.condition && !field.condition(context)) {
    return null;
  }

  const isDisabled = disabled || field.disabledOnEdit;
  const error = form.formState.errors[field.name as keyof TFieldValues];

  // Traducir label/help/placeholder (acepta claves i18n con namespace o textos literales)
  const labelText = field.label ? t(field.label) : '';
  const helpText = field.help ? t(field.help) : undefined;
  const placeholderText = field.placeholder ? t(field.placeholder) : undefined;

  const label = (
    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1">
      {labelText}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
  );

  const errorMessage = error?.message ? (
    <p className="text-xs text-destructive mt-1" role="alert">
      {String(error.message)}
    </p>
  ) : null;

  const help = helpText ? (
    <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
  ) : null;

  switch (field.type) {
    case 'text':
      return (
        <div>
          {label}
          <Input
            id={field.name}
            type="text"
            placeholder={placeholderText}
            disabled={isDisabled}
            error={!!error}
            {...form.register(field.name as never)}
          />
          {errorMessage}
          {help}
        </div>
      );

    case 'textarea':
      return (
        <div>
          {label}
          <textarea
            id={field.name}
            placeholder={placeholderText}
            disabled={isDisabled}
            className={cn(
              'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-destructive' : 'border-input',
            )}
            {...form.register(field.name as never)}
          />
          {errorMessage}
          {help}
        </div>
      );

    case 'number':
      return (
        <div>
          {label}
          <Input
            id={field.name}
            type="number"
            placeholder={placeholderText}
            disabled={isDisabled}
            error={!!error}
            min={field.min}
            max={field.max}
            step={field.step}
            {...form.register(field.name as never, { valueAsNumber: true })}
          />
          {errorMessage}
          {help}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          <input
            id={field.name}
            type="checkbox"
            disabled={isDisabled}
            className="w-4 h-4 rounded border-input"
            {...form.register(field.name as never)}
          />
          <label htmlFor={field.name} className="text-sm font-medium text-foreground">
            {labelText}
          </label>
          {errorMessage}
          {help}
        </div>
      );

    case 'date':
      return (
        <div>
          {label}
          <DatePickerField
            id={field.name}
            value={(form.watch(field.name as never) as unknown as string | null | undefined) ?? ''}
            onChange={(val) => form.setValue(field.name as never, (val || null) as never, { shouldValidate: true, shouldDirty: true })}
            placeholder={placeholderText}
            disabled={isDisabled}
            error={!!error}
          />
          {errorMessage}
          {help}
        </div>
      );

    case 'select':
      return (
        <div>
          {label}
          <SearchSelect
            id={field.name}
            value={(form.watch(field.name as never) as unknown as string | number | null) ?? undefined}
            onChange={(v) => form.setValue(field.name as never, (v ?? null) as never, { shouldValidate: true, shouldDirty: true })}
            options={(field.options ?? []).map((opt) => ({ value: opt.value, label: opt.label }))}
            placeholder={placeholderText ?? tc('common:actions.select')}
            disabled={isDisabled}
            error={!!error}
          />
          {errorMessage}
          {help}
        </div>
      );

    case 'async-select':
      return (
        <div>
          {label}
          <SearchSelect
            id={field.name}
            value={(form.watch(field.name as never) as unknown as string | number | null) ?? undefined}
            onChange={(v) => form.setValue(field.name as never, (v ?? null) as never, { shouldValidate: true, shouldDirty: true })}
            loadOptions={async (q) => {
              if (!field.loadOptions) return [];
              return field.loadOptions(q);
            }}
            placeholder={placeholderText ?? tc('common:actions.select')}
            disabled={isDisabled}
            error={!!error}
          />
          {errorMessage}
          {help}
        </div>
      );

    default:
      return null;
  }
}

