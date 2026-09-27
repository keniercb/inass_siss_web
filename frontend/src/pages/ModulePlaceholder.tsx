import { useTranslation } from 'react-i18next';
import { FolderKanban } from 'lucide-react';

/**
 * Placeholder para módulos no implementados aún.
 * Muestra mensaje "Próximamente" con el nombre del módulo.
 */
export function ModulePlaceholder({
  title,
  description,
  sprint,
}: {
  title: string;
  description: string;
  sprint: string;
}) {
  void useTranslation('common');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FolderKanban className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-medium text-foreground mb-1">
          Próximamente
        </h2>
        <p className="text-sm text-muted-foreground mb-1 max-w-md">
          Este módulo será implementado en el sprint{' '}
          <span className="font-medium text-primary">{sprint}</span>.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Pendiente de publicación del endpoint backend correspondiente.
        </p>
      </div>
    </div>
  );
}
