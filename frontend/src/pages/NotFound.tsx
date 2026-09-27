import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <FileQuestion className="w-16 h-16 text-muted-foreground mb-4" />
      <div className="text-6xl font-bold text-muted-foreground mb-2">404</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Página no encontrada
      </h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        La página que busca no existe o ha sido movida. Verifique la URL o vuelva al inicio.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
