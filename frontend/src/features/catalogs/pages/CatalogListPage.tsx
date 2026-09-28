import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Library } from 'lucide-react';
import { ResourceListPage } from '@/components/crud/ResourceListPage';
import { getCatalogConfig } from '../config/catalog-config';
import { isCatalogType, CATALOG_TYPE_LABELS } from '../config/catalog-types';
import type { components } from '@/types/api';

type CatalogItem = components['schemas']['CatalogItem'];

/**
 * Wrapper para que ResourceListPage reciba un CrudConfig tipado con { id: number | string }.
 */
function CatalogListContent({ type }: { type: string }) {
  const config = getCatalogConfig(type as never);
  // Cast para satisfacer la constraint TResource extends { id: number | string }
  return <ResourceListPage config={config as never} />;
}

/**
 * Página de listado de un catálogo uniforme específico.
 * Recibe `:type` de la URL y construye la CrudConfig dinámica.
 *
 * Si el `type` no es válido, redirige al índice de catálogos.
 */
export function CatalogListPage() {
  const { type = '' } = useParams<{ type: string }>();
  const { i18n } = useTranslation();

  if (!isCatalogType(type)) {
    return <Navigate to="/catalogos" replace />;
  }

  const labels = CATALOG_TYPE_LABELS[type];
  const label = i18n.language.startsWith('en') ? labels.en : labels.es;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb contextual */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/catalogos" className="hover:text-foreground flex items-center gap-1">
          <Library className="w-4 h-4" />
          Catálogos
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">{label}</span>
      </nav>

      <CatalogListContent type={type} />
    </div>
  );
}

// Suppress unused import warning (CatalogItem is used implicitly via config typing)
export type { CatalogItem };
