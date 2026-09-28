import { Link } from 'react-router-dom';
import { ChevronRight, Library } from 'lucide-react';
import { ResourceListPage } from '@/components/crud/ResourceListPage';
import { municipalityConfig } from '../config/municipality-config';
import { MunicipalityFormModal } from '../components/MunicipalityFormModal';

export function MunicipalitiesListPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/catalogos" className="hover:text-foreground flex items-center gap-1">
          <Library className="w-4 h-4" />
          Catálogos
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Municipios</span>
      </nav>

      <ResourceListPage
        config={municipalityConfig as never}
        customFormModal={MunicipalityFormModal as never}
      />
    </div>
  );
}
