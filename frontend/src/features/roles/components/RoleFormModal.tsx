import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateRole, useUpdateRole } from '../api/mutations';
import { usePermissions } from '../api/queries';
import { roleSchema, PERMISSION_MODULES, ACTION_LABELS, type RoleInput } from '../schemas/role.schema';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';

type Role = components['schemas']['Role'];
type Permission = components['schemas']['Permission'];

interface RoleFormModalProps {
  role?: Role;
  onClose: () => void;
}

export function RoleFormModal({ role, onClose }: RoleFormModalProps) {
  const { t } = useTranslation('roles');
  const { t: tc } = useTranslation('common');
  const isEdit = !!role;
  const isSystem = role?.is_system === true;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const { data: permissions } = usePermissions();

  // Permisos seleccionados (estado local)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));

  // Agrupar permisos por módulo
  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    (permissions ?? []).forEach((p) => {
      const mod = p.module ?? 'other';
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [permissions]);

  const form = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
    defaultValues: role
      ? { name: role.name ?? '', description: role.description ?? '', permissions: role.permissions ?? [] }
      : { name: '', description: '', permissions: [] },
  });

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const toggleModule = (_mod: string, perms: Permission[]) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      const allSelected = perms.every((p) => next.has(p.name!));
      if (allSelected) {
        perms.forEach((p) => next.delete(p.name!));
      } else {
        perms.forEach((p) => next.add(p.name!));
      }
      return next;
    });
  };

  const onSubmit = form.handleSubmit(async (input) => {
    // Injectar permisos seleccionados
    input.permissions = Array.from(selectedPerms).sort();
    try {
      if (isEdit && role) {
        await updateMutation.mutateAsync({ id: role.id!, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        Object.entries(ae.response.data.errors).forEach(([f, m]) => {
          if (m[0]) form.setError(f as keyof RoleInput, { message: m[0] });
        });
      }
    }
  });

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'edit.title' : 'create.title')} description={t(isEdit ? 'edit.description' : 'create.description')} size="xl">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.name')} *</label>
          <Input type="text" placeholder="supervisor_territorial" disabled={isSystem || isEdit} error={!!form.formState.errors.name} {...form.register('name')} />
          {form.formState.errors.name && <p className="text-xs text-destructive mt-1">{String(form.formState.errors.name.message)}</p>}
          <p className="text-xs text-muted-foreground mt-1">{t('form.name_help')}</p>
        </div>
        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.description')}</label>
          <Input type="text" placeholder="Supervisa la captura de una provincia" disabled={isSystem} {...form.register('description')} />
        </div>
        {/* Permisos agrupados por módulo */}
        <div>
          <label className="block text-sm font-medium mb-2">{t('form.permissions')} * <span className="text-muted-foreground text-xs">({selectedPerms.size} seleccionados)</span></label>
          <div className="max-h-80 overflow-y-auto border border-border rounded-md p-3 space-y-3">
            {grouped.map(([mod, perms]) => {
              const moduleLabel = PERMISSION_MODULES[mod] ?? mod;
              const allSelected = perms.every((p) => selectedPerms.has(p.name!));
              const someSelected = perms.some((p) => selectedPerms.has(p.name!));
              return (
                <div key={mod}>
                  <div className="flex items-center gap-2 mb-1 pb-1 border-b border-border">
                    <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={() => toggleModule(mod, perms)} className="w-4 h-4 rounded border-input" />
                    <span className="text-sm font-medium text-foreground">{moduleLabel}</span>
                    <span className="text-xs text-muted-foreground">({mod})</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-6">
                    {perms.map((p) => {
                      const checked = selectedPerms.has(p.name!);
                      const actionLabel = ACTION_LABELS[p.action ?? ''] ?? p.action ?? '';
                      return (
                        <label key={p.name} className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs cursor-pointer transition-colors ${checked ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                          <input type="checkbox" checked={checked} onChange={() => togglePerm(p.name!)} className="w-3 h-3" />
                          <span>{actionLabel}</span>
                          <span className="font-mono text-[10px] opacity-60">{p.action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {grouped.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{tc('status.loading')}…</p>}
          </div>
          {selectedPerms.size === 0 && <p className="text-xs text-destructive mt-1">{t('form.permissions_required')}</p>}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || (isSystem && isEdit)}>
            {createMutation.isPending || updateMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
