import { Link } from 'react-router-dom';
import { ChevronRight, Library } from 'lucide-react';
import { ResourceListPage } from '@/components/crud/ResourceListPage';
import { agencyConfig } from '../config/agency-config';
import { AgencyFormModal } from '../components/AgencyFormModal';

export function AgenciesListPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <Link to="/catalogos" className="hover:text-foreground flex items-center gap-1">
          <Library className="w-4 h-4" />
          Catálogos
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Agencias bancarias</span>
      </nav>

      <ResourceListPage
        config={agencyConfig as never}
        customFormModal={AgencyFormModal as never}
      />
    </div>
  );
}
