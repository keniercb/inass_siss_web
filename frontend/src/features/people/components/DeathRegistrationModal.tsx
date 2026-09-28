import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRegisterDeath } from '../api/mutations';
import { deathRegistrationSchema, type DeathRegistrationInput } from '../schemas/person.schema';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';

type Person = components['schemas']['Person'];

interface DeathRegistrationModalProps {
  person: Person;
  onClose: () => void;
}

/**
 * Modal para registrar el fallecimiento de una persona.
 * Endpoint dedicado: POST /people/{id}/death
 *
 * Advertencias:
 *  - Si la persona ya está fallecida, el backend responde 409
 *  - Si la persona tiene pensión activa, se muestra banner de advertencia
 *    (la baja del pensionado se hace en módulo separado)
 */
export function DeathRegistrationModal({ person, onClose }: DeathRegistrationModalProps) {
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const registerDeathMutation = useRegisterDeath();

  const form = useForm<DeathRegistrationInput>({
    resolver: zodResolver(deathRegistrationSchema),
    defaultValues: { death_date: '' },
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await registerDeathMutation.mutateAsync({ id: person.id!, input });
      onClose();
    } catch (err) {
      const axiosErr = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
        Object.entries(axiosErr.response.data.errors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            form.setError(field as keyof DeathRegistrationInput, { message: messages[0] });
          }
        });
      }
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('death.title')}
      description={t('death.description')}
      size="sm"
    >
      <div className="space-y-4">
        {/* Advertencia: si ya está fallecido */}
        {person.deceased && (
          <div className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/30">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{t('death.already_deceased_message')}</p>
          </div>
        )}

        {/* Advertencia: pensión activa (sugerencia de baja del pensionado) */}
        {/* TODO: cuando el backend exponga pensioners por persona, mostrar este banner
            si la persona tiene pensión activa:
            <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{t('death.has_pension_warning')}</p>
            </div>
        */}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="death_date" className="block text-sm font-medium text-foreground mb-1">
              {t('form.death_date')} <span className="text-destructive">*</span>
            </label>
            <Input
              id="death_date"
              type="date"
              error={!!form.formState.errors.death_date}
              {...form.register('death_date')}
            />
            {form.formState.errors.death_date && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {String(form.formState.errors.death_date.message)}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={registerDeathMutation.isPending}
            >
              {registerDeathMutation.isPending ? tc('status.loading') + '…' : t('death.confirm')}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
