import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateUser, useUpdateUser } from '../api/mutations';
import { useToast } from '@/components/ui/Toast';
import { createUserSchema, updateUserSchema, ROLE_LABELS, type CreateUserInput, type UpdateUserInput } from '../schemas/user.schema';
import { useRoles } from '@/features/roles/api/queries';
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
  const toast = useToast();

  // Cargar TODOS los roles del backend (institucionales + personalizados)
  const { data: rolesData } = useRoles({ per_page: 100 });
  const allRoles = rolesData?.data ?? [];

  // Roles seleccionados (estado local)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles ?? []);

  // Toggle de visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as never,
    defaultValues: user
      ? { name: user.name ?? '', roles: user.roles ?? [] }
      : { name: '', email: '', password: '', roles: [] },
  });

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
      // Actualizar el form para que tenga el valor correcto
      form.setValue('roles' as never, next as never);
      return next;
    });
  };

  const onSubmit = form.handleSubmit(async (input) => {
    // Validar manualmente que haya al menos 1 rol
    if (selectedRoles.length === 0) {
      toast.error(t('form.roles_required'));
      return;
    }
    // Injectar roles seleccionados
    (input as Record<string, unknown>).roles = selectedRoles;
    try {
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
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} error={!!(form.formState.errors as Record<string, unknown>).password} {...form.register('password' as never)} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
        {/* Roles cargados del backend (institucionales + personalizados) */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.roles')} *</label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
            {allRoles.length === 0 && <p className="text-sm text-muted-foreground">{tc('status.loading')}…</p>}
            {allRoles.map((r) => {
              const roleName = r.name ?? '';
              const label = ROLE_LABELS[roleName] ?? r.description ?? roleName;
              const isSystem = r.is_system === true;
              return (
                <label key={roleName} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedRoles.includes(roleName)} onChange={() => toggleRole(roleName)} className="w-4 h-4 rounded border-input" />
                  <span className="text-sm">{label}</span>
                  {isSystem && <span className="text-xs text-muted-foreground">({t('form.role_system')})</span>}
                </label>
              );
            })}
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
