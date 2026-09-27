# Plan de Desarrollo Frontend — Sistema de Gestión de Pensionados (SGP)

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Gestión de Pensionados (SGP) — Frontend |
| Cliente | Ministerio de Trabajo de la República de Cuba (INASS / SSIP) |
| Documento | Plan de Desarrollo Frontend por Fases |
| Versión | 1.0 |
| Fecha | 2026-09-27 |
| Estado | Borrador para aprobación del equipo |
| Documentos relacionados | `01_Requisitos_Funcionales_Frontend.md` (RF-FE), `02_Diseno_Arquitectura_Frontend.md` (ADRs, capas, patrones) |
| Documentos de origen | `04_Plan_de_desarrollo.md` (backend v1.0 con 13 sprints, 7 fases) |
| Alcance | Implementación completa del frontend React + TailwindCSS hasta go-live |

---

## 1. Introducción y alineación con plan backend

### 1.1 Propósito

Este documento expande la estrategia de ejecución del frontend del SGP en un **plan operativo**: define, fase por fase y sprint por sprint, qué se construye, en qué orden, con qué dependencias del backend, qué entregables se verifican y qué criterios objetivos permiten declarar cada etapa como terminada. No sustituye a los requisitos ni a la arquitectura: es el puente entre ambos y el código.

### 1.2 Enfoque

Implementación **incremental vertical**, espejo del backend: cada fase del frontend se alinea con una fase del backend y solo inicia cuando el backend correspondiente ha publicado los endpoints necesarios. Esto evita el anti-patrón de "construir todo el frontend contra mocks y reacomodar después" — cada feature frontend se desarrolla cuando su contrato API real está disponible o, en su defecto, contra un mock MSW claramente versionado.

### 1.3 Cadencia

- Sprints de **2 semanas** (espejo del backend).
- Total = **13 sprints + 1 sprint 0 de setup** = 14 sprints ≈ 28 semanas calendario (~7 meses).
- Arranque nominal: una semana después del arranque backend (ej. si backend arranca 2026-10-05, frontend arranca 2026-10-12 para dejar al backend un sprint de ventaja en setup).
- Colchón implícito del ~15 % absorbido en la duración de cada fase.

### 1.4 Equipo sugerido frontend

| Rol | Dedicación | Responsabilidades |
|---|---|---|
| Tech lead / Arquitecto frontend | 50 % | Revisión de PRs, decisiones arquitectónicas, sync con backend |
| 2-3 Desarrolladores React senior | 100 % | Implementación por feature |
| 1 Diseñador UX/UI | 50 % (F0-F1), 25 % (F2+) | Design system, pantallas, prototipos |
| 1 QA / Automation | 100 % | Tests E2E, accessibility, performance |

### 1.5 Ceremonias

- **Planning** (1 h): al inicio de cada sprint.
- **Daily** (15 min): sincronización diaria.
- **Refinement** (1 h): mid-sprint, refinamiento del backlog.
- **Review/Demo** (1 h): al cierre, con stakeholders del Ministerio.
- **Retrospective** (30 min): al cierre.

### 1.6 Gates de fase frontend

Cada fase termina en un **gate objetivo y verificable**. La superación del gate se registra en `docs/gates/FE-<fase>.md`. Sin gate superado, no se inicia la siguiente fase.

---

## 2. Visión por fases

| Fase FE | Sprints | Semanas | Módulos frontend | Dependencia backend |
|---|---|---|---|---|
| FE-F0 Setup | 1 (S0) | 2 | Infraestructura de proyecto | — |
| FE-F1 Layout + Auth | 1 (S1) | 2 | AppLayout, Sidebar, Login, Auth flow | BE-F0 (login demo) |
| FE-F2 Catálogos + Configuración | 1 (S2) | 2 | Catálogos, municipios, agencias, configuración general | BE-F1 S2 (catalogs + settings) |
| FE-F3 Personas + Usuarios | 1 (S3) | 2 | Maestro de personas, gestión de usuarios | BE-F1 S3 (people + users/me enriquecido) |
| FE-F4 Estructura organizacional | 1 (S4) | 2 | Entidades, oficinas, firmas, base legal | BE-F2 S4 (organizations + legal-basis) |
| FE-F5 Expedientes (CRUD + subregistros) | 1 (S5) | 2 | Expedientes, salarios, servicios, ciclos | BE-F3 S5 |
| FE-F6 Expedientes (máquina de estados) | 1 (S6) | 2 | Transiciones, historial, reapertura | BE-F3 S6 |
| FE-F7 Cálculo (elegibilidad + servicio) | 1 (S7) | 2 | Elegibilidad, años servicio, salario promedio | BE-F4 S7 |
| FE-F8 Cálculo (cuantía + simulación) | 1 (S8) | 2 | Cuantía, simulador, trazabilidad | BE-F4 S8 |
| FE-F9 Pensionados | 1 (S9) | 2 | Pensionados, ciclo de vida, reclasificación | BE-F5 S9 |
| FE-F10 Pagos + Control bancario | 1 (S10) | 2 | Controles bancarios, nómina | BE-F5 S10 |
| FE-F11 Reportes + Dashboard | 1 (S11) | 2 | Reportes, exportaciones, dashboard | BE-F6 S11 |
| FE-F12 Auditoría + Hardening | 1 (S12) | 2 | Bitácoras, idempotencia, If-Match, a11y WCAG | BE-F6 S12 |
| FE-F13 UAT + Performance + Go-live | 1 (S13) | 2 | UAT, performance, despliegue | BE-F7 S13 |

---

## 3. Sprint por sprint

### FE-S0 — Setup

| Aspecto | Detalle |
|---|---|
| **Semanas** | 1-2 |
| **Objetivo** | Cimientos técnicos: repo, Vite, Tailwind, ESLint, Prettier, Vitest, Playwright, GitHub Actions, MSW base, TanStack Query, Zustand, React Router, i18next, shadcn/ui setup. |
| **Entregables principales** | `package.json` con dependencias fijadas; `vite.config.ts` con alias `@/`; `tsconfig.json` con `strict: true`; `tailwind.config.ts` con design tokens INASS (colores, tipografía); `eslint.config.js` con plugins (react, hooks, a11y, import); `.prettierrc` con plugin-tailwindcss; `vitest.config.ts`; `playwright.config.ts` con 3 browsers; GitHub Actions workflow `ci.yml` verde; setup MSW con handler dummy; setup TanStack Query con `QueryClient` y Devtools; setup Zustand con `auth-store` y `ui-store` skeletons; setup React Router con `PublicLayout` y `AppLayout` skeletons; setup i18next con namespace `common` y detección de idioma; setup shadcn/ui con `Button`, `Input`, `Dialog`, `Toast`, `Dropdown` copiados al repo; README con instrucciones de setup; `docs/gates/FE-F0.md` con checklist de gate. |
| **Dependencias backend** | Ninguna. |
| **Gate 0 — Criterios** | (1) `npm run dev` levanta app con AppLayout vacío y Sidebar placeholder. (2) `npm run build` produce `dist/` < 250 KB gzip. (3) `npm run lint && npm run type-check && npm run test:unit` verde. (4) `npm run test:e2e` con un test simple (visitar `/` y ver título) verde en los 3 browsers. (5) GitHub Actions pipeline verde en PR. (6) `docs/gates/FE-F0.md` firmado por tech lead. |

### FE-S1 — Layout + Login + RBAC

| Aspecto | Detalle |
|---|---|
| **Semanas** | 3-4 |
| **Objetivo** | Layout base autenticado (AppLayout + Sidebar + TopBar), pantalla de login funcional, flujo de sesión, RBAC con route guards. |
| **Entregables principales** | `AppLayout.tsx` con grid header + sidebar + main + footer; `Sidebar.tsx` con entradas filtradas por permiso (sidebar-config con las 10 entradas de módulos previstos); `TopBar.tsx` con avatar, rol, logout, selector de idioma; `PublicLayout.tsx`; `LoginPage.tsx` con formulario Zod + React Hook Form; `Forbidden.tsx`; `NotFound.tsx`; `ProtectedRoute.tsx` con guard de permiso; `auth-store.ts` Zustand con token, user, roles, permissions; `use-permiso.ts` hook; HTTP client Axios con interceptors (auth header, 401 redirect, idempotency); handlers MSW para `POST /auth/login`, `GET /auth/me` (con roles/permissions mockeados), `POST /auth/logout`; tests de integración para login flow; test E2E `auth.spec.ts`. |
| **Dependencias backend** | BE-S1 entregado: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`. |
| **Riesgo crítico** | El backend debe publicar `/auth/me` enriquecido con `roles` y `permissions`. Si no lo hace, el frontend usa handler MSW que simula estos datos para los 5 roles — **debe haber un ADR backend pendiente** para enriquecer `/auth/me`. |
| **Gate 1 — Criterios** | (1) Login exitoso para los 5 roles. (2) Sidebar muestra entradas distintas según rol. (3) Logout funciona y redirige a login. (4) Sesión persistente tras refresco (sessionStorage). (5) Expiración de token → redirección a login con mensaje. (6) 401 en cualquier request → redirect login. (7) Ruta protegida sin permiso → 403. (8) E2E auth flow verde. |

### FE-S2 — Catálogos + Configuración general

| Aspecto | Detalle |
|---|---|
| **Semanas** | 5-6 |
| **Objetivo** | Implementar los 16 catálogos uniformes, municipios, agencias y configuración general versionada. |
| **Entregables principales** | Feature `catalogs/` con: página listado genérico `CatalogListPage` para los 16 tipos; página dedicada `MunicipalitiesPage`; página dedicada `AgenciesPage`; feature `settings/` con `GeneralSettingsListPage`, `GeneralSettingsCurrentPage`, formulario de nueva vigencia; schemas Zod para `CatalogItem`, `Municipality`, `Agency`, `GeneralSettingVersion`; hooks TanStack Query (`useCatalog`, `useCreateCatalogItem`, `useMunicipalities`, `useAgencies`, `useGeneralSettings`, `useCurrentSettings`); handlers MSW auto-generados desde OpenAPI; tests de contrato por endpoint; tests E2E: crear provincia, crear municipio, crear agencia, crear nueva vigencia de configuración. |
| **Dependencias backend** | BE-S2 entregado: endpoints de `Catalogs` (16 tipos via `/catalogs/{type}`), `Municipalities`, `Agencies`, `Settings/GeneralSettings`. Tag backend `v1.0.0-fase1`. |
| **Detalles UX** | Encadenamiento provincia → municipios en formularios. Manejo del caso especial Isla de la Juventud (`province_id = null`). `code` inmutable en edición. Acción "Desactivar" con confirmación. |
| **Gate 2 — Criterios** | (1) CRUD completo de los 16 catálogos. (2) CRUD de municipios con encadenamiento. (3) CRUD de agencias con filtros. (4) CRUD de configuración general con validación `max ≥ base`. (5) Consulta de vigente actual. (6) Eliminación de vigencia futura (no efectiva) → 200; efectiva → 409. (7) Code inmutable en edición → 422 capturado. (8) Tests E2E verdes. |

### FE-S3 — Personas + Usuarios

| Aspecto | Detalle |
|---|---|
| **Semanas** | 7-8 |
| **Objetivo** | Maestro de personas completo, gestión de usuarios (solo admin), eliminación del handler MSW que enriquecía `/auth/me`. |
| **Entregables principales** | Feature `people/` con: `PeopleListPage` (busqueda por CI y por nombre); `PersonCreatePage` con wizard; `PersonDetailPage` con tabs (Datos personales, Expedientes, Pensionado, Auditoría); `PersonEditPage` con CI inmutable; modal de registro de fallecimiento; schema Zod con `CubanIdentityNumber` (validación de 11 dígitos + dígito verificador); feature `users/` con `UsersListPage`, `UserCreatePage`, `UserEditPage` (roles assignment); eliminación del handler MSW `/auth/me` enriquecido — el backend real ya devuelve roles/permissions; tests E2E: crear persona, buscar persona por CI, registrar fallecimiento. |
| **Dependencias backend** | BE-S3 entregado: endpoints de `People` (CRUD + búsqueda), `Users` con `roles` y `permissions`. Tag backend `v1.0.0-fase1` actualizado. |
| **Riesgo crítico** | Si el backend **NO** entrega `/auth/me` enriquecido en BE-S3, se mantiene el handler MSW con un ADR backend pendiente (deuda técnica). |
| **Detalles UX** | Validación client-side del CI cubano con mensajes específicos por error (formato, dígito verificador, ya existe). Manejo de duplicados: si el backend responde 409 con persona existente, ofrecer navegar a la ficha. Buscador por CI con debounce 300 ms. |
| **Gate 3 — Criterios** | (1) CRUD personas. (2) Búsqueda por CI exacto. (3) Búsqueda por nombre con desambiguación de homónimos. (4) Validación CI client-side. (5) Registro de fallecimiento con advertencia de pensión activa. (6) `code` inmutable en edición → 422. (7) Gestión de usuarios con asignación de roles (solo admin). (8) Eliminación de handler MSW `/auth/me` (si backend entrega enriquecido). |

### FE-S4 — Estructura organizacional + Base legal

| Aspecto | Detalle |
|---|---|
| **Semanas** | 9-10 |
| **Objetivo** | Entidades, oficinas, jerarquías, firmas autorizadas y base legal con vigencias. |
| **Entregables principales** | Feature `organizations/` con: `EntitiesListPage`, `EntityCreatePage`, `EntityDetailPage` con tabs (Datos, Firmas, Jerarquía); `OfficesListPage`, `OfficeCreatePage`; `AuthorizedSignaturesTable` subrecurso; vista árbol opcional `EntityTree`; feature `legal-basis/` con `LegalBasisListPage`, `LegalBasisCreatePage`; schema Zod para `Entity`, `Office`, `AuthorizedSignature`, `LegalBasis`; handlers MSW auto-generados (si backend ya publicó) o manuales (si no); tests E2E: crear entidad con directores, crear oficina con jerarquía, crear base legal con vigencia. |
| **Dependencias backend** | BE-S4 entregado: endpoints de `Organizations` (entities, offices, signatures), `LegalBasis`. Tag backend `v1.1.0-fase2`. |
| **Detalles UX** | Encadenamiento provincia → municipios. Selector de oficina superior filtrado por tipo y provincia (excluye propio registro y descendientes). Selector de entidad superior con misma restricción. Indicador de vigencia en base legal (badge verde/gris). Selector de base legal vigente al aprobar expediente (filtrar derogadas). |
| **Gate 4 — Criterios** | (1) CRUD entidades con directores. (2) CRUD oficinas con jerarquía acíclica. (3) CRUD firmas autorizadas. (4) CRUD base legal con vigencias. (5) Validación de coherencia geográfica (RN-04) → 422 capturado. (6) Validación de jerarquía acíclica (RN-03) → 422 capturado. (7) Vista árbol de jerarquía opcional. |

### FE-S5 — Expedientes (CRUD + subregistros)

| Aspecto | Detalle |
|---|---|
| **Semanas** | 11-12 |
| **Objetivo** | Expediente como agregado raíz + subregistros (salarios, servicios, ciclos). |
| **Entregables principales** | Feature `pension-cases/` con: `CaseListPage` con filtros (estado, oficina, persona, fechas, número); `CaseCreatePage` wizard (proponente, oficina, centro trabajo, cargo, categorías, último salario); `CaseDetailPage` con tabs (Resumen, Subregistros, Historial placeholder, Cálculo placeholder); `SalaryRecordsTable` (CRUD inline con UNIQUE(expediente, año)); `ServiceRecordsTable` (CRUD inline con detección de solapamientos); `WorkCyclesTable`; schema Zod para `PensionCase`, `SalaryRecord`, `ServiceRecord`, `WorkCycle`; handlers MSW; tests E2E: crear expediente, añadir salarios, añadir servicios con solapamiento (debe advertir). |
| **Dependencias backend** | BE-S5 entregado: endpoints de `PensionCases` (CRUD + subrecursos). Tag backend `v1.2.0-fase3`. |
| **Detalles UX** | El número del expediente se genera server-side — el frontend no lo pide. El estado inicial es `submitted`. El importe del último salario formateado como CUP con `MoneyInput`. Detección visual de años consecutivos ausentes en la serie salarial. Servicios abiertos (sin `end_date`) marcados con badge "Vigente". Advertencia visual (no bloqueante) de solapamientos de servicios. |
| **Gate 5 — Criterios** | (1) Crear expediente con todos los datos. (2) CRUD salarios con UNIQUE(expediente, año) → 422 capturado. (3) CRUD servicios con validación end ≥ start → 422. (4) Detección visual de solapamientos. (5) CRUD ciclos con enteros no negativos. (6) Listado con filtros funcionando. (7) Detalle con tabs. |

### FE-S6 — Expedientes (máquina de estados + historial)

| Aspecto | Detalle |
|---|---|
| **Semanas** | 13-14 |
| **Objetivo** | Implementar la máquina de estados del expediente con transiciones, historial append-only y reapertura administrativa. |
| **Entregables principales** | `CaseStatusFlow.tsx` visualización de estados (4 badges con actual resaltado, transiciones permitidas como botones); `TransitionModal.tsx` con campos (motivo/nota obligatorio, base legal obligatoria en approve); hook `useCaseActions` (devuelve acciones permitidas según estado y permisos); `CaseHistoryTable.tsx` read-only; mirror de `CaseStateMachine` en Domain Layer (helper de labels y transiciones); handler MSW para `POST /pension-cases/{id}/transitions`; tests E2E: submit → review → approve (pensionado creado automáticamente, se valida con fetch a `/pensioners`); submit → reject (motivo obligatorio); reapertura admin (approved → under_review). |
| **Dependencias backend** | BE-S6 entregado: endpoint `POST /pension-cases/{id}/transitions`, historial como subrecurso. Tag backend `v1.2.0-fase3` actualizado. |
| **Detalles UX** | Los botones de transición solo se muestran si el usuario tiene el permiso Y la transición es válida. Modal de transición con validación estricta. Tras aprobación exitosa, toast "Expediente aprobado, pensionado creado con cuantía X CUP" + enlace al pensionado. Tras denegación exitosa, toast "Expediente denegado" + razón visible. |
| **Gate 6 — Criterios** | (1) Transiciones permitidas funcionan (submit→review→approve/reject). (2) Transiciones no permitidas → 422 con mensaje inline. (3) Historial append-only visible. (4) Reapertura admin funciona para terminales → under_review. (5) Reapertura no admin → 403. (6) Aprobación dispara creación de pensionado (validado con fetch). |

### FE-S7 — Cálculo (elegibilidad + servicio + promedio)

| Aspecto | Detalle |
|---|---|
| **Semanas** | 15-16 |
| **Objetivo** | Implementar la visualización de elegibilidad, cómputo de años de servicio y salario promedio (sin cuantía aún). |
| **Entregables principales** | Feature `calculation/` con: tab "Cálculo" en `CaseDetailPage`; llamada a `POST /pension-cases/{id}/calculation-preview`; `EligibilityCards.tsx` (edad, años mínimos, criterios con ✓/✗ y explicación); `YearsOfServiceDisplay.tsx`; `AverageSalaryDisplay.tsx` con formato CUP; `WarningsList.tsx` con advertencias del backend; handlers MSW; tests E2E: simular cálculo en expediente `submitted` y en `under_review`. |
| **Dependencias backend** | BE-S7 entregado: endpoint `POST /pension-cases/{id}/calculation-preview` (parcial: elegibilidad + años + promedio). Tag backend `v1.3.0-fase4` parcial. |
| **Detalles UX** | Todo read-only: el frontend no calcula nada, solo muestra. Criterios de elegibilidad con tarjetas verde/rojo. Advertencias con icono amarillo. |
| **Gate 7 — Criterios** | (1) Simulación muestra elegibilidad. (2) Simulación muestra años de servicio. (3) Simulación muestra salario promedio. (4) Advertencias visibles. (5) Sin persistencia (no afecta al expediente). |

### FE-S8 — Cálculo (cuantía + persistencia + trazabilidad)

| Aspecto | Detalle |
|---|---|
| **Semanas** | 17-18 |
| **Objetivo** | Completar el simulador con cuantía, mostrar trazabilidad de versión de configuración y cuantía persistida en expedientes aprobados. |
| **Entregables principales** | `QuantiaDisplay.tsx` con `MoneyDisplay` formato CUP y etiqueta "Cuantía estimada (no persistida)" en simulación, "Cuantía aprobada" en expediente approved; `ConfigVersionTrace.tsx` mostrando versión de `general_settings` usada (effective_from + parámetros); `MoneyDisplay.tsx` componente shared; `MoneyInput.tsx` para formularios; tests E2E: simular cálculo con cuantía, aprobar expediente y validar cuantía persistida visible. |
| **Dependencias backend** | BE-S8 entregado: endpoint `POST /pension-cases/{id}/calculation-preview` actualizado con cuantía y trazabilidad; feature de persistencia al aprobar. Tag backend `v1.3.0-fase4` completo. |
| **Detalles UX** | El frontend **no recalcula** la cuantía del pensionado — la muestra desde el campo persistido `pensioners.amount`. Muestra la versión de configuración como auditoría read-only. |
| **Gate 8 — Criterios** | (1) Simulación muestra cuantía estimada. (2) Aprobación persiste cuantía visible en pensionado. (3) Versión de configuración visible. (4) Sin recálculo client-side. |

### FE-S9 — Pensionados

| Aspecto | Detalle |
|---|---|
| **Semanas** | 19-20 |
| **Objetivo** | Implementar listado y ficha de pensionados, ciclo de vida (activo/suspendido/terminado) y reclasificación. |
| **Entregables principales** | Feature `pensioners/` con: `PensionersListPage` con filtros (provincia del control activo, tipo, régimen, estado); `PensionerDetailPage` con tabs (Datos, Expediente origen, Controles bancarios, Historial); modales de acción: `SuspendModal`, `ReactivateModal`, `TerminateModal`, `ReclassifyModal`; banner de sugerencia de baja por fallecimiento; handlers MSW; tests E2E: suspender pensionado, reactivar, terminar con motivo, reclasificar (director). |
| **Dependencias backend** | BE-S9 entregado: endpoints de `Pensioners` (CRUD + status + reclasificación). Tag backend `v1.4.0-fase5` parcial. |
| **Detalles UX** | Acciones solo visibles si `pensioners.manage` Y estado lo permite. Reclasificación solo para `director` y `admin`. Banner de fallecimiento si la persona tiene `death_date` registrado. |
| **Gate 9 — Criterios** | (1) Listado con filtros. (2) Ficha con tabs. (3) Suspensión con motivo. (4) Reactivación. (5) Terminación terminal. (6) Reclasificación (director+admin). (7) Banner fallecimiento visible. |

### FE-S10 — Pagos + Control bancario

| Aspecto | Detalle |
|---|---|
| **Semanas** | 21-22 |
| **Objetivo** | Implementar control bancario, asignación a pensionado, exportación de nómina con polling. |
| **Entregables principales** | Feature `payments/` con: `BankControlsListPage` con filtros (agencia, nómina electrónica, estado); `BankControlCreateForm` subrecurso de pensionado; `NominasExportPage` con formulario (agencia, año, mes); `PollingComponent` para estado de exportación en cola; `FileDownload` helper para blob CSV; handlers MSW; tests E2E: crear control bancario para pensionado con control existente (debe desactivar previo), exportar nómina (polling + descarga). |
| **Dependencias backend** | BE-S10 entregado: endpoints de `BankControls` + cola de exportación de nómina. Tag backend `v1.4.0-fase5` completo. |
| **Detalles UX** | Aviso al crear nuevo control "Se desactivará el control actual y se creará uno nuevo". Polling cada 5 s del estado de exportación. Toast "Generando, se notificará al completar". Al completar, descarga automática. |
| **Gate 10 — Criterios** | (1) CRUD controles bancarios. (2) Cambio de agencia/cuenta desactiva previo. (3) Número generado server-side. (4) Exportación nómina con polling. (5) Descarga del CSV. |

### FE-S11 — Reportes + Dashboard

| Aspecto | Detalle |
|---|---|
| **Semanas** | 23-24 |
| **Objetivo** | Implementar reportes de expedientes, pensionados y pagos, dashboard de KPIs y exportaciones CSV/Excel/PDF. |
| **Entregables principales** | Feature `reports/` con: `DashboardPage` home del operador (tarjetas KPIs + 2 gráficos con Recharts); `ExpedientesReportPage` con filtros + tabla + export CSV/Excel; `PensionersReportPage`; `PagosReportPage` (S); `ExportPdf` helper con jsPDF + autotable; `Recharts` integrado; handlers MSW; tests E2E: generar reporte de expedientes con filtros y descargar CSV, generar PDF de ficha de pensionado. |
| **Dependencias backend** | BE-S11 entregado: endpoints de `Reports` + exports en cola. Tag backend `v1.5.0-fase6` parcial. |
| **Detalles UX** | Caché de consultas dashboard con staleTime 5 min (TanStack Query). Exportación en cola con polling (igual que nómina). |
| **Gate 11 — Criterios** | (1) Dashboard con KPIs. (2) Reporte expedientes con filtros. (3) Export CSV/Excel. (4) Export PDF ficha. (5) Caché dashboard funciona. |

### FE-S12 — Auditoría + Hardening + OpenAPI sync

| Aspecto | Detalle |
|---|---|
| **Semanas** | 25-26 |
| **Objetivo** | Implementar bitácoras, hardening completo (optimistic locking, idempotencia, rate limiting handling), sync final con OpenAPI completo. |
| **Entregables principales** | Feature `audit/` con: `AuditLogPage` con filtros (usuario, entidad, acción, módulo, fechas); `DiffViewer` inline para `properties` JSON; tab "Auditoría" en entidades críticas; subrecurso "Restaurar" exclusivo admin; implementación de `If-Match`/ETag en todos los PATCH; implementación de `Idempotency-Key` en operaciones críticas (crear expediente, aprobar, generar control bancario); interceptor Axios para 429 con backoff exponencial; eliminación de TODOS los handlers MSW manuales restantes (todo va al backend real); sync final con OpenAPI completo publicado por backend; tests de contrato completos; tests E2E: ver diff de bitácora, restaurar soft delete, conflicto 409 al editar expediente modificado por otro, idempotencia al doble-click en aprobar. |
| **Dependencias backend** | BE-S12 entregado: endpoint de auditoría + hardening completo (If-Match, Idempotency-Key). Tag backend `v1.5.0-fase6` completo. |
| **Detalles UX** | DiffViewer con JSON pretty-print lado a lado. Modal "Recurso modificado por otro usuario, ¿recargar y reintentar?". Spinner "Procesando…" en operaciones con Idempotency-Key. Toast "El servidor está procesando muchas solicitudes, reintentando…" en 429. |
| **Gate 12 — Criterios** | (1) Bitácora con filtros. (2) DiffViewer inline. (3) Restaurar exclusivo admin. (4) If-Match en PATCH → 409 capturado. (5) Idempotency-Key en operaciones críticas. (6) 429 con backoff. (7) Cero handlers MSW manuales (todo backend real). (8) Sync OpenAPI completo. |

### FE-S13 — UAT + Performance + Go-live

| Aspecto | Detalle |
|---|---|
| **Semanas** | 27-28 |
| **Objetivo** | Verificación final con usuarios reales del Ministerio, performance tuning, despliegue a producción. |
| **Entregables principales** | Guion de UAT por rol (operador, specialist, director, admin, auditor); ejecución de UAT con mínimo 2 tramitadores, 1 revisor, 1 admin, 1 auditor; fixes de hallazgos de UAT (hasta 3 días de gracia); tuning de performance (code-splitting adicional si budget excedido); Lighthouse CI p95 en staging con scores ≥ 90; simulacro de rollback (deploy de versión previa); plan de despliegue con checklist de prerrequisitos (Nginx, CSP, certificados TLS); reunión Go/No-Go con acta firmada; tag `v1.0.0` en repo; monitoreo intensivo primera semana post-go-live; runbook de operación frontend. |
| **Dependencias backend** | BE-S13 entregado: backend en producción. |
| **Gate 13 — Go-live** | (1) UAT con acta firmada. (2) Lighthouse scores ≥ 90 (perf, a11y). (3) Performance budget dentro de límites. (4) Rollback ensayado. (5) Checklist despliegue completo. (6) Go/No-Go aprobado. (7) Tag `v1.0.0` en repo. (8) Runbook entregado. |

---

## 4. Matriz de sincronización frontend ↔ backend

| Sprint FE | Dependencia BE | Endpoint/feature BE requerido | Tag BE esperado |
|---|---|---|---|
| FE-S0 | — | — | — |
| FE-S1 | BE-S1 | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | `v1.0.0-fase0` |
| FE-S2 | BE-S2 | `GET/POST/PATCH/DELETE /catalogs/{type}`, `/municipalities`, `/agencies`, `/general-settings` | `v1.0.0-fase1` |
| FE-S3 | BE-S3 | `GET/POST/PATCH /people`, `GET/POST/PATCH /users` con roles/permissions | `v1.0.0-fase1` actualizado |
| FE-S4 | BE-S4 | `GET/POST/PATCH/DELETE /entities`, `/offices`, `/legal-bases` | `v1.1.0-fase2` |
| FE-S5 | BE-S5 | `GET/POST /pension-cases`, subrecursos salary-records, service-records, work-cycles | `v1.2.0-fase3` |
| FE-S6 | BE-S6 | `POST /pension-cases/{id}/transitions`, historial | `v1.2.0-fase3` actualizado |
| FE-S7 | BE-S7 | `POST /pension-cases/{id}/calculation-preview` (parcial) | `v1.3.0-fase4` parcial |
| FE-S8 | BE-S8 | `POST /pension-cases/{id}/calculation-preview` (completo), persistencia al aprobar | `v1.3.0-fase4` completo |
| FE-S9 | BE-S9 | `GET/POST /pensioners`, `PATCH /pensioners/{id}/status`, reclasificación | `v1.4.0-fase5` parcial |
| FE-S10 | BE-S10 | `GET/POST /bank-controls`, cola nómina | `v1.4.0-fase5` completo |
| FE-S11 | BE-S11 | `GET /reports/{report}`, `GET /exports/{report}.csv` | `v1.5.0-fase6` parcial |
| FE-S12 | BE-S12 | `GET /audit`, If-Match, Idempotency-Key en todas las operaciones | `v1.5.0-fase6` completo |
| FE-S13 | BE-S13 | Backend en producción, simulacro UAT conjunto | `v1.6.0-fase7` |

---

## 5. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Sprint | Mitigación |
|---|---|---|---|---|
| Backend no entrega `/auth/me` enriquecido en BE-S3 | Alta | Alto | FE-S1, FE-S3 | Handler MSW con roles/permissions mockeados. ADR backend pendiente. Deuda técnica documentada. |
| Cambios de spec OpenAPI rompen tipos generados | Media | Medio | todos | Tests de contrato en CI. Sync híbrido (auto + tags). Diff report antes de merge. |
| Cambios de modelo de datos backend no se reflejan en docs.json | Media | Alto | todos | Comunicación semanal con backend. Si backend cambia modelo sin docs.json, el frontend lo detecta en test de contrato. |
| Performance budget excedido por crecimiento orgánico | Media | Medio | FE-S11+ | Lighthouse CI en cada PR. Bundle analyzer. Code-splitting agresivo. |
| i18n keys incompletas en alguno de los 3 idiomas | Media | Bajo | todos | Script CI `validate:i18n` bloquea PR con keys faltantes. |
| Auditoría del Ministerio rechaza diseño UX | Media | Alto | FE-F1, FE-F4 | Demos semanales con analista del Ministerio desde FE-S1. Prototipos en Figma para aprobación antes de implementar. |
| Equipo frontend no disponible para UAT en FE-S13 | Baja | Alto | FE-S13 | Calendario UAT acordado 4 semanas antes. Backups designados. |
| Navegadores legacy en el Ministerio | Media | Medio | FE-S0 | Definir baseline de browsers soportados en FE-S0. Polyfills si es necesario. Comunicación con infraestructura del Ministerio. |
| Rate limiting (60 req/min) insuficiente para operaciones masivas | Baja | Medio | FE-S11+ | Batch requests en exportaciones. Caché agresiva en TanStack Query. Comunicación con backend si se necesita ajuste. |
| Cambios de requisitos del Ministerio a mitad de sprint | Media | Medio | todos | Ceremonia de gestión de cambios (issue `scope-change` evaluado en weekly). Opciones: aplazar, sustituir, ampliar (con +1 sprint máximo). |
| Inconsistencias entre docs.json y modelo de datos documentado | Media | Medio | FE-S4+ | Análisis cruzado en cada sprint. Si backend publica docs.json que contradice `03_Modelo_de_datos.md`, se levanta issue. |

---

## 6. Gates de fase frontend (resumen)

| Gate | Sprint | Criterio resumido |
|---|---|---|
| FE-Gate 0 | S0 | Repo, CI, dev server, build, lint, type-check, test básico |
| FE-Gate 1 | S1 | Login + logout + sesión persistente + RBAC + 5 roles + 401 redirect |
| FE-Gate 2 | S2 | 16 catálogos + municipios + agencias + configuración versionada |
| FE-Gate 3 | S3 | Personas + usuarios + validación CI cubano + handler `/auth/me` real |
| FE-Gate 4 | S4 | Entidades + oficinas + firmas + base legal + jerarquías acíclicas |
| FE-Gate 5 | S5 | Expedientes CRUD + subregistros + validaciones |
| FE-Gate 6 | S6 | Máquina de estados + transiciones + historial + reapertura admin |
| FE-Gate 7 | S7 | Cálculo (elegibilidad + años + promedio) |
| FE-Gate 8 | S8 | Cálculo (cuantía + persistencia + trazabilidad) |
| FE-Gate 9 | S9 | Pensionados + ciclo de vida + reclasificación |
| FE-Gate 10 | S10 | Control bancario + nómina con polling |
| FE-Gate 11 | S11 | Reportes + dashboard + exportaciones |
| FE-Gate 12 | S12 | Auditoría + hardening + sync OpenAPI completo + 0 handlers MSW manuales |
| FE-Gate 13 | S13 | UAT + Lighthouse + Go-live |

Cada gate se documenta en `docs/gates/FE-<fase>.md` con checklist firmado por tech lead.

---

## 7. Métricas de seguimiento frontend

| Métrica | Umbral de alerta | Fuente |
|---|---|---|
| Velocidad del sprint | -20 % frente a media de 3 sprints | Board del repo |
| Cobertura global | < 80 % | Vitest coverage en CI |
| Cobertura hooks y componentes críticos | < 90 % | Vitest coverage por feature |
| Bundle initial gzip | > 250 KB | `vite-bundle-visualizer` en CI |
| Bundle por ruta gzip | > 100 KB | `vite-bundle-visualizer` en CI |
| Lighthouse performance score | < 90 | Lighthouse CI |
| Lighthouse accessibility score | < 95 | Lighthouse CI |
| LCP (p95) en staging | > 2.5 s | Web Vitals |
| INP (p95) en staging | > 200 ms | Web Vitals |
| CLS en staging | > 0.1 | Web Vitals |
| Errores de cliente en producción | > 0 críticos | Sentry (o similar) |
| PRs abiertos > 3 días | > 20 % del total | Board del repo |
| Handlers MSW manuales restantes | > 0 al cierre de FE-S12 | Conteo en `mocks/handlers/manual/` |
| Deuda de gates abiertos | > 0 tras 1 semana de cierre nominal | `docs/gates/` |
| Hallazgos de a11y | cualquier error axe-core | axe-core en CI |

---

## 8. Ceremonias y gobernanza

### 8.1 Cadencia sprint

- **2 semanas** por sprint.
- **Planning** (1 h, lunes inicio): commitment de scope.
- **Daily** (15 min, todos los días): sincronización.
- **Refinement** (1 h, miércoles mid-sprint): refinamiento del backlog del próximo sprint.
- **Review/Demo** (1 h, viernes cierre): con stakeholders del Ministerio.
- **Retrospective** (30 min, viernes cierre): mejora continua.

### 8.2 Gates de fase

Revisados en la review del último sprint de la fase. Superación registrada en `docs/gates/FE-<fase>.md` con checklist firmado por tech lead.

### 8.3 Gestión de cambios de alcance

Issue `scope-change` evaluado en weekly semanal. Opciones:
- **Aplazar**: al backlog para sprint futuro.
- **Sustituir**: reemplazar un requisito existente de igual prioridad.
- **Ampliar**: añadir alcance con +1 sprint máximo (sujeto a aprobación de cliente).

### 8.4 Bloqueos y re-planificación

Cuando un bloqueo impide avanzar:
1. **Causa raíz documentada** en issue del repo.
2. **Plan de contingencia** si existe (handler MSW, endpoint alternativo).
3. **Re-planificación en 48 h**: extender (+1 sprint máx.), reducir alcance o aceptar deuda con plan de pago fechado.

### 8.5 Comunicación con backend

- **Weekly de sync** (30 min, miércoles): frontend y backend revisan el docs.json del próximo sprint.
- **Canal de texto** (Slack/Teams) para issues urgentes.
- **ADR compartido**: cambios en contrato API pasan por ADR backend que se referencia en ADR frontend.

---

## 9. Definición de done (DoD) frontend por sprint

Un sprint frontend se considera "done" cuando:

1. **Todo el scope comprometido** está implementado y mergeado a `main`.
2. **Tests unitarios e integración** con cobertura ≥ 80 % del código nuevo.
3. **Tests E2E** de los flujos críticos del sprint pasando en los 3 browsers.
4. **Linting y type-check** verde.
5. **Build** dentro del budget de bundle.
6. **Lighthouse CI** con scores ≥ 90 (perf) y ≥ 95 (a11y) en páginas nuevas.
7. **axe-core** sin errores en componentes nuevos.
8. **i18n** completo en los 3 idiomas para todos los strings nuevos.
9. **Documentación interna** (JSDoc, README de feature) actualizada.
10. **Sync API** con el tag backend correspondiente validado.
11. **Demo** con stakeholders del Ministerio realizada y feedback capturado.
12. **Gate de fase** (si aplica) firmado por tech lead.
13. **Deploy en staging** y smoke tests pasando.
14. **Code review** aprobado por al menos un par.
15. **CI pipeline** verde en `main`.

---

## 10. Hitos (milestones) clave

Cronograma nominal (arranque hipotético 2026-10-12, una semana después del backend):

| Hito | Fecha nominal | Evento |
|---|---|---|
| Arranque FE-S0 | 2026-10-12 | Inicio setup frontend |
| FE-Gate 0 (CI verde + dev server + AppLayout) | ~2026-10-26 | Cierre FE-F0, inicio FE-F1 |
| FE-Gate 1 (Login + RBAC + 5 roles) | ~2026-11-09 | Cierre FE-F1, inicio FE-F2 |
| FE-Gate 2 (Catálogos + Settings) | ~2026-11-23 | Cierre FE-F2, inicio FE-F3 |
| FE-Gate 3 (Personas + Usuarios) | ~2026-12-07 | Cierre FE-F3, inicio FE-F4 |
| FE-Gate 4 (Organizaciones + Base legal) | ~2026-12-21 | Cierre FE-F4, inicio FE-F5 |
| FE-Gate 5 (Expedientes CRUD + subregistros) | ~2027-01-04 | Cierre FE-F5, inicio FE-F6 |
| FE-Gate 6 (Máquina de estados + historial) | ~2027-01-18 | Cierre FE-F6, inicio FE-F7 |
| FE-Gate 7 (Cálculo: elegibilidad + servicio) | ~2027-02-01 | Cierre FE-F7, inicio FE-F8 |
| FE-Gate 8 (Cálculo: cuantía + simulación) | ~2027-02-15 | Cierre FE-F8, inicio FE-F9 — **alineado con BE-Gate 4 crítico** |
| FE-Gate 9 (Pensionados) | ~2027-03-01 | Cierre FE-F9, inicio FE-F10 |
| FE-Gate 10 (Control bancario + nómina) | ~2027-03-15 | Cierre FE-F10, inicio FE-F11 |
| FE-Gate 11 (Reportes + Dashboard) | ~2027-03-29 | Cierre FE-F11, inicio FE-F12 |
| FE-Gate 12 (Auditoría + Hardening + OpenAPI completo) | ~2027-04-12 | Cierre FE-F12, inicio FE-F13 |
| Go/No-Go frontend (UAT + Go-live conjunto) | ~2027-04-26 | Cierre FE-F13, **go-live conjunto frontend+backend a producción on-premise**, tag `v1.0.0` |

> **Notas:**
> - Las fechas son nominales y se recalculan al aprobarse el kickoff real.
> - El cronograma frontend está **alineado con el backend** (BE-Go-live nominal ~2027-04-05 → FE-Go-live nominal ~2027-04-26 con 3 semanas de desfasaje por arranque una semana después y dependencia serial en cada sprint).
> - Si el backend se retrasa en cualquier sprint, el frontend correspondiente también se retrasa (no hay workaround salvo mantener desarrollo contra mocks — deuda técnica).

---

## 11. Glosario operativo

| Término | Significado |
|---|---|
| Sprint FE | Sprint del frontend (2 semanas) |
| Gate FE | Gate de salida de fase frontend (verificado por tech lead) |
| Handler MSW | Handler de Mock Service Worker que simula un endpoint backend |
| Handler MSW auto-generado | Handler generado automáticamente desde el spec OpenAPI para endpoints publicados |
| Handler MSW manual | Handler creado a mano para endpoints no publicados todavía |
| Sync API | Proceso de regeneración de tipos TypeScript y handlers MSW desde docs.json |
| Tag backend | Versión tagged del repo backend que publica un conjunto de endpoints (ej. `v1.0.0-fase1`) |
| Feature branch | Branch temporal para probar sync con una nueva versión de docs.json antes de merge |
| Contract test | Test que valida que la respuesta real del backend matchea el schema esperado |
| Budget de bundle | Límite hard del tamaño del bundle inicial (250 KB gzip) |
| DoD | Definition of Done — checklist de criterios para declarar un sprint completo |

---

**Fin del documento.** Documentos relacionados: `01_Requisitos_Funcionales_Frontend.md` (RF-FE), `02_Diseno_Arquitectura_Frontend.md` (arquitectura técnica, ADRs, patrones).
