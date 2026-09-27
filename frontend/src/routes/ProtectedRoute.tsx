import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

interface ProtectedRouteProps {
  /** Permiso requerido para acceder a la ruta. Si no se especifica, solo requiere auth. */
  permiso?: string;
  children: ReactNode;
}

/**
 * Protege una ruta: requiere autenticación y (opcionalmente) un permiso.
 * Si no está autenticado → redirige a /login con el redirect_to en state.
 * Si está autenticado pero sin permiso → renderiza <Forbidden />.
 */
export function ProtectedRoute({ permiso, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (permiso && !hasPermission(permiso)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}

export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl font-bold text-destructive mb-2">403</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Acceso denegado
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        No tiene permisos para acceder a este recurso. Contacte al administrador si cree
        que es un error.
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
      >
        Volver al inicio
      </a>
    </div>
  );
}
