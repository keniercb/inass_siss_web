import { authHandlers } from './auth';
import { catalogsHandlers } from './catalogs';
import { settingsHandlers } from './settings';

// Handlers MSW de todos los módulos
// Agregar aquí los handlers de nuevos módulos conforme se implementen
export const handlers = [
  ...authHandlers,
  ...catalogsHandlers,
  ...settingsHandlers,
];
