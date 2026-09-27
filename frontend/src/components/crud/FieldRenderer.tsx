import { UseFormReturn, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
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
 */
export function FieldRenderer<TFieldValues extends FieldValues>({
  field,
  form,
  disabled,
  context,
}: FieldRendererProps<TFieldValues>) {
  const { t: tc } = useTranslation('common');

  // Verificar condición (ej. months_per_year solo si context.:type === 'pension-regimes')
  if (field.condition && !field.condition(context)) {
    return null;
  }

  const isDisabled = disabled || field.disabledOnEdit;
  const error = form.formState.errors[field.name as keyof TFieldValues];

  const label = (
    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </label>
  );

  const errorMessage = error?.message ? (
    <p className="text-xs text-destructive mt-1" role="alert">
      {String(error.message)}
    </p>
  ) : null;

  const helpText = field.help ? (
    <p className="text-xs text-muted-foreground mt-1">{field.help}</p>
  ) : null;

  switch (field.type) {
    case 'text':
      return (
        <div>
          {label}
          <Input
            id={field.name}
            type="text"
            placeholder={field.placeholder}
            disabled={isDisabled}
            error={!!error}
            {...form.register(field.name as never)}
          />
          {errorMessage}
          {helpText}
        </div>
      );

    case 'textarea':
      return (
        <div>
          {label}
          <textarea
            id={field.name}
            placeholder={field.placeholder}
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
          {helpText}
        </div>
      );

    case 'number':
      return (
        <div>
          {label}
          <Input
            id={field.name}
            type="number"
            placeholder={field.placeholder}
            disabled={isDisabled}
            error={!!error}
            min={field.min}
            max={field.max}
            step={field.step}
            {...form.register(field.name as never, { valueAsNumber: true })}
          />
          {errorMessage}
          {helpText}
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
            {field.label}
          </label>
          {errorMessage}
          {helpText}
        </div>
      );

    case 'date':
      return (
        <div>
          {label}
          <Input
            id={field.name}
            type="date"
            disabled={isDisabled}
            error={!!error}
            {...form.register(field.name as never)}
          />
          {errorMessage}
          {helpText}
        </div>
      );

    case 'select':
      return (
        <div>
          {label}
          <select
            id={field.name}
            disabled={isDisabled}
            className={cn(
              'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-destructive' : 'border-input',
            )}
            {...form.register(field.name as never)}
          >
            <option value="">{tc('actions.select')}</option>
            {field.options?.map((opt) => (
              <option key={String(opt.value)} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errorMessage}
          {helpText}
        </div>
      );

    case 'async-select':
      return (
        <AsyncSelectField
          field={field}
          form={form}
          disabled={isDisabled}
          label={label}
          errorMessage={errorMessage}
          helpText={helpText}
        />
      );

    default:
      return null;
  }
}

/** Campo select con opciones cargadas asíncronamente (p. ej. provincias) */
function AsyncSelectField<TFieldValues extends FieldValues>({
  field,
  form,
  disabled,
  label,
  errorMessage,
  helpText,
}: {
  field: FieldDef<unknown>;
  form: UseFormReturn<TFieldValues>;
  disabled?: boolean;
  label: React.ReactNode;
  errorMessage: React.ReactNode;
  helpText: React.ReactNode;
}) {
  const [options, setOptions] = useState<Array<{ value: string | number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const { t: tc } = useTranslation('common');

  useEffect(() => {
    let cancelled = false;
    if (field.loadOptions) {
      setLoading(true);
      field
        .loadOptions('')
        .then((opts) => {
          if (!cancelled) {
            setOptions(opts);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [field.loadOptions]);

  return (
    <div>
      {label}
      <select
        id={field.name}
        disabled={disabled || loading}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        {...form.register(field.name as never)}
      >
        <option value="">{loading ? `${tc('status.loading')}…` : tc('actions.select')}</option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {errorMessage}
      {helpText}
    </div>
  );
}
