import { Outlet } from 'react-router-dom';

/**
 * PublicLayout — Layout mínimo para login, recuperación y errores públicos.
 * No incluye sidebar ni topnavbar.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            SGP
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              Sistema de Gestión de Pensionados
            </p>
            <p className="text-xs text-muted-foreground">
              Ministerio de Trabajo de Cuba
            </p>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
