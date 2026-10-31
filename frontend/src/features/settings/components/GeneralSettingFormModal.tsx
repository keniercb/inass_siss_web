import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useToast } from '@/components/ui/Toast';
import { useCreateSetting } from '../api/mutations';
import { createSettingSchemaWithValidation, type CreateSettingInput } from '../schemas/general-settings.schema';
import { handleFormError } from '@/lib/backend-errors';

interface GeneralSettingFormModalProps {
  onClose: () => void;
}

// Task 55/S9.1: doctrina 2026 — 7 campos nuevos, los 6 viejos retirados
const SETTING_FIELDS = [
  { name: 'combatant_threshold_date', type: 'date', labelKey: 'form.combatant_threshold_date', helpKey: 'form.combatant_threshold_date_help', required: true },
  { name: 'pre_threshold_percent', type: 'number', labelKey: 'form.pre_threshold_percent', helpKey: 'form.pre_threshold_percent_help', required: true, step: 0.01, min: 0, max: 1 },
  { name: 'post_threshold_percent', type: 'number', labelKey: 'form.post_threshold_percent', helpKey: 'form.post_threshold_percent_help', required: true, step: 0.01, min: 0, max: 1 },
  { name: 'internationalist_increment', type: 'number', labelKey: 'form.internationalist_increment', helpKey: 'form.internationalist_increment_help', required: true, step: 0.01, min: 0 },
  { name: 'minimum_pension', type: 'number', labelKey: 'form.minimum_pension', helpKey: 'form.minimum_pension_help', required: true, step: 0.01, min: 0 },
  { name: 'maximum_pension', type: 'number', labelKey: 'form.maximum_pension', helpKey: 'form.maximum_pension_help', required: true, step: 0.01, min: 0 },
  { name: 'minimum_pension_increment', type: 'number', labelKey: 'form.minimum_pension_increment', helpKey: 'form.minimum_pension_increment_help', required: true, step: 0.01, min: 0 },
  // Task 70/SGP-54: calendario de cobro
  { name: 'payment_day', type: 'number', labelKey: 'form.payment_day', helpKey: 'form.payment_day_help', required: true, min: 1, max: 30 },
  { name: 'month_to_provitional', type: 'number', labelKey: 'form.month_to_provitional', helpKey: 'form.month_to_provitional_help', required: true, min: 1 },
  { name: 'month_to_expired', type: 'number', labelKey: 'form.month_to_expired', helpKey: 'form.month_to_expired_help', required: true, min: 1 },
] as const;

export function GeneralSettingFormModal({ onClose }: GeneralSettingFormModalProps) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const toast = useToast();
  const createMutation = useCreateSetting();

  const form = useForm<CreateSettingInput>({
    resolver: zodResolver(createSettingSchemaWithValidation),
    defaultValues: {
      combatant_threshold_date: '',
      pre_threshold_percent: 0.5,
      post_threshold_percent: 0.3,
      internationalist_increment: 150,
      minimum_pension: 200,
      maximum_pension: 2500,
      minimum_pension_increment: 50,
      payment_day: 15,
      month_to_provitional: 1,
      month_to_expired: 1,
    },
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch (err) {
      handleFormError(err, form, toast, t('create.error'));
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('create.title')}
      description={t('create.description')}
      size="lg"
    >
      <form onSubmit={onSubmit} noValidate>
        {/* Grid responsive: 1 col en mobile, 2 cols en sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SETTING_FIELDS.map((field) => {
            const labelText = t(field.labelKey);
            const helpText = t(field.helpKey);
            const isRequired = 'required' in field && field.required;
            const error = form.formState.errors[field.name as keyof CreateSettingInput];

            return (
              <div key={field.name} className={field.name === 'combatant_threshold_date' ? 'col-span-1 sm:col-span-2' : 'col-span-1'}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {labelText}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === 'date' ? (
                  <DatePickerField
                    value={(form.watch(field.name as never) as unknown as string) ?? ''}
                    onChange={(v) => form.setValue(field.name as never, (v || null) as never, { shouldValidate: true, shouldDirty: true })}
                    error={!!error}
                  />
                ) : (
                  <Input
                    type="number"
                    step={'step' in field ? field.step : undefined}
                    min={'min' in field ? field.min : undefined}
                    max={'max' in field ? field.max : undefined}
                    error={!!error}
                    {...form.register(field.name as never)}
                  />
                )}
                {error?.message && (
                  <p className="text-xs text-destructive mt-1" role="alert">{String(error.message)}</p>
                )}
                {helpText && (
                  <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
