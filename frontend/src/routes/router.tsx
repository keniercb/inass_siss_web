import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layout/AppLayout';
import { PublicLayout } from '@/layout/PublicLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ModulePlaceholder } from '@/pages/ModulePlaceholder';
import { NotFound } from '@/pages/NotFound';

export const router = createBrowserRouter([
  // Rutas públicas
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
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
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'personas',
        element: (
          <ProtectedRoute permiso="people.view">
            <ModulePlaceholder
              title="Personas"
              description="Maestro de personas del SGP"
              sprint="FE-S3"
            />
          </ProtectedRoute>
        ),
      },
      {
        path: 'entidades',
        element: (
          <ProtectedRoute permiso="organizations.view">
            <ModulePlaceholder
              title="Entidades"
              description="Gestión de entidades empleadoras y oficinas"
              sprint="FE-S4"
            />
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
      {
        path: 'catalogos',
        element: (
          <ProtectedRoute permiso="catalogs.view">
            <ModulePlaceholder
              title="Catálogos"
              description="Catálogos uniformes, municipios, agencias y configuración"
              sprint="FE-S2"
            />
          </ProtectedRoute>
        ),
      },
    ],
  },
  // 404 catch-all
  { path: '*', element: <NotFound /> },
]);
