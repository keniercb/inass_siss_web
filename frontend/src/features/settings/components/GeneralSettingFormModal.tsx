import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { FieldRenderer } from '@/components/crud/FieldRenderer';
import { useCreateSetting } from '../api/mutations';
import { createSettingSchemaWithValidation, type CreateSettingInput } from '../schemas/general-settings.schema';
import type { AxiosError } from 'axios';
import type { FieldDef } from '@/types/crud';
import type { components } from '@/types/api';

type GeneralSettingVersion = Required<components['schemas']['GeneralSettingVersion']>;

// Definición de campos del formulario (schema-driven)
const settingFields: FieldDef<GeneralSettingVersion>[] = [
  {
    name: 'min_work_years',
    type: 'number',
    label: 'settings:form.min_work_years',
    required: true,
    min: 0,
  },
  {
    name: 'min_age_men',
    type: 'number',
    label: 'settings:form.min_age_men',
    required: true,
    min: 0,
  },
  {
    name: 'min_age_women',
    type: 'number',
    label: 'settings:form.min_age_women',
    required: true,
    min: 0,
  },
  {
    name: 'base_calc_percent',
    type: 'number',
    label: 'settings:form.base_calc_percent',
    required: true,
    min: 0,
    max: 100,
    help: 'settings:form.base_calc_percent_help',
  },
  {
    name: 'max_calc_percent',
    type: 'number',
    label: 'settings:form.max_calc_percent',
    required: true,
    min: 0,
    max: 100,
    help: 'settings:form.max_calc_percent_help',
  },
  {
    name: 'annual_increase_percent',
    type: 'number',
    label: 'settings:form.annual_increase_percent',
    required: true,
    min: 0,
    max: 100,
  },
  {
    name: 'effective_from',
    type: 'date',
    label: 'settings:form.effective_from',
    required: true,
    help: 'settings:form.effective_from_help',
  },
];

interface GeneralSettingFormModalProps {
  onClose: () => void;
}

export function GeneralSettingFormModal({ onClose }: GeneralSettingFormModalProps) {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const createMutation = useCreateSetting();

  const form = useForm<CreateSettingInput>({
    resolver: zodResolver(createSettingSchemaWithValidation),
    defaultValues: {
      min_work_years: 15,
      min_age_men: 65,
      min_age_women: 60,
      base_calc_percent: 50,
      max_calc_percent: 90,
      annual_increase_percent: 1,
      effective_from: '',
    },
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as keyof CreateSettingInput, { message: messages[0] });
          }
        });
      }
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
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          {settingFields.map((field) => (
            <FieldRenderer
              key={String(field.name)}
              field={field as never}
              form={form as never}
              context={{}}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
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
