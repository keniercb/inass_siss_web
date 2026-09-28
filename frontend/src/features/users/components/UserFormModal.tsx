import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateUser, useUpdateUser } from '../api/mutations';
import { createUserSchema, updateUserSchema, SYSTEM_ROLES, ROLE_LABELS, type CreateUserInput, type UpdateUserInput } from '../schemas/user.schema';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';

type User = components['schemas']['User'];

interface UserFormModalProps {
  user?: User;
  onClose: () => void;
}

export function UserFormModal({ user, onClose }: UserFormModalProps) {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const isEdit = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  // Selected roles (local state for checkboxes)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles ?? []);

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as never,
    defaultValues: user
      ? { name: user.name ?? '', roles: user.roles ?? [] }
      : { name: '', email: '', password: '', roles: [] },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
    form.setValue('roles' as never, selectedRoles as never);
  };

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      // Inject selected roles
      (input as Record<string, unknown>).roles = selectedRoles;
      if (isEdit && user) {
        await updateMutation.mutateAsync({ id: user.id!, input: input as UpdateUserInput });
      } else {
        await createMutation.mutateAsync(input as CreateUserInput);
      }
      onClose();
    } catch (err) {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        Object.entries(ae.response.data.errors).forEach(([f, m]) => {
          if (m[0]) form.setError(f as never, { message: m[0] });
        });
      }
    }
  });

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'edit.title' : 'create.title')} description={t(isEdit ? 'edit.description' : 'create.description')} size="md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.name')} *</label>
          <Input type="text" error={!!form.formState.errors.name} {...form.register('name' as never)} />
          {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{String(form.formState.errors.name.message)}</p>}
        </div>
        {!isEdit && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.email')} *</label>
              <Input type="email" error={!!(form.formState.errors as Record<string, unknown>).email} {...form.register('email' as never)} />
              {(form.formState.errors as Record<string, { message?: string }>).email && <p className="text-xs text-destructive mt-1">{String((form.formState.errors as Record<string, { message?: string }>).email?.message)}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.password')} *</label>
              <Input type="password" error={!!(form.formState.errors as Record<string, unknown>).password} {...form.register('password' as never)} />
              {(form.formState.errors as Record<string, { message?: string }>).password && <p className="text-xs text-destructive mt-1">{String((form.formState.errors as Record<string, { message?: string }>).password?.message)}</p>}
            </div>
          </>
        )}
        {isEdit && (
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.email')}</label>
            <Input type="email" value={user?.email ?? ''} disabled />
            <p className="text-xs text-muted-foreground mt-1">{t('form.email_immutable')}</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.roles')} *</label>
          <div className="space-y-2">
            {SYSTEM_ROLES.map((role) => (
              <label key={role} className="flex items-center gap-2">
                <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="w-4 h-4 rounded border-input" />
                <span className="text-sm">{ROLE_LABELS[role]}</span>
              </label>
            ))}
          </div>
          {selectedRoles.length === 0 && <p className="text-xs text-destructive mt-1">{t('form.roles_required')}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
