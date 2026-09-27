import { useAuthStore } from '@/store/auth-store';

/**
 * Hook para verificar permisos del usuario autenticado.
 * - admin tiene todos los permisos implícitamente.
 * - Para el resto, se verifica en el array user.permissions.
 *
 * Uso:
 *   const can = usePermiso();
 *   if (can('cases.approve')) { ... }
 *
 * También puede usarse con permiso directo:
 *   const canApprove = usePermiso('cases.approve');
 */
export function usePermiso(permission?: string): (permiso?: string) => boolean {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (permission) {
    return () => hasPermission(permission);
  }

  return (permiso?: string) => {
    if (!permiso) return false;
    return hasPermission(permiso);
  };
}
