import { authHandlers } from './auth';
import { catalogsHandlers } from './catalogs';
import { settingsHandlers } from './settings';
import { municipalitiesHandlers } from './municipalities';
import { agenciesHandlers } from './agencies';
import { peopleHandlers } from './people';

// Handlers MSW de todos los módulos
// Agregar aquí los handlers de nuevos módulos conforme se implementen
export const handlers = [
  ...authHandlers,
  ...catalogsHandlers,
  ...settingsHandlers,
  ...municipalitiesHandlers,
  ...agenciesHandlers,
  ...peopleHandlers,
];
