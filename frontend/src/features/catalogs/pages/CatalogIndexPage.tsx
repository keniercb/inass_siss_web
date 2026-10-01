import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { CATALOG_TYPE_LABELS, VALID_CATALOG_TYPES } from '../config/catalog-types';
import { http } from '@/lib/http';
import type { CatalogType } from '../config/catalog-types';

interface CatalogListResponse {
  data: unknown[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

/**
 * Hook que obtiene el total de items de un catálogo con una llamada
 * per_page=1 (el backend devuelve el total real en meta.total).
 */
function useCatalogCount(type: CatalogType | 'municipalities' | 'agencies') {
  return useQuery({
    queryKey: ['catalog-count', type],
    queryFn: async () => {
      const endpoint = type === 'municipalities' || type === 'agencies' ? `/${type}` : `/catalogs/${type}`;
      const r = await http.get<CatalogListResponse>(endpoint, { params: { per_page: 1 } });
      return r.data.meta?.total ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function CountBadge({ type }: { type: CatalogType | 'municipalities' | 'agencies' }) {
  const { data, isLoading } = useCatalogCount(type);
  const display = isLoading ? '…' : (data ?? 0);
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
      {display}
    </span>
  );
}

/**
 * Página índice de catálogos: muestra los 16 tipos de catálogos uniformes
 * con un enlace a la página de listado de cada uno, más un badge con el
 * número de entradas activas de cada catálogo.
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
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CountBadge type={type} />
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
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
            <div className="flex items-center gap-2">
              <CountBadge type="municipalities" />
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-2">
              <CountBadge type="agencies" />
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
