import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useCreateUser, useUpdateUser } from '../api/mutations';
import { createUserSchema, updateUserSchema, ROLE_LABELS, type CreateUserInput, type UpdateUserInput } from '../schemas/user.schema';
import { useRoles } from '@/features/roles/api/queries';
import { handleFormError } from '@/lib/backend-errors';
import type { components } from '@/types/api';
import { http } from '@/lib/http';
import { cn } from '@/lib/utils';

type User = components['schemas']['User'];

interface OfficeItem { id: number; address: string; type?: { name: string }; province?: { name: string }; municipality?: { name: string }; }

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

  // Cargar oficinas del backend
  const { data: officesData } = useQuery({
    queryKey: ['offices', 'all'],
    queryFn: async () => {
      const r = await http.get<{ data: OfficeItem[] }>('/offices', { params: { per_page: 100 } });
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const offices = officesData?.data ?? [];

  // Roles seleccionados (estado local)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles ?? []);

  // Toggle de visibilidad de contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Oficina seleccionada (estado local controlado)
  const [officeId, setOfficeId] = useState<number>(0);

  const selectClass = cn('flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50');

  const form = useForm<CreateUserInput | UpdateUserInput>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as never,
    defaultValues: user
      ? { name: user.name ?? '', office_id: (user as Record<string, unknown>).office_id as number ?? 0, roles: user.roles ?? [] }
      : { name: '', email: '', password: '', office_id: 0, roles: [] },
  });

  // Sincronizar officeId del form al estado local (para edición)
  const formOfficeId = form.watch('office_id' as never) as unknown as number;
  if (formOfficeId && officeId === 0 && isEdit) {
    setOfficeId(formOfficeId);
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) => {
      const next = prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role];
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
    // Validar que tenga oficina
    if (!officeId) {
      toast.error(t('form.office_required'));
      return;
    }
    // Injectar roles y office_id
    (input as Record<string, unknown>).roles = selectedRoles;
    (input as Record<string, unknown>).office_id = officeId;
    try {
      if (isEdit && user) {
        await updateMutation.mutateAsync({ id: user.id!, input: input as UpdateUserInput });
      } else {
        await createMutation.mutateAsync(input as CreateUserInput);
      }
      onClose();
    } catch (err) {
      handleFormError(err, form, toast, t(isEdit ? 'update.error' : 'create.error'));
    }
  });

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'edit.title' : 'create.title')} description={t(isEdit ? 'edit.description' : 'create.description')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Nombre + Email (2 columnas) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.name')} *</label>
            <Input type="text" error={!!form.formState.errors.name} {...form.register('name' as never)} />
            {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{String(form.formState.errors.name.message)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.email')} {!isEdit && <span className="text-destructive">*</span>}</label>
            {!isEdit ? (
              <Input type="email" error={!!(form.formState.errors as Record<string, unknown>).email} {...form.register('email' as never)} />
            ) : (
              <Input type="email" value={user?.email ?? ''} disabled />
            )}
            {!isEdit ? (
              (form.formState.errors as Record<string, { message?: string }>).email && <p className="text-xs text-destructive mt-1">{String((form.formState.errors as Record<string, { message?: string }>).email?.message)}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{t('form.email_immutable')}</p>
            )}
          </div>
        </div>
        {/* Contraseña + Oficina (2 columnas); en edición, la oficina ocupa todo el ancho */}
        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
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
          )}
          <div className={isEdit ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium mb-1">{t('form.office_id')} *</label>
            <select className={selectClass} value={officeId} onChange={(e) => { const v = Number(e.target.value); setOfficeId(v); form.setValue('office_id' as never, v as never); }}>
              <option value="0">{tc('actions.select')}</option>
              {offices.map((o) => {
                const label = [o.type?.name, o.province?.name, o.municipality?.name].filter(Boolean).join(' — ') || o.address;
                return <option key={o.id} value={o.id}>{label}</option>;
              })}
            </select>
          </div>
        </div>
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
