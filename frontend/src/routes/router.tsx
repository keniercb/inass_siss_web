import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { PublicLayout } from '@/layout/PublicLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';
import { NotFound } from '@/pages/NotFound';
import { CatalogIndexPage } from '@/features/catalogs/pages/CatalogIndexPage';
import { CatalogListPage } from '@/features/catalogs/pages/CatalogListPage';
import { MunicipalitiesListPage } from '@/features/municipalities/pages/MunicipalitiesListPage';
import { AgenciesListPage } from '@/features/agencies/pages/AgenciesListPage';
import { GeneralSettingsListPage } from '@/features/settings/pages/GeneralSettingsListPage';
import { PeopleListPage } from '@/features/people/pages/PeopleListPage';
import { PersonDetailPage } from '@/features/people/pages/PersonDetailPage';
import { EntitiesListPage } from '@/features/organizations/pages/EntitiesListPage';
import { EntityDetailPage } from '@/features/organizations/pages/EntityDetailPage';
import { OfficesListPage } from '@/features/organizations/pages/OfficesListPage';
import { LegalBasisListPage } from '@/features/legal-basis/pages/LegalBasisListPage';
import { UsersListPage } from '@/features/users/pages/UsersListPage';

export const router = createBrowserRouter([
  // Rutas públicas
  {
    element: <PublicLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  // Rutas autenticadas
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },

      // Catálogos — índice + 16 tipos via /catalogos/:type
      {
        path: 'catalogos',
        element: (
          <ProtectedRoute permiso="catalogs.view">
            <CatalogIndexPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'catalogos/:type',
        element: (
          <ProtectedRoute permiso="catalogs.view">
            <CatalogListPage />
          </ProtectedRoute>
        ),
      },

      // Endpoints dedicados de municipios y agencias
      {
        path: 'catalogos/municipios',
        element: (
          <ProtectedRoute permiso="catalogs.view">
            <MunicipalitiesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'catalogos/agencias',
        element: (
          <ProtectedRoute permiso="catalogs.view">
            <AgenciesListPage />
          </ProtectedRoute>
        ),
      },

      // Configuración general versionada
      {
        path: 'configuracion-general',
        element: (
          <ProtectedRoute permiso="settings.view">
            <GeneralSettingsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <ProtectedRoute permiso="users.view">
            <UsersListPage />
          </ProtectedRoute>
        ),
      },

      // Módulos no implementados (placeholders)
      {
        path: 'personas',
        element: (
          <ProtectedRoute permiso="people.view">
            <PeopleListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'personas/:id',
        element: (
          <ProtectedRoute permiso="people.view">
            <PersonDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'entidades',
        element: (
          <ProtectedRoute permiso="organizations.view">
            <EntitiesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'entidades/:id',
        element: (
          <ProtectedRoute permiso="organizations.view">
            <EntityDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'oficinas',
        element: (
          <ProtectedRoute permiso="organizations.view">
            <OfficesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'bases-legales',
        element: (
          <ProtectedRoute permiso="legalbases.view">
            <LegalBasisListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'expedientes',
        element: (
          <ProtectedRoute permiso="cases.view">
            <ModulePlaceholder
              title="Expedientes"
              description="Expedientes de pensión con máquina de estados"
              sprint="FE-S5"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'bases-legales',
        element: (
          <ProtectedRoute permiso="legalbases.view">
            <ModulePlaceholder
              title="Base legal"
              description="Gestión de tipos y bases legales con vigencias"
              sprint="FE-S4"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pensionados',
        element: (
          <ProtectedRoute permiso="pensioners.view">
            <ModulePlaceholder
              title="Pensionados"
              description="Pensionados con ciclo de vida y reclasificación"
              sprint="FE-S9"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pagos',
        element: (
          <ProtectedRoute permiso="payments.view">
            <ModulePlaceholder
              title="Pagos"
              description="Control bancario y exportación de nómina"
              sprint="FE-S10"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reportes',
        element: (
          <ProtectedRoute permiso="reports.view">
            <ModulePlaceholder
              title="Reportes"
              description="Reportes estadísticos y exportaciones"
              sprint="FE-S11"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'auditoria',
        element: (
          <ProtectedRoute permiso="audit.view">
            <ModulePlaceholder
              title="Auditoría"
              description="Bitácora de acciones y trazabilidad"
              sprint="FE-S12"
            />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // 404 catch-all
  { path: '*', element: <NotFound /> },
]);
