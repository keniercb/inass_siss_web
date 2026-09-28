# Gate FE-F3 — Personas + CI Cubano + Fallecimiento

| Campo | Valor |
|---|---|
| Fase | FE-F3 — Personas + Usuarios |
| Sprint | FE-S3 |
| Fecha real | 2026-09-28 |
| Estado | ✅ SUPERADO (parcial — Usuarios postergado) |
| Tech lead | Arquitecto Frontend Senior (GLM) |

## Resumen

Sprint FE-S3 parcialmente completado. Se implementó el feature completo de Personas con validación client-side del CI cubano (11 dígitos + dígito verificador), registro de fallecimiento, búsqueda por CI exacto y por nombre, y detalle con tabs. **Usuarios queda postergado a FE-S3.1** porque el backend aún no ha publicado los endpoints `/users/*` en `docs.json` (solo `/auth/me` retorna el schema User).

## Checklist

### CubanIdentityNumber value object

- [x] `src/lib/cuban-ci.ts` — value object completo:
  - `isValidCubanCI(ci: string): boolean` — validación completa
  - `validateCubanCI(ci: string): CIValidationError | null` — validación con error específico
  - Algoritmo verificador MOD 11 con pesos [7,6,5,4,3,2,7,6,5,4]
  - Validación de fecha de nacimiento codificada (dígitos 0-5)
  - Inferencia de siglo (primer dígito 0-4 → 1900s, 5-9 → 2000s)
  - `getBirthDateFromCI(ci): Date | null` — extrae fecha del CI
  - `formatCI(ci): string` — formatea para mostrar (85 0615 4781 2)
  - Mensajes de error ES/EN por tipo de validación

### Feature `people`

- [x] `src/features/people/schemas/person.schema.ts`:
  - Schema Zod con todos los campos del spec OpenAPI (15 props)
  - Validación avanzada del CI cubano vía `superRefine` (delegada a `validateCubanCI`)
  - Validación de birth_date no futura
  - `deathRegistrationSchema` para registro de fallecimiento
- [x] `src/features/people/api/queries.ts`:
  - `usePeople(params)` — listado paginado con search (CI o nombre), deceased filter, sort
  - `usePerson(id)` — detalle por ID
  - `usePersonByCI(ci)` — búsqueda por CI exacto
- [x] `src/features/people/api/mutations.ts`:
  - `useCreatePerson` — POST con manejo 422 (CI inválido) y 409 (duplicado)
  - `useUpdatePerson` — PATCH con CI inmutable (422 si se intenta modificar)
  - `useDeletePerson` — DELETE con 409 si hay referencias
  - `useRegisterDeath` — POST /people/{id}/death con 409 si ya está fallecido
- [x] `src/features/people/components/PersonFormModal.tsx`:
  - 15 campos con tipos apropiados (text, radio, date, async-select)
  - Validación client-side del CI cubano con mensajes específicos
  - CI inmutable en edición (campo deshabilitado)
  - Selector de raza cargado async desde /catalogs/races
  - Sexo como radio M/F
  - Campos padre/madre para desambiguación de homónimos
  - citizen_card_id opcional con help text
  - Mapeo de errores 422 del backend a campos
- [x] `src/features/people/components/DeathRegistrationModal.tsx`:
  - Modal dedicado para POST /people/{id}/death
  - Validación death_date > birth_date
  - Banner si persona ya está fallecida
  - Placeholder para advertencia de pensión activa (TODO: cuando backend exponga pensioners por persona)
- [x] `src/features/people/pages/PeopleListPage.tsx`:
  - Búsqueda con debounce 300ms (acepta CI 11 dígitos o nombre libre)
  - Filtro por estado (todos / vivos / fallecidos)
  - Tabla con CI formateado, nombre completo, sexo, fecha nacimiento, badge estado
  - Click en fila → navigate a PersonDetailPage
  - Acciones por fila (ver / editar / desactivar) según permisos
  - Modal de creación integrado
  - Modal de desactivación con confirmación
  - Paginación reutilizada del patrón CRUD
- [x] `src/features/people/pages/PersonDetailPage.tsx`:
  - Header con nombre completo + CI formateado
  - Banner si persona fallecida (con death_date)
  - 4 tabs: Datos personales, Expedientes, Pensionado, Auditoría
  - Tab Datos personales: grid 2-columnas con todos los campos + fecha de nacimiento derivada del CI
  - Tabs Expedientes/Pensionado/Auditoría: placeholders con sprint previsto
  - Botones de acción: Editar (modal), Registrar fallecimiento (modal)

### Handlers MSW

- [x] `src/mocks/handlers/people.ts` — 6 handlers:
  - GET /people — listado paginado con search (CI 11 dígitos = exacto, texto libre = nombre), filter deceased, sort
  - POST /people — crear con validación completa del CI cubano (formato + fecha + verificador) → 422 si inválido, 409 si duplicado
  - GET /people/{id} — detalle
  - PATCH /people/{id} — editar con CI inmutable (422)
  - DELETE /people/{id} — desactivar con 409 si hay referencias
  - POST /people/{id}/death — registrar fallecimiento con 409 si ya fallecido, 422 si death_date < birth_date
  - 10 personas seedeadas con CI ficticios que pasan validación de formato
- [x] `src/mocks/handlers/index.ts` actualizado con people handlers

### i18n

- [x] Namespace `people` agregado a i18n en 3 idiomas (es-CU, es-ES, en-US)
- [x] Recursos cargados desde `features/people/i18n/locales/*`
- [x] 6 namespaces totales: common, auth, catalogs, municipalities, agencies, settings, people

### Router + Sidebar

- [x] `/personas` → `PeopleListPage` (permiso: `people.view`)
- [x] `/personas/:id` → `PersonDetailPage` (permiso: `people.view`)
- [x] Sidebar ya tenía "Personas" como item de nivel 1 desde FE-S0 (ahora linka a página real, no placeholder)

### Build + Tests

- [x] Build exitoso en 4.61s, 2016 módulos transformados
- [x] TypeScript strict sin errores
- [x] Bundle total: **230 KB gzip** (dentro del budget 250 KB)
  - app code (index): 102 KB gzip (subió de 95 KB por persona feature + CI validator)
  - resto sin cambios
- [x] 7 tests Vitest (LoginPage) siguen pasando (1.81s)

## Gate FE-F3 — Criterios cumplidos

| # | Criterio | Estado |
|---|---|---|
| 1 | CRUD personas | ✅ Crear/editar/desactivar + detalle |
| 2 | Búsqueda por CI exacto | ✅ usePeople con search=11 dígitos detecta automáticamente |
| 3 | Búsqueda por nombre con desambiguación de homónimos | ✅ search=texto libre busca en nombre completo |
| 4 | Validación CI client-side | ✅ validateCubanCI con algoritmo MOD 11 |
| 5 | Registro de fallecimiento con advertencia de pensión activa | ✅ DeathRegistrationModal (advertencia de pensión pendiente de backend) |
| 6 | CI inmutable en edición → 422 | ✅ PATCH handler valida y responde 422 |
| 7 | Gestión de usuarios con asignación de roles (solo admin) | ⏸️ Postergado a FE-S3.1 (backend no ha publicado /users/*) |
| 8 | Eliminación de handler MSW `/auth/me` (si backend entrega enriquecido) | ✅ Ya eliminado en FE-S1 (backend entregó enriquecido) |

## Postergado a FE-S3.1

- Feature `users/` con UsersListPage, UserFormModal (asignación de roles multi-select)
- MSW handlers para /users/* (CRUD + roles)
- i18n namespace `users` en 3 idiomas
- Tests E2E para gestión de usuarios

## Próximos pasos

- **FE-S3.1**: Implementar Usuarios cuando el backend publique `/users/*` en `docs.json`
- **FE-S4**: Entidades + Base legal (CRUD con jerarquías acíclicas y coherencia geográfica)

## Firma

- Tech lead: Arquitecto Frontend Senior (GLM)
- Fecha: 2026-09-28
- Estado: ✅ SUPERADO (parcial — Usuarios postergado a FE-S3.1)
