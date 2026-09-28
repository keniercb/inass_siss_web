import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { CATALOG_TYPE_LABELS, VALID_CATALOG_TYPES } from '../config/catalog-types';

/**
 * Página índice de catálogos: muestra los 16 tipos de catálogos uniformes
 * con un enlace a la página de listado de cada uno.
 *
 * También incluye enlaces a municipios y agencias (endpoints dedicados).
 */
export function CatalogIndexPage() {
  const { i18n } = useTranslation();
  const { t } = useTranslation('common');
  const can = usePermiso();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('app.title')} · Catálogos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión de catálogos uniformes, municipios y agencias del sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Catálogos uniformes (16 tipos) */}
        {VALID_CATALOG_TYPES.map((type) => {
          const labels = CATALOG_TYPE_LABELS[type];
          const label = i18n.language.startsWith('en') ? labels.en : labels.es;
          return (
            <Link
              key={type}
              to={`/catalogos/${type}`}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          );
        })}

        {/* Municipios (endpoint dedicado) */}
        {can('catalogs.view') && (
          <Link
            to="/catalogos/municipios"
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Municipios</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}

        {/* Agencias (endpoint dedicado) */}
        {can('catalogs.view') && (
          <Link
            to="/catalogos/agencias"
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Agencias bancarias</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}
      </div>
    </div>
  );
}
