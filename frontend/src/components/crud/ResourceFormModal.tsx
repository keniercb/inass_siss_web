import { useForm, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useCrudResource } from '@/hooks/crud/useCrudResource';
import { FieldRenderer } from './FieldRenderer';
import type { CrudConfig } from '@/types/crud';
import type { AxiosError } from 'axios';

interface ResourceFormModalProps<TResource, TCreateInput, TUpdateInput> {
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
  resource?: TResource;
  onClose: () => void;
}

/**
 * Modal de creación/edición genérico para el patrón CRUD.
 * Usa React Hook Form + Zod (resolver) y mapea errores 422 del backend
 * a campos del formulario vía form.setError.
 */
export function ResourceFormModal<
  TResource extends { id: number | string },
  TCreateInput extends FieldValues,
  TUpdateInput extends FieldValues,
>({ config, resource, onClose }: ResourceFormModalProps<TResource, TCreateInput, TUpdateInput>) {
  const { t } = useTranslation(config.resourceKey);
  const { t: tc } = useTranslation('common');
  const isEdit = !!resource;
  const { useCreate, useUpdate } = useCrudResource(config);
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  const form = useForm<TCreateInput | TUpdateInput>({
    resolver: zodResolver(
      (isEdit ? config.schemas.update : config.schemas.create) as never,
    ) as never,
    defaultValues: (resource ?? {}) as never,
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      if (isEdit && resource) {
        await updateMutation.mutateAsync({
          id: resource.id,
          input: input as unknown as TUpdateInput,
        });
      } else {
        await createMutation.mutateAsync(input as unknown as TCreateInput);
      }
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        const fieldErrors = axiosErr.response.data.errors;
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as never, { message: messages[0] });
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
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {config.fields.map((field) => (
          <FieldRenderer
            key={String(field.name)}
            field={field as never}
            form={form as never}
            disabled={
              isEdit && config.inmutableFields?.includes(field.name as keyof TResource)
            }
            context={config.context}
          />
        ))}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? tc('status.loading') + '…'
              : tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
