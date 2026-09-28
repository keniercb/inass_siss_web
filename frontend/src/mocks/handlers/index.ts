import { authHandlers } from './auth';
import { catalogsHandlers } from './catalogs';
import { settingsHandlers } from './settings';
import { municipalitiesHandlers } from './municipalities';
import { agenciesHandlers } from './agencies';
import { peopleHandlers } from './people';
import { organizationsHandlers, legalBasisHandlers } from './organizations';

// Handlers MSW de todos los módulos
export const handlers = [
  ...authHandlers,
  ...catalogsHandlers,
  ...settingsHandlers,
  ...municipalitiesHandlers,
  ...agenciesHandlers,
  ...peopleHandlers,
  ...organizationsHandlers,
  ...legalBasisHandlers,
];
