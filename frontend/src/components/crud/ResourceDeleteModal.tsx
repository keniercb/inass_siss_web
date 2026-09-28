import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { CrudConfig } from '@/types/crud';

interface ResourceDeleteModalProps<TResource, TCreateInput, TUpdateInput> {
  config: CrudConfig<TResource, TCreateInput, TUpdateInput>;
  resource: TResource;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  onClose: () => void;
}

/**
 * Modal de confirmación de desactivación lógica (soft delete).
 * Usa la etiqueta 'deactivate' o 'remove' según el config.
 */
export function ResourceDeleteModal<TResource extends { id: number | string }, TCreateInput, TUpdateInput>({
  config,
  onConfirm,
  isPending,
  onClose,
}: ResourceDeleteModalProps<TResource, TCreateInput, TUpdateInput>) {
  const { t } = useTranslation(config.resourceKey);
  const { t: tc } = useTranslation('common');
  const label = config.deleteLabel ?? 'deactivate';

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(`delete.${label}_title`)}
      description={t(`delete.${label}_description`)}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/30">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{t(`delete.${label}_confirm`)}</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {tc('actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isPending}
          >
            {isPending ? tc('status.loading') + '…' : t(`delete.${label}_confirm_button`)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
