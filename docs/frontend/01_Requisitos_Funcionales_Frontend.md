# Requisitos Funcionales — Frontend del Sistema de Gestión de Pensionados (SGP)

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Gestión de Pensionados (SGP) — Frontend |
| Cliente | Ministerio de Trabajo de la República de Cuba (INASS / SSIP) |
| Documento | Requisitos Funcionales Frontend |
| Versión | 1.0 |
| Fecha | 2026-09-27 |
| Estado | Borrador para revisión del equipo de desarrollo |
| Documentos relacionados | `02_Diseno_Arquitectura_Frontend.md`, `03_Plan_De_Desarrollo_Frontend.md` |
| Documentos de origen | `01_Requisitos_funcionales.md` (backend v1.0), `02_Diseno_de_arquitectura.md` (backend v1.7), `03_Modelo_de_datos.md` (v1.2), `docs.json` (OpenAPI 3.0.0, 23 operaciones en 3 tags) |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos funcionales y no funcionales del **frontend React** del Sistema de Gestión de Pensionados (SGP) del Ministerio de Trabajo de Cuba. Es la fuente primaria de verdad del alcance funcional del cliente web y la base contractual del ciclo de desarrollo frontend. Cada requisito posee un identificador único, una prioridad MoSCoW, dependencia explícita con requisitos del backend (RF-XXX) y una lista verificable de criterios de aceptación que servirá como inventario mínimo de pruebas de aceptación en la estrategia de testing descrita en el documento de arquitectura frontend.

Este documento **no duplica** los requisitos del backend: los asume como contratos y especifica cómo el frontend los consume, los presenta al usuario y los hace accionables según el rol. Toda regla de negocio cuya validación pertenece al dominio (cálculo de cuantía, elegibilidad, transiciones de estado del expediente, generación de números de secuencia) se trata como operación del backend, y el frontend se limita a invocarla, presentar resultados y manejar errores.

### 1.2 Alcance

El frontend cubre la **totalidad de la interacción operativa** del SGP con sus cinco roles previstos: administrador, director, especialista, operador y auditor. El acceso es exclusivamente interno (red del Ministerio o VPN corporativa) y no contempla un portal ciudadano de autogestión — este último, si se decide construir, será un proyecto aparte con su propio análisis de amenazas y modelo de auth.

El frontend expone los siguientes módulos funcionales, alineados con los doce módulos bounded contexts del backend:

1. **AUTH** — Autenticación y gestión de sesión.
2. **RBAC** — UI condicional por rol y permiso.
3. **CAT** — Catálogos geográficos, organizacionales y clasificatorios + configuración general versionada.
4. **PER** — Maestro de personas.
5. **ENT** — Entidades empleadoras, oficinas, firmas autorizadas y jerarquías.
6. **LEG** — Base legal con tipificación y vigencias.
7. **EXP** — Expedientes de pensión con máquina de estados, subregistros y transiciones.
8. **CAL** — Motor de cálculo: simulador interactivo y visualización de resultados.
9. **PEN** — Pensionados: alta automática, ciclo de vida, reclasificación.
10. **PAG** — Control bancario y exportación de nómina.
11. **REP** — Reportes y dashboard de indicadores.
12. **AUD** — Auditoría y bitácoras.

### 1.3 Convenciones de identificación

| Tipo | Formato | Significado |
|---|---|---|
| Requisito funcional frontend | `RF-FE-<MOD>-NNN` | Módulo (AUTH, RBAC, CAT, PER, ENT, LEG, EXP, CAL, PEN, PAG, REP, AUD) + correlativo |
| Requisito no funcional frontend | `RNF-FE-NNN` | Correlativo global |
| Regla de negocio frontend | `RN-FE-NNN` | Reglas derivadas que afectan UX |
| Hallazgo | `H-FE-NN` | Issue detectado durante el análisis |
| Dependencia backend | `Dep: RF-<MOD>-NNN` | RF backend que este requisito frontend consume |

Prioridad **MoSCoW**: `M` (Must, MVP), `S` (Should, deseable MVP), `C` (Could, backlog).

---

## 2. Modelo de roles y permisos

### 2.1 Roles definidos por el backend

El backend define cinco roles sembrados por `RolesAndPermissionsSeeder` (RF-SEG-002). El frontend los refleja **sin reinterprestarlos**: el rol es fuente de verdad, los permisos no se duplican en cliente.

| Rol técnico | Actor funcional | Uso principal |
|---|---|---|
| `admin` | Administrador | Todos los módulos; restaura soft deletes; reabre expedientes terminados; gestiona usuarios y catálogos |
| `director` | Director (provincial/municipal) | Aprueba/deniega expedientes; reclasifica pensionados; consulta reportes de su ámbito |
| `specialist` | Especialista | Revisa, valida y calcula; maneja subregistros |
| `operator` | Operador | Registra personas, entidades y expedientes en estado Solicitud; CRUD de catálogos |
| `auditor` | Auditor | Solo lectura; consulta bitácoras; exporta CSV |

### 2.2 Matriz rol × módulo × acción

La matriz siguiente define el conjunto de acciones por rol que el frontend debe habilitar o deshabilitar en la UI. La autorización final **siempre** la realiza el backend; el frontend solo optimiza la UX.

| Módulo | admin | director | specialist | operator | auditor |
|---|---|---|---|---|---|
| Auth (login, logout, me) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Catálogos — view | ✓ | ✓ | ✓ | ✓ | ✓ |
| Catálogos — manage | ✓ | — | — | ✓ | — |
| Configuración general — view | ✓ | ✓ | ✓ | — | ✓ |
| Configuración general — manage | ✓ | — | — | — | — |
| Personas — view | ✓ | ✓ | ✓ | ✓ | ✓ |
| Personas — manage | ✓ | — | ✓ | ✓ | — |
| Entidades — view / manage | ✓ / ✓ | ✓ / — | ✓ / — | ✓ / ✓ | ✓ / — |
| Oficinas — view / manage | ✓ / ✓ | ✓ / — | ✓ / — | ✓ / ✓ | ✓ / — |
| Base legal — view / manage | ✓ / ✓ | ✓ / — | ✓ / ✓ | ✓ / ✓ | ✓ / — |
| Expedientes — view | ✓ | ✓ (ámbito) | ✓ | ✓ (ámbito) | ✓ |
| Expedientes — create | ✓ | — | — | ✓ | — |
| Expedientes — edit (subregistros) | ✓ | — | ✓ | ✓ (solo Solicitud) | — |
| Expedientes — review | ✓ | ✓ | ✓ | — | — |
| Expedientes — calculate (preview) | ✓ | ✓ | ✓ | — | — |
| Expedientes — approve/reject | ✓ | ✓ | — | — | — |
| Expedientes — reopen (admin) | ✓ | — | — | — | — |
| Pensionados — view | ✓ | ✓ (ámbito) | ✓ | ✓ (ámbito) | ✓ |
| Pensionados — manage status | ✓ | ✓ | — | — | — |
| Pensionados — reclasify | ✓ | ✓ | — | — | — |
| Control bancario — view / manage | ✓ / ✓ | ✓ / — | ✓ / — | ✓ / ✓ | ✓ / — |
| Reportes — view | ✓ | ✓ (ámbito) | ✓ | ✓ (ámbito) | ✓ |
| Reportes — export | ✓ | ✓ | ✓ | — | ✓ |
| Auditoría — view | ✓ | ✓ | ✓ | — | ✓ |
| Usuarios — manage | ✓ | — | — | — | — |

### 2.3 Limitación crítica del spec OpenAPI actual

El schema `User` publicado en `docs.json` solo expone `id`, `name`, `email` — **no expone roles ni permisos**. El frontend necesita por tanto un endpoint `/auth/me` enriquecido que retorne roles y permisos (RF-FE-AUTH-004). Hasta que el backend lo publique, el frontend opera con un handler MSW que simula esta respuesta para los cinco roles, permitiendo desarrollo paralelo.

---

## 3. Layout base

### 3.1 Estructura general

Conforme al remark del cliente, el frontend debe contar con:

1. **Pantalla de login** (ruta pública `/login`).
2. **Pantalla principal** post-autenticación (ruta protegida `/`).
3. **Menú lateral (sidebar)** en la pantalla principal, con las funcionalidades visibles según el rol del usuario.
4. **Crecimiento incremental**: cada funcionalidad se añade una a la vez, conforme el backend publique los endpoints correspondientes y el cliente proporcione la estructura detallada de cada módulo.

### 3.2 Componentes del layout

| Componente | Responsabilidad | Estado |
|---|---|---|
| `PublicLayout` | Layout mínimo para login, recuperación de contraseña y error 404 público | MVP |
| `AppLayout` | Layout autenticado con header + sidebar + main + footer | MVP |
| `Sidebar` | Navegación lateral con secciones filtradas por rol y permisos | MVP |
| `TopBar` | Header con datos del usuario, rol, logout, idioma, notificaciones | MVP |
| `Breadcrumb` | Ruta contextual de navegación | MVP |
| `PageContainer` | Wrapper de página con título, acciones, contenido | MVP |
| `EmptyState` | Estado vacío (sin datos) con ilustración + acción primaria | MVP |
| `ErrorState` | Estado de error con código, mensaje y acción de reintento | MVP |
| `LoadingState` | Skeletons y spinners consistentes | MVP |

### 3.3 Comportamiento del sidebar por rol

El sidebar se construye a partir de la matriz rol×módulo×acción de la sección 2.2. Para cada rol:

- **admin**: ve todas las entradas del sidebar, incluyendo Usuarios y Configuración general.
- **director**: ve Expedientes, Pensionados, Reportes, Auditoría (su ámbito) y Catálogos (solo lectura). No ve Gestión de usuarios ni Configuración.
- **specialist**: ve Expedientes (con subsección Cálculo), Personas, Base legal y Reportes. No ve aprobaciones.
- **operator**: ve Personas, Entidades, Expedientes (solo Solicitud), Catálogos y Reportes (su ámbito).
- **auditor**: ve todos los módulos en modo solo lectura, con énfasis en Auditoría y Reportes.

El sidebar es **colapsable** para optimizar espacio en pantallas pequeñas. La preferencia se persiste en `localStorage` (no sensible).

---

## 4. Requisitos funcionales por módulo

### 4.1 Módulo AUTH — Autenticación y sesión

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-AUTH-001 | Pantalla de login | M | Formulario email + contraseña. Validación client-side con Zod (email RFC 5322, contraseña ≥ 8 caracteres). Botón primario deshabilitado hasta validar. Accesible (label + aria-invalid). Submit al backend `POST /api/v1/auth/login`. | RF-SEG-001 |
| RF-FE-AUTH-002 | Manejo de respuesta de login | M | En éxito, persistir token Sanctum en memoria (Zustand) y opcionalmente en `sessionStorage` para sobrevivir refrescos. En 401, mostrar mensaje "Credenciales inválidas". En 422, mapear `errors` por campo al formulario. En 429 (bloqueo tras 5 intentos), mostrar countdown y deshabilitar el formulario. | RF-SEG-001 |
| RF-FE-AUTH-003 | Logout | M | Botón en TopBar. Llama `POST /api/v1/auth/logout`. En éxito, limpia token, invalida TanStack Query cache y redirige a `/login`. En fallo de red, igualmente limpia estado local (no dejar colgado al usuario). | RF-SEG-001 |
| RF-FE-AUTH-004 | Carga de usuario autenticado | M | Tras login exitoso, llama `GET /api/v1/auth/me`. Si el backend devuelve el schema `User` actual (sin roles), usa un handler MSW en desarrollo para enriquecer la respuesta con `roles` y `permissions`. Cuando el backend publique `/auth/me` enriquecido, el handler MSW se elimina y el flujo es transparente. | RF-SEG-001 |
| RF-FE-AUTH-005 | Sesión persistente | M | Al cargar la app, si hay token en `sessionStorage`, intentar `GET /auth/me`. Si 401, redirigir a login. Si éxito, restaurar sesión. No usar `localStorage` para el token (hardening OWASP). | RF-SEG-001 |
| RF-FE-AUTH-006 | Expiración de token | M | Cuando cualquier request recibe 401, limpiar sesión y redirigir a `/login` con mensaje "Su sesión ha expirado, inicie sesión nuevamente". **No hay refresh tokens** en el spec actual del backend (RF-FE-AUTH-006 refleja la decisión del cliente "Bearer simple"). | RF-SEG-001 |
| RF-FE-AUTH-007 | Recuperación de contraseña | S | Pantalla `/recuperar-contrasena` con formulario email. Submit a endpoint backend de recuperación (pendiente de publicar). Maneja 200, 404 (email no registrado) y 429 (rate limiting). **No implementa reset directo** hasta que el backend defina el flujo. | RF-SEG-001 |
| RF-FE-AUTH-008 | Cierre de pestaña | S | Al cerrar la pestaña o navegar fuera, no se realiza logout explícito (el token sigue válido hasta expiración server-side o logout explícito). El token en `sessionStorage` se pierde al cerrar el navegador. | RF-SEG-001 |

### 4.2 Módulo RBAC — UI condicional

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-RBAC-001 | Route guards | M | Componente `<ProtectedRoute permiso="cases.approve">` que verifica permiso antes de renderizar la ruta. En fallo, renderiza `<Forbidden />` con código 403 y enlace de vuelta. | RF-SEG-002 |
| RF-FE-RBAC-002 | Sidebar por rol | M | Las entradas del sidebar se filtran por permisos del usuario. Cada entrada declara el permiso requerido. Las que no aplica se ocultan (no se deshabilitan con candado — sobrecarga visual innecesaria). | RF-SEG-002 |
| RF-FE-RBAC-003 | Botones y acciones condicionales | M | Botones de acción (Crear, Editar, Eliminar, Aprobar, Rechazar) se renderizan solo si el usuario tiene el permiso correspondiente. Implementado con hook `usePermiso('cases.approve')`. | RF-SEG-002 |
| RF-FE-RBAC-004 | Ámbito territorial | M | El backend filtra los expedientes visibles por territorio del usuario (RF-SEG-003). El frontend **no duplica** este filtro: confía en que la API solo devuelve lo permitido y maneja 403 con mensaje "No tiene permiso para acceder a este expediente". | RF-SEG-003 |
| RF-FE-RBAC-005 | Page titles y breadcrumbs contextuales | S | El título de cada página indica el módulo y la acción actual. Los breadcrumbs reflejan jerarquía de navegación. | — |
| RF-FE-RBAC-006 | Mensaje de 403 | M | Página `Forbidden` con ilustración, código 403, mensaje "No tiene permisos para acceder a este recurso" y enlace "Volver al inicio". | — |

### 4.3 Módulo CAT — Catálogos y configuración general

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-CAT-001 | Listado de catálogos uniformes | M | Página `/catalogos/:type` con tabla paginada. El `:type` debe ser uno de los 16 válidos (`provinces`, `agency-types`, `organizations`, etc.). Si el `type` no es válido, redirige a `/catalogos` con error. Header con buscador, ordenamiento y botón "Nuevo" (si `catalogs.manage`). Llama `GET /api/v1/catalogs/{type}`. | RF-CAT-001, RF-CAT-006 |
| RF-FE-CAT-002 | Filtros y búsqueda | M | Input de búsqueda libre (debounce 300 ms) que actualiza `?search=`. Selector de ordenamiento (`?sort=`) y dirección (`?order=asc/desc`). Selector de `per_page` (10, 25, 50, 100). Paginación con `?page=`. | RF-CAT-006 |
| RF-FE-CAT-003 | Formulario de creación | M | Modal o drawer con formulario. Campos variables según `type` (el schema `CatalogItem` mezcla `code`, `name`, `description`, `months_per_year`, `applies_base_salary`). El formulario discrimina por `type` y muestra solo los campos aplicables. Validación Zod por `type`. Submit `POST /api/v1/catalogs/{type}`. | RF-CAT-001 |
| RF-FE-CAT-004 | Edición con code inmutable | M | Al editar (PATCH), el campo `code` se deshabilita. Si el usuario intenta modificarlo (ej. vía DevTools), el backend responde 422 sobre `code`. El formulario muestra el error inline. | RF-CAT-001 |
| RF-FE-CAT-005 | Desactivación lógica | M | Acción "Desactivar" en cada fila (DELETE). Confirmación con modal. Tras éxito, remueve la fila de la vista actual. Si hay referencias activas, el backend responde 409 y se muestra mensaje "No se puede desactivar: hay expedientes o entidades que la referencian". | RF-CAT-001, RF-AUD-004 |
| RF-FE-CAT-006 | Gestión de municipios | M | Página dedicada `/catalogos/municipios` (NO usa el endpoint genérico). Filtros por provincia. Tabla con provincia embebida. Formulario encadena provincia → municipios. Maneja el caso especial Isla de la Juventud (`province_id = null`). | RF-CAT-002 |
| RF-FE-CAT-007 | Gestión de agencias bancarias | M | Página dedicada `/catalogos/agencias`. Filtros por provincia, municipio y tipo. Formulario encadena provincia → municipios + tipo. Muestra `code`, `name`, provincia, municipio y tipo en la tabla. | RF-CAT-003 |
| RF-FE-CAT-008 | Configuración general versionada | M | Página `/configuracion-general`. Listado de versiones. Botón "Nueva vigencia" (si `settings.manage`). Formulario con campos: `min_work_years`, `min_age_men`, `min_age_women`, `base_calc_percent`, `max_calc_percent`, `annual_increase_percent`, `effective_from`. Validación: `max_calc_percent ≥ base_calc_percent`. No permite `effective_from` anterior a la fecha actual. | RF-CAT-005 |
| RF-FE-CAT-009 | Consulta de configuración vigente | M | Sección "Vigente" que llama `GET /api/v1/general-settings/current`. Muestra los parámetros actuales con etiqueta "Vigente desde {effective_from}". Permite consultar vigente a una fecha pasada con input de fecha. | RF-CAT-005 |
| RF-FE-CAT-010 | Eliminación de vigencia futura | M | Acción DELETE solo habilitada para vigencias no efectivas (`effective_from > today`). Si se intenta eliminar una vigencia ya efectiva, el backend responde 409 y se muestra mensaje "No se puede eliminar una vigencia ya en vigor". | RF-CAT-005 |

### 4.4 Módulo PER — Personas

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-PER-001 | Listado de personas | M | Página `/personas`. Tabla con columnas: CI, primer apellido, primer nombre, segundo apellido, sexo, fecha nacimiento, acciones. Búsqueda por CI (exacto, 11 dígitos) o por combinación de apellidos+nombres (debounce). Paginación. | RF-PER-004 |
| RF-FE-PER-002 | Búsqueda por CI con desambiguación | M | Si la búsqueda por CI retorna un único resultado, navega a la ficha. Si retorna múltiples (caso de duplicados), muestra listado para desambiguar con datos adicionales (fecha de nacimiento, dirección). | RF-PER-004, RF-PER-005 |
| RF-FE-PER-003 | Formulario de alta | M | Formulario extenso: datos personales (CI, nombres, apellidos, sexo, fecha nacimiento, raza, dirección, nombres de padre/madre, ficha única). Validación estricta del CI cubano (11 dígitos + dígito verificador) con schema Zod `CubanIdentityNumber`. Sexo como radio M/F. Fecha de nacimiento no posterior a hoy. | RF-PER-001 |
| RF-FE-PER-004 | Validación client-side de CI | M | Schema Zod que valida formato (11 dígitos numéricos) y dígito verificador (algoritmo cubano). Mensajes de error específicos: "El CI debe tener 11 dígitos", "Dígito verificador incorrecto", "El CI ya está registrado" (este último depende de backend). | RN-001 |
| RF-FE-PER-005 | Edición con CI inmutable | M | En edición, el campo CI está deshabilitado. El backend responde 422 si se intenta modificar. Los demás campos son editables. Mostrar aviso "El CI no puede modificarse tras la creación". | RF-PER-002 |
| RF-FE-PER-006 | Ficha completa | M | Página `/personas/:id`. Muestra todos los datos,分行历史 de expedientes asociados (como proponente), estado de pensionado si aplica, controles bancarios. Tabs: Datos personales, Expedientes, Pensionado, Auditoría. | RF-PER-002 |
| RF-FE-PER-007 | Registro de fallecimiento | M | Acción en la ficha (si `people.manage`). Modal con campo `death_date`. Validación: `death_date > birth_date`. Tras éxito, muestra aviso en la ficha "Persona fallecida". Si hay pensión activa, muestra advertencia "Esta persona tiene una pensión activa; proceda a la baja del pensionado". | RF-PER-003 |
| RF-FE-PER-008 | Manejo de duplicados | S | Al intentar crear una persona con CI existente, el backend responde 409 con la persona registrada. El frontend muestra mensaje "Ya existe una persona con ese CI" y ofrece navegar a la ficha existente. | RF-PER-005 |

### 4.5 Módulo ENT — Entidades, oficinas y firmas

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-ENT-001 | Listado de entidades | M | Página `/entidades`. Tabla con código, NIT, organización, tipo, provincia, municipio, acciones. Filtros por organización, tipo, provincia. Búsqueda por código o NIT. | RF-ENT-001 |
| RF-FE-ENT-002 | Formulario de entidad | M | Formulario con código, NIT, organismo, tipo, provincia, municipio, dirección, teléfono, fax, email, director (persona), director económico (persona), entidad superior, objeto social. Validaciones: código y NIT únicos (server-side). Coherencia geográfica: encadenar provincia → municipios. | RF-ENT-001, RF-ENT-004 |
| RF-FE-ENT-003 | Jerarquía de entidades | S | Vista de árbol opcional (máx. 5 niveles) con toggles expandir/colapsar. Mostrar conteo de expedientes por entidad. Implementado con componente recursivo `EntityTree`. | RF-ENT-005 |
| RF-FE-ENT-004 | Gestión de oficinas | M | Página `/oficinas`. Listado con tipo, provincia, municipio, dirección, oficina superior. Formulario con encadenamiento de jerarquía (selector de oficina superior filtrado por tipo y provincia). | RF-ENT-002 |
| RF-FE-ENT-005 | Firmas autorizadas | M | Subrecurso de entidad: `/entidades/:id/firmas`. Tabla con persona, cargo, vigencia. Formulario de alta vinculado a la entidad actual. | RF-ENT-003 |
| RF-FE-ENT-006 | Validación de jerarquía acíclica | M | Al seleccionar `entidad superior` o `oficina superior`, excluir el propio registro y sus descendientes del selector. El backend valida server-side (RN-03); el frontend solo optimiza la UX. | RN-003 |

### 4.6 Módulo LEG — Base legal

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-LEG-001 | Listado de bases legales | M | Página `/bases-legales`. Tabla con tipo, número, año, organismo emisor, fecha emisión, fecha vigencia, estado (vigente/derogada). Filtros por año, tipo, organismo. Búsqueda por número o referencia. | RF-LEG-004 |
| RF-FE-LEG-002 | Formulario de alta | M | Tipo (select), número (string), fecha emisión, fecha puesta en vigor, organismo emisor (select), referencia. El año se deriva de `fecha_emision` (no se pide al usuario). Validación: `effective_date ≥ issue_date`. | RF-LEG-002 |
| RF-FE-LEG-003 | Indicador de vigencia | M | Columna con badge "Vigente" (verde) o "Derogada" (gris). Al pasar el cursor, mostrar fecha de derogación si aplica. | RF-LEG-003 |
| RF-FE-LEG-004 | Selector de base legal vigente en expediente | M | Al aprobar un expediente, el selector de base legal solo ofrece vigentes. Si se fuerza una derogada, mostrar aviso y requerir confirmación con motivo. | RF-LEG-003, RF-EXP-007 |

### 4.7 Módulo EXP — Expedientes con máquina de estados

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-EXP-001 | Listado de expedientes | M | Página `/expedientes`. Tabla con número, proponente, oficina, estado (badge coloreado), fecha solicitud, acciones. Filtros por estado, oficina, persona, rango de fechas, número. Exportación CSV (si `reports.export`). | RF-EXP-011 |
| RF-FE-EXP-002 | Detalle del expediente | M | Página `/expedientes/:id`. Layout con tabs: Resumen, Subregistros (salarios/servicios/ciclos), Historial, Cálculo. Botones de transición según estado actual y permisos. | RF-EXP-001 |
| RF-FE-EXP-003 | Formulario de creación | M | Wizard o formulario extenso: proponente (búsqueda de persona), oficina tramitadora (default: oficina del usuario), centro de trabajo (búsqueda de entidad), cargo, categorías (ocupacional, científica, nivel educacional), último salario (DECIMAL con formato moneda). El número se genera server-side (no se pide). | RF-EXP-001 |
| RF-FE-EXP-004 | Subregistro de salarios | M | Tabla editable dentro del expediente. Año (select 1950..actual+1), salario devengado (DECIMAL con formato moneda). Advertencia visual si hay años consecutivos ausentes. UNIQUE(expediente, año) → manejar 422 con mensaje "Ya existe un registro para el año {year}". | RF-EXP-002 |
| RF-FE-EXP-005 | Subregistro de servicios | M | Tabla con entidad, fecha inicio, fecha fin (opcional), checkbox coletilla. Validación: `end_date ≥ start_date`. Detección de solapamientos → advertencia visual no bloqueante. Servicios abiertos (sin `end_date`) marcados con badge "Vigente". | RF-EXP-003 |
| RF-FE-EXP-006 | Subregistro de ciclos | M | Tabla con días plan, días reales, cantidad de ciclos. Validación: enteros no negativos. | RF-EXP-004 |
| RF-FE-EXP-007 | Visualización de máquina de estados | M | Componente `CaseStatusFlow` que muestra los 4 estados (`submitted`, `under_review`, `approved`, `rejected`) con el actual resaltado. Transiciones permitidas resaltadas como botones; las no permitidas, ocultas o deshabilitadas con tooltip. | RF-EXP-005 |
| RF-FE-EXP-008 | Acción de transición | M | Cada transición (submit, review, approve, reject, reopen) abre un modal con campos: motivo/nota (obligatorio), base legal (obligatoria en approve). Submit `POST /pension-cases/{id}/transitions` con body `{action, note, legal_basis_id?}`. Maneja 422 (regla de transición violada) con mensaje inline. | RF-EXP-005, RF-EXP-006, RF-EXP-007, RF-EXP-008 |
| RF-FE-EXP-009 | Validación de completitud en revisión | M | Antes de pasar a `under_review`, el frontend puede mostrar un pre-check con la lista de completitud (persona, centro de trabajo, al menos un servicio, serie salarial, último salario). Si falta algo, advertir antes de invocar la transición. | RF-EXP-006 |
| RF-FE-EXP-010 | Reapertura administrativa | S | Acción visible solo para `admin` en expedientes terminales. Modal con motivo obligatorio. Advertencia: "La reapertura bloquea nuevos pagos del pensionado hasta re-resolución". | RF-EXP-010 |
| RF-FE-EXP-011 | Historial de estados | M | Tabla read-only en el expediente: from_status → to_status, usuario, fecha, nota. Append-only; sin acciones. | RF-EXP-009 |
| RF-FE-EXP-012 | Optimistic locking en edición | S | Al editar expediente o subregistros, capturar `updated_at` y enviarlo en PATCH. Si 409, mostrar modal "Otro usuario ha modificado el recurso. ¿Desea recargar y volver a intentar?". | RF-API-003 |

### 4.8 Módulo CAL — Motor de cálculo

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-CAL-001 | Simulador interactivo | M | Página `/expedientes/:id/calculo`. Llama `POST /pension-cases/{id}/calculation-preview`. Muestra: elegibilidad (booleano por criterio + explicación), años de servicio, salario promedio, cuantía estimada, advertencias. Todo read-only; no persiste. | RF-CAL-006 |
| RF-FE-CAL-002 | Visualización de elegibilidad | M | Tarjetas con cada criterio: edad mínima por sexo (cumple/no cumple, edad actual vs mínima), años mínimos de trabajo (cumple/no cumple, años acreditados vs mínimos). Color verde/rojo por criterio. | RF-CAL-001 |
| RF-FE-CAL-003 | Visualización de cuantía | M | Componente `MoneyDisplay` que muestra el importe en formato moneda CUP con separador de miles y 2 decimales. Indica "Cuantía estimada (no persistida)" hasta que el expediente se apruebe. | RF-CAL-004 |
| RF-FE-CAL-004 | Trazabilidad de versión de configuración | M | Al aprobar, mostrar el detalle de la versión de `general_settings` utilizada (`effective_from`, parámetros). Read-only. | RF-CAL-008 |
| RF-FE-CAL-005 | Visualización de resultado persistido | M | En expedientes aprobados, mostrar la cuantía persistida (`computed_amount`) y la versión de configuración usada. **No recalcular** en cliente. | RF-CAL-007 |
| RF-FE-CAL-006 | Advertencias de simulación | M | Lista de advertencias del backend (ej. "Años de servicio insuficientes", "Salario promedio por debajo del mínimo", "Faltan salarios en años intermedios"). Cada advertencia con icono y mensaje legible. | RF-CAL-006 |

### 4.9 Módulo PEN — Pensionados

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-PEN-001 | Listado de pensionados | M | Página `/pensionados`. Tabla con persona (CI + nombre), tipo pensión, régimen, cuantía, estado (badge: activo/suspendido/terminado), acciones. Filtros por provincia del control activo, tipo, régimen, estado. | RF-PEN-002 |
| RF-FE-PEN-002 | Ficha del pensionado | M | Página `/pensionados/:id`. Tabs: Datos, Expediente origen, Controles bancarios, Historial. Muestra cuantía persistida (read-only). | RF-PEN-002 |
| RF-FE-PEN-003 | Acción de suspensión | M | Botón "Suspender" (si `pensioners.manage` y estado `active`). Modal con campo motivo obligatorio. Submit `PATCH /pensioners/{id}/status` con `{action: 'suspend', reason}`. | RF-PEN-003 |
| RF-FE-PEN-004 | Acción de reactivación | M | Botón "Reactivar" si estado `suspended`. Modal con motivo. | RF-PEN-003 |
| RF-FE-PEN-005 | Acción de terminación | M | Botón "Terminar" si estado `active` o `suspended`. Modal con motivo. Advertencia: "Esta acción es terminal". | RF-PEN-003 |
| RF-FE-PEN-006 | Reclasificación | S | Botón "Reclasificar" si `director` o `admin`. Modal con selector de tipo pensión y régimen, motivo obligatorio. Muestra advertencia sobre la trazabilidad de la reclasificación. | RF-PEN-004 |
| RF-FE-PEN-007 | Sugerencia de baja por fallecimiento | S | Si la persona del pensionado tiene `death_date` registrado, mostrar banner en la ficha: "Esta persona consta como fallecida el {date}. Proceda a la terminación de la pensión." con botón directo a la acción de terminación. | RF-PER-003, RF-PEN-003 |

### 4.10 Módulo PAG — Pagos y control bancario

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-PAG-001 | Listado de controles bancarios | M | Página `/controles-bancarios`. Tabla con número, agencia, cuenta, nómina electrónica (badge), pensionado (CI + nombre), estado (activo/inactivo). Filtros por agencia, marcador nómina, estado. | RF-PAG-001, RF-PAG-002 |
| RF-FE-PAG-002 | Creación de control bancario | M | Formulario desde la ficha del pensionado (subrecurso) o desde el listado. Pensionado (selector), agencia (select con encadenamiento provincia→municipio→agencia), cuenta (validación formato bancario), nómina electrónica (checkbox). El número se genera server-side. | RF-PAG-001 |
| RF-FE-PAG-003 | Cambio de agencia/cuenta | M | Si el pensionado ya tiene control activo, al crear uno nuevo el backend desactiva el anterior automáticamente. Mostrar aviso "Se desactivará el control actual y se creará uno nuevo". | RF-PAG-002 |
| RF-FE-PAG-004 | Exportación de nómina electrónica | S | Acción en el listado: "Exportar nómina". Form con agencia y período (año + mes). Submit dispara job en cola (endpoint pendiente de publicar). Mostrar toast "Generando exportación, se notificará al completar". Polling de estado cada 5 s. Cuando termine, descargar el archivo (URL firmada). | RF-PAG-004 |
| RF-FE-PAG-005 | Manejo de concurrencia | M | El número de control bancario se genera con `SELECT ... FOR UPDATE` (ADR-17). Si el backend responde 409 (conflicto de secuencia), reintentar automáticamente con backoff exponencial (máx 3 reintentos). Mostrar spinner "Procesando…". | RF-PAG-006, RN-009 |

### 4.11 Módulo REP — Reportes y dashboard

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-REP-001 | Dashboard de indicadores | C | Página `/dashboard` (home del operador). Tarjetas con KPIs: expedientes por estado, tiempo medio de tramitación, tasa de aprobación. Gráficos (línea por mes, barras por oficina). Caché de consultas con TanStack Query (staleTime 5 min). | RF-REP-005 |
| RF-FE-REP-002 | Reporte de expedientes | M | Página `/reportes/expedientes`. Form con filtros (estado, oficina, rango fechas). Tabla de resultados + botones "Exportar CSV" y "Exportar Excel". Submit dispara job en cola; notificar al completar. | RF-REP-001, RF-REP-004 |
| RF-FE-REP-003 | Reporte de pensionados | M | Página `/reportes/pensionados`. Filtros por provincia del control activo, tipo, régimen. Mostrar monto total de cuantías. Exportación CSV/Excel. | RF-REP-002 |
| RF-FE-REP-004 | Reporte de pagos | S | Página `/reportes/pagos`. Filtros por agencia y marcador nómina. Mostrar pagos del período si RF-PAG-005 se aprueba. | RF-REP-003 |
| RF-FE-REP-005 | Exportación de ficha en PDF | S | Botón en ficha de expediente y de pensionado: "Exportar PDF". Genera documento con datos principales, subregistros e historial. Usa biblioteca client-side (p. ej. jsPDF + autotable) o pide al backend un endpoint PDF (pendiente). | RF-REP-004 |

### 4.12 Módulo AUD — Auditoría y bitácoras

| ID | Título | Prioridad | Descripción | Dep backend |
|---|---|---|---|---|
| RF-FE-AUD-001 | Bitácora de acciones | M | Página `/auditoria/acciones`. Tabla con fecha, usuario, acción, entidad, módulo. Filtros por usuario, entidad, acción, módulo, rango fechas. Exportación CSV. | RF-AUD-003 |
| RF-FE-AUD-002 | Historial del expediente | M | Subrecurso en la ficha del expediente: tabla con transiciones (from_status → to_status), usuario, fecha, nota. Read-only. | RF-AUD-002, RF-EXP-009 |
| RF-FE-AUD-003 | Visualización de diff | S | En la bitácora de acciones, botón "Ver diff" expande inline con un componente `DiffViewer` que muestre valores previos vs nuevos (formato JSON pretty-print). | RF-AUD-001 |
| RF-FE-AUD-004 | Restauración de soft delete | M | Acción exclusiva `admin` en listados: "Restaurar" para registros desactivados. Confirmación con motivo. | RF-AUD-004 |

---

## 5. Requisitos transversales

### 5.1 Internacionalización (i18n)

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| RF-FE-T-001 | Soporte multi-idioma | M | Configurar `react-i18next` con tres namespaces iniciales: `es-CU` (Cuba, prioritario), `es-ES` (neutro), `en-US` (opcional). Detección automática por `navigator.language` con fallback a `es-CU`. |
| RF-FE-T-002 | Namespaces por módulo | M | Cada módulo tiene su propio namespace JSON (`auth.json`, `catalogs.json`, `expedientes.json`, etc.) para evitar colisiones y facilitar carga diferida. |
| RF-FE-T-003 | Selector de idioma | S | Dropdown en TopBar con los tres idiomas. Preferencia persistida en `localStorage`. |
| RF-FE-T-004 | Formatos localizados | M | Fechas en formato `DD/MM/YYYY` (es-CU/es-ES) o `MM/DD/YYYY` (en-US). Moneda en CUP con separadores apropiados. Números con separador de miles. |
| RF-FE-T-005 | Pluralización | M | Manejo de plurales con reglas ICU (ej. "1 expediente" vs "5 expedientes"). |

### 5.2 Manejo de errores HTTP

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| RF-FE-T-006 | Error 401 Unauthorized | M | Interceptor Axios/Fetch que detecta 401, limpia sesión y redirige a `/login` con mensaje "Su sesión ha expirado". |
| RF-FE-T-007 | Error 403 Forbidden | M | Renderiza `<Forbidden />` con código, mensaje y enlace de vuelta. No mostrar detalles sensibles. |
| RF-FE-T-008 | Error 404 Not Found | M | Para recursos: `<NotFound />` con ilustración y enlace "Volver al listado". Para rutas: `<RouteNotFound />` con buscador. |
| RF-FE-T-009 | Error 409 Conflict | M | Para `general-settings`: "No se puede eliminar una vigencia ya en vigor". Para control bancario: reintento automático. Para entidades con dependencias: "No se puede desactivar: hay referencias activas". |
| RF-FE-T-010 | Error 422 Validation | M | Parsear `errors` como `Record<string, string[]>` y mapear cada mensaje al campo del formulario correspondiente con `setError` de React Hook Form. |
| RF-FE-T-011 | Error 429 Too Many Requests | M | Para login: bloqueo con countdown. Para APIs generales: backoff exponencial con hasta 3 reintentos. Mostrar toast "El servidor está procesando muchas solicitudes, reintentando…". |
| RF-FE-T-012 | Error 500 Internal Server Error | M | Página genérica con mensaje "Error interno del servidor. Contacte al soporte." y botón "Reintentar". Log del `request_id` para trazabilidad. |
| RF-FE-T-013 | Errores de red | M | Timeout configurable (10 s). Sin conexión: banner offline persistente con botón "Reintentar". |

### 5.3 Paginación y búsqueda

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| RF-FE-T-014 | Componente `Pagination` | M | Componente reutilizable con `<` `1 2 3 ... n >`. Muestra `current_page` de `last_page`. Total de registros. Selector de `per_page`. |
| RF-FE-T-015 | URL state | M | Filtros, página, `per_page`, `sort`, `order` sincronizados con URL (`useSearchParams`). Permite compartir/bookmarkar una vista filtrada. |
| RF-FE-T-016 | Búsqueda con debounce | M | Inputs de búsqueda con debounce 300 ms. Loading indicator en el input. Cancelación de requests en vuelo (AbortController). |

### 5.4 Soft delete UX

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| RF-FE-T-017 | Acción "Desactivar" | M | Etiqueta consistente "Desactivar" (no "Eliminar" ni "Borrar") para reflejar que es soft delete. Modal de confirmación con advertencia. |
| RF-FE-T-018 | Restauración exclusiva admin | M | Acción "Restaurar" visible solo para `admin` en una vista separada `/catalogos/desactivados` (por type) o tab "Desactivados" dentro de cada catálogo. |

### 5.5 Optimistic locking e idempotencia

| ID | Título | Prioridad | Descripción |
|---|---|---|---|
| RF-FE-T-019 | Captura de `updated_at` | M | Al cargar un recurso para edición, capturar `updated_at`. Enviar como `If-Match` header (RFC 7232) en PATCH. Si 409, modal "Recurso modificado por otro usuario". |
| RF-FE-T-020 | `Idempotency-Key` | S | Generar UUID v4 en operaciones críticas (crear expediente, aprobar, generar control bancario). Persistir 5 min para reintentos. Header `Idempotency-Key: <uuid>`. |

---

## 6. Requisitos no funcionales frontend

| ID | Categoría | Descripción | Criterio de verificación |
|---|---|---|---|
| RNF-FE-001 | Rendimiento | First Contentful Paint ≤ 1.5 s en conexión 4G | Lighthouse audit |
| RNF-FE-002 | Rendimiento | Time to Interactive ≤ 3 s en conexión 4G | Lighthouse audit |
| RNF-FE-003 | Rendimiento | Bundle initial ≤ 250 KB gzip (sin lazy-load) | `vite-bundle-visualizer` |
| RNF-FE-004 | Rendimiento | Bundle por ruta lazy-loaded ≤ 100 KB gzip | `vite-bundle-visualizer` |
| RNF-FE-005 | Rendimiento | LCP ≤ 2.5 s en p95 | Web Vitals en staging |
| RNF-FE-006 | Rendimiento | INP ≤ 200 ms en p95 | Web Vitals |
| RNF-FE-007 | Rendimiento | CLS ≤ 0.1 | Web Vitals |
| RNF-FE-008 | Accesibilidad | WCAG 2.1 AA | axe-core en CI |
| RNF-FE-009 | Accesibilidad | Navegación por teclado completa | Test manual + Playwright |
| RNF-FE-010 | Accesibilidad | Soporte lectores de pantalla (NVDA, JAWS, VoiceOver) | Test manual |
| RNF-FE-011 | Compatibilidad | Soporte Chrome 100+, Firefox 100+, Edge 100+ (sin IE) | BrowserStack |
| RNF-FE-012 | Seguridad | Token en `sessionStorage` (no `localStorage`); sin datos sensibles en URL | Revisión de código |
| RNF-FE-013 | Seguridad | Cabeceras CSP estrictas configuradas en Nginx | Revisión de configuración |
| RNF-FE-014 | Mantenibilidad | Cobertura ≥ 80 % en hooks y componentes críticos | Vitest coverage |
| RNF-FE-015 | Mantenibilidad | TypeScript `strict: true` sin `any` no justificado | ESLint + tsc |
| RNF-FE-016 | Internacionalización | 100 % de strings en archivos i18n (sin literales) | Script de validación |
| RNF-FE-017 | Disponibilidad | Disponibilidad ≥ 99.5 % en horario laboral 7×12 | Monitoreo uptime |
| RNF-FE-018 | Portabilidad | Desplegable on-premise con Nginx + assets estáticos | Despliegue limpio |

---

## 7. Matriz MoSCoW por sprint

La priorización se alinea con los 13 sprints del backend. Cada sprint del frontend depende de los endpoints publicados por el backend.

| Sprint FE | Módulos cubiertos | RF-FE prioritarios | Dependencia backend |
|---|---|---|---|
| FE-S0 | Setup | — | — |
| FE-S1 | Layout + Auth + RBAC | AUTH-001..008, RBAC-001..006 | BE-S1 (login demo) |
| FE-S2 | Catálogos + Configuración | CAT-001..010 | BE-S2 (catalogs + settings) |
| FE-S3 | Personas + Usuarios | PER-001..008 | BE-S3 (people + RBAC + auth/me enriquecido) |
| FE-S4 | Entidades + Base legal | ENT-001..006, LEG-001..004 | BE-S4 (organizations + legal-bases) |
| FE-S5 | Expedientes (CRUD + subregistros) | EXP-001..006 | BE-S5 (pension-cases + subrecursos) |
| FE-S6 | Expedientes (máquina estados + historial) | EXP-007..012 | BE-S6 (transiciones + historial) |
| FE-S7 | Cálculo (elegibilidad + servicio) | CAL-001..003, CAL-006 | BE-S7 (EligibilityChecker + salario promedio) |
| FE-S8 | Cálculo (cuantía + simulación) | CAL-004..005 | BE-S8 (cuantía + PreviewCalculationAction) |
| FE-S9 | Pensionados | PEN-001..007 | BE-S9 (pensioners + lifecycle) |
| FE-S10 | Pagos + Control bancario | PAG-001..005 | BE-S10 (bank-controls + nómina) |
| FE-S11 | Reportes | REP-001..005 | BE-S11 (reports + exports en cola) |
| FE-S12 | Auditoría + Hardening + OpenAPI sync | AUD-001..004, T-001..020 | BE-S12 (auditoría + hardening + idempotencia) |
| FE-S13 | UAT + Performance + a11y | RNF-FE-001..018 | BE-S13 (UAT) |

---

## 8. Glosario ES ↔ EN frontend

| Término (ES) | Equivalente código | Significado en frontend SGP |
|---|---|---|
| Pensionado | `pensioner` | Registro mostrado en `/pensionados/:id` con ficha completa |
| Expediente | `pension_case` | Registro mostrado en `/expedientes/:id` con tabs (resumen, subregistros, historial, cálculo) |
| Cuantía | `amount` / `computed_amount` | Display `MoneyDisplay` con formato CUP |
| Régimen | `pension_regime` | Selector en formularios de expediente y reclasificación |
| Control bancario | `bank_control` | Subrecurso de pensionado |
| Sidebar | `Sidebar` | Menú lateral del AppLayout, filtrado por rol |
| Guard de ruta | `ProtectedRoute` | Componente que verifica permiso antes de renderizar ruta |
| Hook de permiso | `usePermiso` | Hook Zustand que devuelve booleano para un permiso dado |
| Formulario de transición | `TransitionModal` | Modal para acciones de máquina de estados |
| Estado vacío | `EmptyState` | Componente para vistas sin datos |
| Skeleton | `LoadingState` | Placeholder animado durante carga |
| Badge de estado | `StatusBadge` | Componente que muestra estado con color semántico |
| Vigente | `current` | Etiqueta para configuración general efectiva a la fecha |
| Desactivar | `deactivate` | Etiqueta para acción de soft delete |

---

**Fin del documento.** Documentos relacionados: `02_Diseno_Arquitectura_Frontend.md` (arquitectura técnica), `03_Plan_De_Desarrollo_Frontend.md` (plan de ejecución sprint por sprint).
