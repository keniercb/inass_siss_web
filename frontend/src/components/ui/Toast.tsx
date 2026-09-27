import { Toaster as ReactHotToaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Container global de toasts.
 * Renderizado una sola vez en main.tsx, fuera de cualquier layout.
 * Posición: top-right fijo, debajo del TopNavbar (top: 64px), z-index 9999.
 *
 * Reglas del sistema de toasts (ver ADR-FE-19):
 *  - 5s auto-dismiss para success/info/warning
 *  - 7s para error (más tiempo para leer)
 *  - Iconos Lucide por variante
 *  - role="alert" para error/warning, role="status" para success/info
 */
export function ToastContainer() {
  return (
    <ReactHotToaster
      position="top-right"
      containerStyle={{
        top: 64,
        right: 16,
        zIndex: 9999,
      }}
      toastOptions={{
        duration: 5000,
        style: {
          minWidth: 320,
          maxWidth: 400,
          background: 'white',
          color: 'var(--foreground)',
          boxShadow: 'var(--shadow-toast)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          border: '1px solid var(--border)',
        },
        success: {
          icon: <CheckCircle className="w-5 h-5 text-success" />,
          duration: 5000,
        },
        error: {
          icon: <XCircle className="w-5 h-5 text-destructive" />,
          duration: 7000,
        },
      }}
    />
  );
}

/**
 * Hook para mostrar toasts desde cualquier parte de la app.
 * Uso:
 *   const toast = useToast();
 *   toast.success('Operación completada');
 *   toast.error('Ocurrió un error');
 */
export function useToast() {
  return {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    warning: (msg: string) =>
      toast(msg, { icon: <AlertTriangle className="w-5 h-5 text-warning" /> }),
    info: (msg: string) =>
      toast(msg, { icon: <Info className="w-5 h-5 text-info" /> }),
    errorDetail: (msg: string, detail: string) =>
      toast.error(
        <div>
          <p className="font-medium">{msg}</p>
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        </div>,
        { duration: 7000 },
      ),
    dismiss: (id?: string) => toast.dismiss(id),
  };
}
