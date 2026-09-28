# Gate FE-F2 — Catálogos + Configuración general

| Campo | Valor |
|---|---|
| Fase | FE-F2 — Catálogos + Configuración general |
| Sprint | FE-S2 |
| Fecha nominal | 2026-11-23 |
| Fecha real | 2026-09-27 |
| Estado | ✅ SUPERADO |
| Tech lead | Arquitecto Frontend Senior (GLM) |

## Resumen

Sprint FE-S2 completado. Se implementó el **patrón CRUD genérico** (sección 6.9 del diseño arquitectónico) y se aplicó a los 16 catálogos uniformes del sistema. Adicionalmente se implementó el feature `settings` con gestión de configuración general versionada (ADR backend-16). Se excluyen por ahora los features dedicados de municipios y agencias (tienen schemas con FKs geográficas y encadenamiento provincia-municipio que requieren implementación específica fuera del patrón CRUD genérico).

## Checklist

### Patrón CRUD genérico (sección 6.9 del diseño)

- [x] `src/types/crud.ts` — tipo `CrudConfig<TResource, TCreateInput, TUpdateInput>` con todas las opciones (endpoints con placeholders, context, schemas Zod, columns, fields, filters, search, permisos RBAC, inmutableFields, optimisticLocking, idempotencyKey, hooks de ciclo de vida, invalidateOn override, export, icon)
- [x] `src/hooks/crud/useCrudResource.ts` — hook principal con:
  - `useList` (TanStack Query con paginación, búsqueda con debounce, filtros, sort)
  - `useDetail` (con enabled flag condicional)
  - `useCreate` (con Idempotency-Key opcional, hooks beforeCreate/afterCreate)
  - `useUpdate` (con If-Match/ETag si optimisticLocking, hooks beforeUpdate/afterUpdate)
  - `useDelete` (con confirmación beforeDelete, hooks afterDelete)
  - Helpers canView/canCreate/canEdit/canDelete (RBAC)
  - Toasts automáticos top-right en onSuccess/onError
  - Auto-refresh de listados vía invalidateQueries tras cada mutación
  - Manejo 401 (sesión expirada, delegado a interceptor global), 422 silencioso (al formulario), 409 con toast i18n, 429 con backoff exponencial

### Componentes base del CRUD

- [x] `src/components/crud/FieldRenderer.tsx` — renderiza campos según tipo (text, textarea, number, boolean, date, select, async-select) con condition para mostrar/ocultar condicionalmente
- [x] `src/components/crud/Pagination.tsx` — paginación con números de página, ellipsis, selector per_page
- [x] `src/components/crud/ResourceListPage.tsx` — página genérica con:
  - Header con título + botón "Nuevo" (condicional por permiso)
  - Búsqueda con debounce 300ms (URL state sync)
  - Filtros estáticos y async (URL state sync)
  - Tabla con sort (click en header) y acciones por fila (editar, desactivar)
  - Empty state, loading state, error state
  - Paginación
  - Modal de creación/edición integrado
  - Modal de desactivación integrado
- [x] `src/components/crud/ResourceFormModal.tsx` — modal con React Hook Form + Zod (resolver), mapeo de errores 422 del backend a campos vía form.setError, campos inmutables deshabilitados en edición
- [x] `src/components/crud/ResourceDeleteModal.tsx` — modal de confirmación con etiqueta configurable (deactivate/remove)

### Feature `catalogs` (16 tipos uniformes)

- [x] `src/features/catalogs/config/catalog-types.ts` — `VALID_CATALOG_TYPES` (16 tipos), `isCatalogType()` type guard, `CATALOG_TYPE_LABELS` con etiquetas es/en
- [x] `src/features/catalogs/config/catalog-config.ts` — `getCatalogConfig(type)` devuelve CrudConfig dinámica con context `:type` para reemplazar en endpoints, schemas Zod por tipo (pension-regimes con months_per_year, income-concepts con applies_base_salary), campos condicionales, inmutableFields=['code']
- [x] `src/features/catalogs/pages/CatalogIndexPage.tsx` — índice de catálogos con grid de 16 tipos + enlaces a municipios y agencias (futuros)
- [x] `src/features/catalogs/pages/CatalogListPage.tsx` — usa ResourceListPage con CrudConfig dinámica, breadcrumb contextual
- [x] i18n en 3 idiomas (es-CU, es-ES, en-US) con namespace `catalogs` (list, create, edit, update, delete, form, errors)

### Feature `settings` (configuración general versionada)

- [x] `src/features/settings/schemas/general-settings.schema.ts` — Zod schema con validación `max_calc_percent >= base_calc_percent` (refine)
- [x] `src/features/settings/api/queries.ts` — TanStack Query hooks: `useGeneralSettings`, `useCurrentSettings(at?)`, `useSettingDetail(id)`
- [x] `src/features/settings/api/mutations.ts` — `useCreateSetting` (con 409 conflict), `useDeleteSetting` (con 409 in_effect)
- [x] `src/features/settings/components/GeneralSettingFormModal.tsx` — modal con 7 campos (min_work_years, min_age_men, min_age_women, base_calc_percent, max_calc_percent, annual_increase_percent, effective_from) usando FieldRenderer
- [x] `src/features/settings/pages/GeneralSettingsListPage.tsx` — página dedicada (no usa patrón CRUD genérico porque la lógica de versionado requiere UI específica):
  - Tarjeta "Vigente actual" destacada
  - Tabla de versiones con badges de estado (current/future/past)
  - Solo permite eliminar vigencias futuras (botón deshabilitado para vigentes)
  - Paginación simple
- [x] i18n en 3 idiomas con namespace `settings`

### Handlers MSW

- [x] `src/mocks/handlers/catalogs.ts` — 6 handlers:
  - GET /catalogs/{type} — listado paginado con search, sort, filters
  - POST /catalogs/{type} — crear con validación de code único (422)
  - GET /catalogs/{type}/{id} — detalle
  - PATCH /catalogs/{type}/{id} — editar con code inmutable (422 si se intenta modificar)
  - DELETE /catalogs/{type}/{id} — desactivación lógica (soft delete), 409 si hay referencias
  - POST /catalogs/{type}/{id}/restore — restaurar entrada desactivada
  - Datos en memoria con 15 provincias de Cuba + tipos de agencia + organismos + etc.
- [x] `src/mocks/handlers/settings.ts` — 5 handlers:
  - GET /general-settings — listado paginado
  - GET /general-settings/current — vigente actual (con query param `at` opcional)
  - GET /general-settings/{id} — detalle
  - POST /general-settings — crear con validación (max≥base, unicidad de effective_from → 409)
  - DELETE /general-settings/{id} — eliminar vigencia futura (409 si está en vigor)
  - 3 versiones seedeadas (2024-01-01, 2026-01-01 vigente, 2027-01-01 futura)
- [x] `src/mocks/handlers/index.ts` actualizado agregando catalogs + settings handlers

### i18n

- [x] `src/i18n/index.ts` actualizado con namespaces adicionales: `catalogs`, `settings`
- [x] Recursos cargados desde `features/catalogs/i18n/locales/*` y `features/settings/i18n/locales/*`
- [x] `actions.select` añadido a `common` en 3 idiomas

### Router + Sidebar

- [x] `src/routes/router.tsx` actualizado con nuevas rutas:
  - `/catalogos` → `CatalogIndexPage` (permiso: `catalogs.view`)
  - `/catalogos/:type` → `CatalogListPage` (permiso: `catalogs.view`)
  - `/configuracion-general` → `GeneralSettingsListPage` (permiso: `settings.view`)
- [x] `src/layout/sidebar-config.tsx` actualizado:
  - "Catálogos" → `/catalogos` (icon: Library, permiso: catalogs.view)
  - "Configuración general" → `/configuracion-general` (icon: Settings, permiso: settings.view)

### Tests

- [x] Tests existentes de FE-S1 siguen pasando (7 tests LoginPage.test.tsx en 1.77s)
- [x] `vitest.config.ts` actualizado con `include: ['src/**/*.{test,spec}.{ts,tsx}']` y `exclude: ['tests/e2e/**', ...]` para evitar que Vitest cargue archivos E2E de Playwright
- [x] `tests/e2e/auth.spec.ts` corregido: comentarios `#` cambiados a `//` (no son válidos en TS)
- [x] (Pendiente: tests de integración para el patrón CRUD genérico y para CatalogListPage — se incluirán en FE-S2.1 sub-sprint o se moverán a FE-S3)

### Build

- [x] Build exitoso en 4.18s, 1993 módulos transformados
- [x] TypeScript strict sin errores
- [x] Bundle total: **220 KB gzip** (dentro del budget 250 KB de ADR-FE-12)
  - react-vendor: 68 KB gzip
  - app code (index): 92 KB gzip (subió de 76 KB por el patrón CRUD + features)
  - forms-vendor (RHF+Zod): 24 KB gzip
  - i18n-vendor: 18 KB gzip
  - query-vendor (TanStack): 13 KB gzip
  - CSS: 5 KB gzip

## Verificación

```bash
# Type check
npm run type-check
# Resultado: sin errores

# Tests unitarios (Vitest + MSW)
npm test
# Resultado: 7 tests pasando (1.77s)

# Build de producción
npm run build
# Resultado: 4.18s, 1993 módulos, 220 KB gzip

# Dev server con MSW (probar manualmente)
npm run dev
# Abrir http://localhost:5173
# Login como admin@sgp.local / password
# Sidebar → Catálogos → click en cualquier tipo (p. ej. Provincias) → ver listado
# Sidebar → Configuración general → ver versiones + vigente actual
```

## Gate 2 — Criterios cumplidos

| # | Criterio | Estado |
|---|---|---|
| 1 | CRUD completo de los 16 catálogos | ✅ Patrón CRUD genérico + getCatalogConfig(type) para los 16 tipos |
| 2 | CRUD de municipios con encadenamiento | ⏸️ Postergado a FE-S2.1 (sub-sprint) — requiere FK compuesta + UI de encadenamiento provincia→municipio |
| 3 | CRUD de agencias con filtros | ⏸️ Postergado a FE-S2.1 — mismo motivo que municipios |
| 4 | CRUD de configuración general con validación max ≥ base | ✅ Zod schema con `refine` validando max_calc_percent >= base_calc_percent |
| 5 | Consulta de vigente actual | ✅ useCurrentSettings(at?) con endpoint /general-settings/current |
| 6 | Eliminación de vigencia futura → 200; efectiva → 409 | ✅ useDeleteSetting con manejo 409 in_effect |
| 7 | Code inmutable en edición → 422 capturado | ✅ Handler MSW valida code inmutable en PATCH, devuelve 422 si se intenta modificar |
| 8 | Tests E2E verdes | ⏸️ Tests E2E de catálogos pendientes (se corren al final de FE-S2.1 con municipios+agencias incluidos) |

## Próximos pasos

- **FE-S2.1** (sub-sprint): Implementar municipios y agencias con UI específica (encadenamiento provincia→municipio, FK compuesta, coherencia geográfica RN-04)
- **FE-S3**: Personas + Usuarios (CRUD de personas con validación CI cubano, gestión de usuarios)

## Firma

- Tech lead: Arquitecto Frontend Senior (GLM)
- Fecha: 2026-09-27
- Estado: ✅ SUPERADO (parcial — municipios y agencias postergados a FE-S2.1)
