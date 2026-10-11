# Requisitos Funcionales — Sistema de Gestión de Pensionados (SGP)

| Campo | Valor |
|---|---|
| Proyecto | Sistema de Gestión de Pensionados (SGP) |
| Cliente | Ministerio de Trabajo |
| Documento | Requisitos Funcionales |
| Versión | 1.0 |
| Fecha | 2026-09-22 |
| Estado | Borrador para revisión del equipo de desarrollo |
| Documentos relacionados | `Diseño de arquitectura.md`, `Modelo de datos.md` |
| Documento de origen | `mdeditor.a8RzJZB8.md` (modelos propuestos) |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos funcionales y no funcionales del **Sistema de Gestión de Pensionados (SGP)** para el Ministerio de Trabajo. Es la fuente primaria de verdad del alcance funcional y la base contractual del ciclo de desarrollo: cada requisito posee un identificador único, una prioridad MoSCoW y una lista verificable de criterios de aceptación que servirá, a su vez, como inventario mínimo de pruebas de aceptación en la estrategia TDD descrita en el documento de arquitectura. El documento parte del análisis crítico del modelo conceptual entregado por el cliente (`mdeditor.a8RzJZB8.md`), cuyos hallazgos se documentan en la sección 3 y justifican los requisitos derivados.

### 1.2 Alcance

El SGP cubre el ciclo de vida completo de la atención a pensionados: gestión de catálogos y datos maestros (geografía, organismos, entidades, oficinas, clasificadores), registro de personas y solicitantes, tramitación de expedientes de pensión con máquina de estados (Solicitud → Revisión → Aprobado/Denegado), motor de cálculo de cuantía parametrizado, alta y seguimiento de pensionados, gestión del control bancario y de pagos, así como los servicios transversales de seguridad (autenticación, RBAC), auditoría, reportes estadísticos y una API REST versionada.

Quedan fuera del alcance de esta versión: integración en línea con sistemas bancarios externos (la exportación de nómina electrónica se entrega como archivo), interoperabilidad con otras plataformas estatales, trámites en línea para el ciudadano (autogestión) y migración masiva de sistemas legados, que se aborda como proyecto aparte.

### 1.3 Audiencia

Equipo de desarrollo backend (arquitectos, desarrolladores Laravel, QA). El lenguaje es técnico directo; los identificadores de código y base de datos se expresan en inglés conforme a la convención acordada, con glosario de equivalencias ES↔EN en el documento `Modelo de datos.md`.

### 1.4 Convenciones del documento

- **Identificación**: `RF-<MOD>-NNN` para requisitos funcionales, `RNF-NNN` para no funcionales, `RN-NNN` para reglas de negocio y `H-NN` para hallazgos del análisis del modelo.
- **Módulos**: CAT (catálogos), PER (personas), ENT (entidades/oficinas), LEG (base legal), EXP (expedientes), CAL (cálculo), PEN (pensionados), PAG (pagos), SEG (seguridad), AUD (auditoría), REP (reportes), API (interfaz REST).
- **Prioridad MoSCoW**: `M` (Must, obligatorio MVP), `S` (Should, deseable MVP), `C` (Could, backlog).
- **Criterios de aceptación**: checklist verificable por requisito (`[ ]`). El conjunto de checklists constituye el inventario de pruebas de aceptación.
- **Origen**: cada requisito indica si proviene del modelo original (`MO`) o es derivado del análisis (`DA`).

### 1.5 Referencias

- Modelo conceptual de partida: `mdeditor.a8RzJZB8.md`.
- Marco legal de referencia cubano de Seguridad Social (Ley 105/2008 y complementarias): los parámetros específicos no se presuponen; se parametrizan vía `general_settings` y se listan como preguntas abiertas (sección 7).

---

## 2. Contexto del sistema

### 2.1 Descripción general

El SGP automatiza la atención a pensionados en la estructura territorial del Ministerio de Trabajo. Las oficinas territoriales capturan solicitudes de pensión, consolidan la información laboral del proponente (historial de servicios, salarios devengados y ciclos de trabajo), verifican la elegibilidad y calculan la cuantía conforme a la configuración general vigente. La aprobación genera el expediente resuelto con su base legal de respaldo y da de alta al pensionado con su tipo y régimen de pensión. Finalmente, el sistema administra los controles bancarios (agencia, cuenta, nómina electrónica) necesarios para el pago periódico de la pensión, con numeración secuencial controlada y reportes estadísticos para la toma de decisiones.

### 2.2 Actores y roles

| Actor | Descripción | Uso principal del sistema |
|---|---|---|
| Administrador | Personal técnico del Ministerio; gestiona usuarios, roles, catálogos y configuración | Todos los módulos |
| Director | Dirección de oficina (provincial/municipal); aprueba o deniega expedientes y consulta reportes de su ámbito | EXP, CAL, REP |
| Especialista | Tramitador de expedientes; revisa, valida y calcula | EXP, CAL, PEN |
| Operador | Personal de captura; registra personas, entidades y expedientes en estado Solicitud | PER, ENT, EXP |
| Auditor | Personal de control interno; acceso de solo lectura y bitácoras | AUD, REP |
| Servicio integrador | Cliente de la API REST para futuras integraciones (SSC, bancarios) | API |

La correspondencia entre actores y roles técnicos de la aplicación se detalla en la matriz de permisos del documento de arquitectura (sección 10).

### 2.3 Restricciones tecnológicas

- Stack: PHP 8.3+, Laravel 12.x, MySQL 8.4 LTS (InnoDB, `utf8mb4`).
- Arquitectura: monolito modular con TDD y patrones SOLID (ver `Diseño de arquitectura.md`).
- Despliegue on-premise en infraestructura del Ministerio; sin dependencia de servicios en la nube pública.
- Interfaz primaria: API REST JSON consumida por el frontend del Ministerio (fuera del alcance de este documento) y por los servicios integradores.

### 2.4 Estados del expediente y transiciones

La máquina de estados del expediente es requisito normativo del dominio: solo se permiten las transiciones de la tabla siguiente; cualquier intento fuera de esta matriz debe ser rechazado por el sistema y registrado en bitácora.

| Estado (ES) | Estado (EN / código) | Transiciones permitidas |
|---|---|---|
| Solicitud | `submitted` | → `under_review`, → `rejected` |
| Revisión | `under_review` | → `approved`, → `rejected`, → `submitted` (devolución) |
| Aprobado | `approved` | terminal (genera pensionado) |
| Denegado | `rejected` | terminal (motivo obligatorio) |

Los estados terminales admiten reapertura exclusivamente por el rol Administrador, como excepción auditada (requisito RF-EXP-010).

---

## 3. Análisis del modelo conceptual propuesto

### 3.1 Metodología

Se revisó el documento de modelos contra tres criterios: (1) completitud funcional del flujo de negocio (solicitud → cálculo → aprobación → pago), (2) integridad y tipado de datos para un dominio financiero-jurídico y (3) preparación para un desarrollo TDD con reglas verificables. Cada hallazgo produce una decisión de diseño que se refleja como requisito (DA) y se materializa en el modelo de datos corregido.

### 3.2 Hallazgos y decisiones

| ID | Hallazgo en el modelo original | Severidad | Decisión adoptada |
|---|---|---|---|
| H-01 | `Persona` clasificada como catálogo: es una entidad de negocio con ciclo de vida, no un dato de referencia | Alta | Mover a entidad de negocio del módulo People (RF-PER-*) |
| H-02 | Dinero como `Double` (`ultimo salario`, `salario devengado`, `cuantía`) | Alta | Tipar todo importe como `DECIMAL(12,2)`; punto flotante prohibido para dinero (RN-005) |
| H-03 | `cuantia: int` (entero) pierde los centavos de la pensión | Alta | `amount DECIMAL(12,2)` en `pensioners` (RF-PEN-001) |
| H-04 | Falta la relación Expediente → Pensionado: la aprobación no origina al pensionado en el modelo | Alta | Agregar `origin_case_id` en `pensioners`; alta automática al aprobar (RF-PEN-001) |
| H-05 | `Base legal` no se relaciona con ninguna entidad: la resolución aprobatoria queda huérfana | Alta | Agregar `approval_legal_basis_id` en `pension_cases` (RF-EXP-008) |
| H-06 | `ultimo control bancario` (contador de secuencia) embebido en `Configuracion general`: mezcla parámetros con estado transaccional | Media | Crear tabla de secuencias centralizada con bloqueo pesimista (RF-PAG-006) |
| H-07 | `Tipo de beneficiario` es catálogo sin entidad que lo consuma | Media | Mantener catálogo sembrado y abrir pregunta de negocio para el módulo de beneficiarios (sección 7) |
| H-08 | Catálogos sin unicidad explícita (`codigo`, `nombre`, número de identidad, número de expediente, NIT) | Alta | Definir constraints UNIQUE obligatorios en todas las tablas (RN-008) |
| H-09 | Sin trazabilidad: no existen campos de auditoría, bitácoras ni borrado lógico | Alta | Agregar `created_by/updated_by`, soft deletes, `activity_log` e historial de estados (RF-AUD-*) |
| H-10 | `estado` del expediente como texto libre | Media | Enum PHP respaldado por `VARCHAR(20)` + `CHECK` y matriz de transiciones (sección 2.4) |
| H-11 | `año: string(4)` en Base legal redundante con `fecha de emision` | Baja | Mantener como columna derivada e indexada para búsqueda documental |
| H-12 | Catálogos heterogéneos: algunos con `codigo`, otros solo `nombre` (Nivel educacional, Raza, Cargo, Régimen) | Baja | Estandarizar: PK surrogate + `UNIQUE(name)`; `code` solo donde exista en el dominio |
| H-13 | Redundancia geográfica: Oficina/Entidad/Agencia guardan provincia y municipio (el municipio ya determina la provincia) | Baja | Mantener ambas columnas por conveniencia de consulta, con validación de coherencia (RN-004) |
| H-14 | Errores tipográficos de nomenclatura (`propovente`, `Firma atorizada`, `Cliclo`, `clicos`, `nivel eduacional`) | Baja | Corregir semántica en español y aplicar naming inglés consistente (glosario) |
| H-15 | `Registro de servicio` sin control de solapamientos ni orden cronológico | Media | Validación de rangos y solapamientos a nivel de aplicación (RF-EXP-004) |
| H-16 | Falta entidad de pago periódico: los conceptos de ingreso no tienen transacciones asociadas (el catálogo `Tipo de pago` fue ELIMINADO por la corrección de usuario de la Task 42/SGP-36: la forma de pago vive en el tipo de agencia) | Media | Proponer `pension_payments` (marcado como propuesta, RF-PAG-005, pendiente de validación) |

### 3.3 Brechas funcionales derivadas

Del análisis anterior se derivan requisitos nuevos que el modelo original no contemplaba: numeración secuencial concurrente de controles bancarios (H-06), historial de estados del expediente (H-09/H-10), alta automática del pensionado con trazabilidad al expediente de origen (H-04), vinculación de la resolución legal a la aprobación (H-05), validación del número de identidad cubano (H-08), coherencia geográfica y jerárquica (H-13/H-15) y el subconjunto transversal de seguridad, auditoría, reportes y API REST que estructura los módulos SEG, AUD, REP y API. Estos requisitos se integran en el catálogo de la sección 4 con origen `DA`.

---

## 4. Requisitos funcionales por módulo

### 4.1 Módulo CAT — Catálogos y datos maestros

**RF-CAT-001 (M) — Gestión de catálogos simples (MO)**
El sistema permite crear, consultar, modificar y desactivar los catálogos simples con código y nombre: provincias, tipos de agencia, organismos, categorías científicas, categorías ocupacionales, tipos de pensión, tipos de entidad, tipos de oficina, tipos de base legal, niveles educacionales, tipos de beneficiario, razas, cargos, regímenes de pensión y conceptos de ingreso.
- [ ] Alta, edición, listado paginado y detalle por catálogo con los campos del modelo original.
- [ ] El código es único por catálogo y no modificable tras la creación (identificador estable de integración).
- [x] Todos los listados de catálogo devuelven el campo código (corrección de usuario, Task 31): los siete catálogos antes solo-nombre — niveles educacionales, tipos de beneficiario, razas, cargos, regímenes de pensión, tipos de pago y conceptos de ingreso — ganaron columna `code` VARCHAR(10) UNIQUE (obligatoria en el alta, inmutable tras la creación, sembrada con códigos de referencia; migración `2026_10_01_110000`), de modo que las dieciséis superficies uniformes responden con la clave natural de integración.
- [x] Columnas propias de los catálogos de pensión (corrección de usuario, Task 38/SGP-32): el régimen de jubilación gana `sector` INT NULL — opcional, devuelto por TODOS los endpoints del recurso genérico (201 del alta, detalle, listado y PATCH; PATCH sin el campo lo deja intacto, 422 con valor no entero; migración `2026_10_02_120100`) — y el tipo de pensión gana persona fallecida `deceased_person` TINYINT(1) NOT NULL DEFAULT 0 — booleano con DEFAULT false que responde la omisión del alta (422 con valor no booleano), devuelto por TODOS los endpoints (migración `2026_10_02_120200`); además el PATCH del recurso genérico relaja a `sometimes` las reglas `required` de las columnas propias, de modo que editar el sector ya no exige arrastrar `months_per_year`.
- [x] ELIMINACIÓN del catálogo Tipo de pago (corrección de usuario, Task 42/SGP-36, IMPLEMENTADA — migración `2026_10_03_100000`): la tabla `payment_types`, el modelo `PaymentType`, su seeder y la superficie `payment-types` del recurso genérico dejaron de existir — la forma de pago del cobro pasa a vivir EN el tipo de agencia (`payment_form`, ítem siguiente) —; nadie lo referencia (la propuesta `pension_payments` de RF-PAG-005 no está construida), de modo que la baja es una eliminación limpia del modelo y de la superficie de catálogos uniformes, que quedan en quince.
- [x] Forma de pago del tipo de agencia (corrección de usuario, Task 42/SGP-36, IMPLEMENTADA — migración `2026_10_03_100100`): `agency_types.payment_form` — enum de DOS valores en MINÚSCULAS unificadas, sin tildes, tal como los fijó el usuario: `tarjeta magnetica` y `nomina electronica` —, OBLIGATORIO con DEFAULT `tarjeta magnetica` (NOT NULL + CHECK en BD; la omisión del alta cae en el default — el patrón `deceased_person` de la Task 38 — y cualquier otro valor responde 422) y editable en PATCH (regla relajada a `sometimes` como el resto de las columnas propias); devuelto por TODOS los endpoints del catálogo `agency-types` (201, detalle, listado y PATCH) y sembrado explícito en el seeder; decide la obligatoriedad de la cuenta bancaria del cobro del expediente (RF-EXP-001).
- [ ] La eliminación es lógica (desactivación) y queda bloqueada cuando existan referencias activas.

**RF-CAT-002 (M) — Gestión de municipios (MO)**
- [ ] Cada municipio pertenece a una provincia, salvo el municipio especial (Isla de la Juventud) con provincia nula.
- [ ] El par código-provincia es único; dos municipios de distintas provincias pueden compartir código.
- [ ] Listado filtrable por provincia y búsqueda por nombre.

**RF-CAT-003 (M) — Gestión de agencias (MO)**
- [ ] Agencia con código único, nombre, provincia, municipio y tipo de agencia obligatorios.
- [ ] El municipio debe pertenecer a la provincia declarada (RN-004).

**RF-CAT-004 (M) — Carga inicial de catálogos (MO/DA)**
- [ ] Seeders idempotentes con 15 provincias y 168 municipios de Cuba (incluido el municipio especial Isla de la Juventud).
- [ ] Seeders de organismos de la Administración Central del Estado y catálogos clasificatorios de referencia (razas, niveles educacionales, categorías ocupacionales y científicas, tipos de pensión, regímenes y conceptos de ingreso; los tipos de pago dejan de sembrarse por la eliminación de la Task 42/SGP-36 y los tipos de agencia siembran además su `payment_form`).
- [ ] Los seeders son actualizables sin duplicar filas (upsert por clave natural).

**RF-CAT-005 (M) — Configuración general de única versión activa (MO + DA H-06; REIMPLEMENTADA Task 55/SGP-40, 2026-10-11, D-18..D-23 confirmados)**
El concepto se REIMPLEMENTA con EXACTAMENTE siete campos: la fecha umbral para combatientes (`combatant_threshold_date`, Date), el porciento aplicable ANTES del umbral (`pre_threshold_percent`, Double entre 0 y 1), el porciento aplicable DESPUÉS del umbral (`post_threshold_percent`, Double entre 0 y 1), el incremento a internacionalista (`internationalist_increment`, Double — MONTO absoluto de dinero, D-20 (b)), la pensión mínima (`minimum_pension`, Double), la pensión máxima (`maximum_pension`, Double) y el incremento de la pensión mínima (`minimum_pension_increment`, Double — MONTO absoluto, D-21 (b)). Los seis parámetros de los sprints anteriores — años mínimos de trabajo, edades mínimas por sexo y los tres porcientos del motor v1 — se ELIMINAN de la tabla, del wire y de la spec (D-19): sus columnas caen con su CHECK y su UNIQUE de `effective_from`, y todo payload que los traiga responde 422 EXPLÍCITO de campo retirado (doctrina anti-descarte-silencioso, el mismo trato de `office_id` y `amount`).
- [ ] Como REGLA solo existe UNA configuración activa a la vez (D-19 (b)): la base de datos la garantiza con una columna calculada `active_singleton` UNIQUE sobre el bit `active` (RN-008 — insertar una segunda activa rompe el constraint). La edición NO muta la histórica: publica una versión nueva (append-only) que se activa y desactiva la anterior en la MISMA transacción; cada versión guarda su sello de activación (`effective_from`, sellado por el puerto Clock — ya no lo elige el cliente) y su sello de baja (`deactivated_at`, que sustituye al `effective_to` derivado: el rango de vigencia queda ALMACENADO, no calculado en lectura).
- [ ] El timeline histórico es consultable (index/show) y la activa se resuelve en `GET /general-settings/current` sin parámetros; el parámetro `at` de la resolución temporal se RETIRA del contrato y responde 422 si llega (anti-descarte).
- [ ] Los montos de dinero (incremento internacionalista, pensiones mínima/máxima e incremento de la mínima) se almacenan `DECIMAL(12,2)` exacto (RN-005) y se sirven como Double en el JSON (D-22 (a)); los dos porcientos viven como Double entre 0 y 1 con CHECK en la base de datos y validación 422 en la petición; la coherencia `maximum_pension >= minimum_pension` se valida en la petición y con CHECK en la base de datos.
- [ ] La eliminación solo acepta versiones INACTIVAS (limpieza manual de la historia); la versión ACTIVA responde 409 — publicar una versión nueva es la única vía de cambio (inmutabilidad, RN-010).
- [x] VERSIÓN TRES DEL MOTOR (Task 57/SGP-42, 2026-10-11): el cálculo de cuantía SÍ consume la configuración ACTIVA — el umbral de combatientes decide PAU/PPU, el incremento internacionalista II y los topes PMin/IPmin/PMax cierran la cadena (RF-CAL-004 v3, D-24..D-33); la elegibilidad y el resto de parámetros SIGUEN en el RÉGIMEN (reajuste S7 intacto) y el SPM sigue sin configuración (RF-CAL-003). Wire: `pre_threshold_percent` y `post_threshold_percent` ganan el MISMO límite de precisión que los porcientos del régimen (regex de hasta 4 decimales, D-36 — el motor consume fracciones exactas de 4 decimales y un payload con más precisión responde 422 EXPLÍCITO en lugar de un redondeo silencioso).
- [ ] El seeder siembra UNA configuración activa NEUTRA (D-23 (b): umbral 1970-01-01, porcientos 0.0, montos 0.00) para que el Administrador cargue los valores reales al configurar; idempotente (firstOrCreate sobre la activa).
- [ ] El contador de control bancario se gestiona fuera de la configuración, vía secuencias (RF-PAG-006).
- [ ] (Histórico Fase 1) Cualquier cálculo registra qué versión de parámetros usó (trazabilidad, RF-CAL-008). (Task 51/S8, C-6: la «versión de configuración» es la CONGELACIÓN de los parámetros del régimen en el snapshot — `regime_parameters` —; `pension_cases.calculation_setting_id` DEPRECADA y fuera del wire; `general_settings` sin rol desde el reajuste S7 y AHORA reimplementada como parámetros de doctrina 2026 sin consumidor en el motor.) ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8.4): el snapshot `regime_parameters` congelado y el test de re-ejecución histórica que reproduce la cuantía exacta.

**RF-CAT-006 (S) — Búsqueda y filtrado transversal (DA)**
- [ ] Todos los listados soportan paginación, ordenamiento por columnas clave y filtro por texto.
- [ ] El tiempo de respuesta de listados de catálogos no supera lo exigido en RNF-002.

### 4.2 Módulo PER — Personas

**RF-PER-001 (M) — Registro de personas (MO)**
- [ ] Campos obligatorios: número de identidad, primer nombre, primer apellido, sexo, fecha de nacimiento y dirección.
- [ ] El número de identidad valida 11 dígitos, mes (dígitos 3-4) y día (dígitos 5-6); el sexo declarado se contrasta con la paridad del dígito 10 del carné (par masculino, impar femenino). Corregido 2026-09-30 (ADR-30, regla `CubanIdentityNumber`): el dígito verificador sigue diferido a P-08.
- [ ] El número de identidad es único en el sistema.
- [ ] Sexo restringido a `M`/`F`; fecha de muerte, si existe, posterior a la de nacimiento.

**RF-PER-002 (M) — Modificación con auditoría (MO + DA H-09)**
- [ ] Toda modificación registra usuario, fecha y valores previos en bitácora (RF-AUD-001).
- [ ] El número de identidad no es editable tras la creación (identidad estable).

**RF-PER-003 (M) — Registro de fallecimiento (MO)**
- [ ] Al fijar la fecha de muerte se bloquean nuevos trámites activos de la persona.
- [ ] El sistema advierte si la persona tiene pensión activa y orienta la baja (RF-PEN-003).
- [ ] El fallecimiento es datable y auditable (quién y cuándo lo registró).

**RF-PER-004 (M) — Búsqueda de personas (MO)**
- [ ] Búsqueda por prefijo de número de identidad (patrón ci_buscado%, 1 a 11 dígitos: acota con cada dígito tecleado y 11 dígitos equivale a la búsqueda exacta) y por combinación de nombres/apellidos.
- [ ] Resultados paginados con datos suficientes para desambiguar homónimos (fecha de nacimiento, padres).

**RF-PER-005 (S) — Control de duplicados (DA H-08)**
- [ ] El sistema detecta intentos de alta con número de identidad existente y devuelve la persona registrada.
- [ ] La ficha única de ciudadano, si se declara, es única y opcional.

### 4.3 Módulo ENT — Entidades, oficinas y firmas

**RF-ENT-001 (M) — Gestión de entidades (MO)**
- [ ] Entidad con nombre denominativo, código y NIT únicos, organismo, tipo de entidad, ubicación geográfica, dirección y datos de contacto.
- [x] Nombre denominativo de la entidad (corrección de usuario, Task 31): campo `name` VARCHAR(120) obligatorio en el alta (422 sin él), NOT NULL en el esquema, devuelto en listado/detalle/árbol y abarcado por la búsqueda `q` del listado (migración `2026_10_01_100000`).
- [x] Búsqueda del listado de entidades por nombre (revisión de usuario, Task 34): el parámetro `q` de `GET /entities` busca por fragmentos de código, nombre, NIT y objeto social, insensible a mayúsculas y con fragmentos parciales — comportamiento vigente desde Task 31, ahora verificado con test y fumiga y documentado en la descripción OA del endpoint y del parámetro (que omitía el nombre).
- [x] Directores (general y económico) referencian personas registradas; son modificables con auditoría. FIX de usuario (Task 38/SGP-32): el GET del listado de entidades devuelve los DATOS del director general y del económico — las proyecciones COMPLETAS de Persona bajo `director` y `economic_director` (`PersonResource` reutilizado con carga anticipada, misma forma que `applicant`/`filed_by`), null cuando la entidad no los declara — igual que el detalle y las respuestas de alta/edición.
- [ ] Jerarquía opcional `entidad superior` autorreferenciada.

**RF-ENT-002 (M) — Gestión de oficinas (MO)**
- [ ] Oficina con tipo, provincia, municipio, dirección y `oficina superior` opcional.
- [ ] Las jerarquías (entidades y oficinas) no pueden contener ciclos (RN-003).
- [x] Estructura territorial (ADR-31, corrección de usuario): solo se puede adicionar UNA oficina de tipo nacional.
- [x] Solo se puede adicionar una oficina de tipo provincial por provincia.
- [x] Solo se puede adicionar una oficina de tipo municipal por provincia y municipio.
- [x] Las oficinas de tipo municipal llevan `parent_office_id` igual al de la oficina provincial de la misma provincia (derivado; una contradicción responde 422).
- [x] Las oficinas de tipo provincial llevan `parent_office_id` igual al de la oficina de tipo nacional (derivado; una contradicción responde 422).
- [x] Para insertar una oficina provincial debe existir la nacional; para insertar una municipal debe existir la provincial de la provincia correspondiente (422 si falta).
- [x] Seeder que inserta la oficina de tipo nacional al inicio de la aplicación (`NationalOfficeSeeder`, idempotente).
- [x] Seeder de la cobertura territorial completa (Task 56/SGP-41): `TerritorialOfficesSeeder` siembra las 15 oficinas PROVINCIALES — asiento en el municipio capital de cada provincia (código `01`; La Habana en Plaza de la Revolución, `02`, la misma sede que la nacional) con parent derivado a la nacional — y las 167 MUNICIPALES — una por cada municipio CON provincia, con parent derivado a la provincial de su provincia —, direcciones placeholder pendientes del analista (P-06). El municipio especial Isla de la Juventud queda EXCLUIDO: su `province_id` NULL no puede satisfacer la FK compuesta RN-004 (`municipality_id`, `province_id`) ni la coherencia geográfica, así que no recibe oficina municipal hasta que la geografía oficial lo decida (P-06). Idempotente y restaurador: crea SOLO los ámbitos territoriales sin oficina ACTIVA, de modo que re-sembrar restaura la cobertura tras una desactivación manual sin duplicar filas ni pisar lo registrado por la API. ✅ 2026-10-11 IMPLEMENTADA (Task 56/SGP-41): IMPLEMENTADA 2026-10-11: suite 1389 tests / 5123 aserciones contra MySQL real (+6 tests / +234 aserciones), Pint/PHPStan 8/deptrac en verde y fumiga S4 re-escopada de 29 comprobaciones TODO OK.

**RF-ENT-003 (M) — Firmas autorizadas (MO)**
- [ ] Firma autorizada vincula entidad, persona y cargo; la terna es única.
- [ ] Vigencia opcional por fechas; el sistema permite versionar firmas históricas de la entidad.
- [ ] No se puede eliminar una firma con registros que la referencian (soft delete).

**RF-ENT-004 (M) — Coherencia geográfica (DA H-13)**
- [ ] En entidades, oficinas y agencias, el municipio debe pertenecer a la provincia declarada.

**RF-ENT-005 (S) — Consulta de estructura (DA)**
- [ ] Vista de árbol de la jerarquía de entidades y de oficinas con profundidad razonable (máx. 5 niveles).
- [ ] Conteo de expedientes tramitados por oficina en su ámbito.

### 4.4 Módulo LEG — Base legal

**RF-LEG-001 (M) — Gestión de tipos de base legal (MO)**
- [ ] CRUD de tipos con código único (Ley, Decreto, Resolución, Indicación, etc.).

**RF-LEG-002 (M) — Registro de bases legales (MO)**
- [ ] Base legal con tipo, número, fechas de emisión y puesta en vigor, organismo emisor, año y referencia.
- [ ] La fecha de derogación es opcional; si existe, es posterior a la puesta en vigor.
- [ ] La terna tipo-número-año es única; el año se deriva de la fecha de emisión (H-11).

**RF-LEG-003 (M) — Control de bases vigentes (DA)**
- [ ] Al aprobar un expediente, el selector de base legal solo ofrece las vigentes (no derogadas).
- [ ] Si un usuario con permiso elevado fuerza una derogada, el evento queda en bitácora con advertencia.

**RF-LEG-004 (S) — Consulta documental (MO)**
- [ ] Búsqueda por año, tipo, organismo emisor y texto de referencia; listado paginado.

### 4.5 Módulo EXP — Expedientes

**RF-EXP-001 (M) — Creación del expediente (MO) — reglas de usuario 0-5, ADR-32/33/34**
- [ ] Expediente con número único COMPUESTO generado por el sistema: once dígitos CONTIGUOS en cuatro secciones — dos del código de provincia de la oficina que registra, dos del código de su municipio, dos de los últimos dígitos del año en curso y cinco del consecutivo del año, provincia y municipio, rellenado con ceros a la izquierda (PPMMAACCCCC) —, con el consecutivo persistido en una tabla propia por AÑO, PROVINCIA Y MUNICIPIO que se incrementa con cada número emitido.
- [ ] El expediente ASUME la oficina del usuario que lo registra: `office_id` no se envía en el POST (rechazado con 422 si llega; 422 si el actor no tiene oficina o su oficina está desactivada).
- [ ] Datos del proponente (persona), oficina tramitadora, centro de trabajo, cargo, categoría ocupacional, nivel educacional, categoría científica, TIPO de pensión, RÉGIMEN de pensión y último salario.
- [x] Persona por (corrección de usuario, Task 34, ampliada por Task 35 y renombrada a columna inglesa por Task 36): campo `filed_by_person_id` BIGINT UNSIGNED NULL con FK a `people` — REFERENCIA a la persona REGISTRADA que presenta o gestiona el expediente cuando no es el propio proponente (un familiar, un apoderado, un gestor) —: el alta la recibe como `filed_by_person_id` (422 si la persona no existe o está desactivada; la omisión persiste NULL) y el 201, el detalle y el listado devuelven el id más la proyección COMPLETA de la persona bajo `filed_by` (misma forma que `applicant`, regla de usuario 3) (migraciones `2026_10_01_130000` + `2026_10_01_140000` + renombre inglés `2026_10_02_100100`).
- [x] Internacionalista y contacto del promovente (corrección de usuario, Task 37/SGP-31): la marca `internationalist` TINYINT(1) NOT NULL DEFAULT 0 — booleana OBLIGATORIA en el wire, paralelo del par de Ejército Rebelde (422 si se omite) — y el par de contacto `phone` VARCHAR(30) NULL y `popular_council` VARCHAR(120) NULL (teléfono y consejo popular del promovente: textos libres opcionales, 422 con 31/121 caracteres, omisión = NULL): el alta los recibe (migración `2026_10_02_110000`) y el 201, el detalle y el listado los devuelven.
- [x] Fecha de desvinculación del promovente (corrección de usuario, Task 38/SGP-32): campo `termination_date` DATE NULL — opcional en el wire con la regla de forma Y-m-d única (422 con formato inválido; sin sonda semántica porque la corrección la declara opcional a secas; la omisión, null y '' persisten NULL) —: el alta la recibe (migración `2026_10_02_120000`) y el 201, el detalle y el listado la devuelven.
- [x] Eliminación LÓGICA del expediente (corrección de usuario, Task 40/SGP-34): `DELETE /pension-cases/{id}` responde 200 SOLO mientras el expediente está en `submitted` (estado de solicitud) — fuera, 409 con el estado actual y nada eliminado — y la eliminación es SOFT: la fila sobrevive con su `deleted_at` (RN-001: evidencia y pista de auditoría siguen respondiendo, con los valores previos por ADR-19), los subregistros quedan físicos, el detalle y el listado públicos dejan de verlo (404; un segundo DELETE también 404) y la reservación de «un expediente abierto por persona» se LIBERA — la columna generada `open_case_key` pasa a NULL en las filas eliminadas (migración `2026_10_02_130000`) — para que el operador pueda re-capturar al mismo solicitante tras eliminar un registro equivocado.
- [x] Edición del expediente con PROMOVENTE INMUTABLE (corrección de usuario, Task 40/SGP-34): `PUT /pension-cases/{id}` edita los campos del expediente propio (entidad empleadora, cargo, ambos pares de categorías, tipo y régimen de pensión, último salario y fecha de solicitud) SOLO en `submitted` (fuera, 409) con semántica PATCH (todo opcional, solo las claves declaradas cambian, la omisión nunca arranca el valor almacenado) y probes espejo del alta (entidad y catálogos activos, fecha no futura: 422); todo campo de la esfera de la persona — `applicant_person_id`, `filed_by_person_id`, par de Ejército Rebelde, `internationalist`, par de contacto y `termination_date` — responde 422 prohibido (el promovente de la pensión NO se puede modificar) y los campos de ciclo de vida (`office_id` regla 0, `number`, `status`) también 422.
- [x] Domicilio y cobro del promovente (corrección de usuario, Task 42/SGP-36, IMPLEMENTADA — migración `2026_10_03_100200`): el expediente gana DOS grupos de datos del promovente, todos obligatorios SALVO la cuenta bancaria — (1) DOMICILIO: `current_address` VARCHAR(255) (dirección actual), `residence_province_id` FK → `provinces` (provincia de residencia) y `residence_municipality_id` FK → `municipalities` (municipio de residencia), con la coherencia RN-004 sondeada: el municipio debe pertenecer a la provincia declarada (422; ver P-09 para el municipio especial) —; (2) COBRO: `collection_agency_type_id` FK → `agency_types` (tipo de agencia de cobro; sonda ACTIVA), `collection_agency_id` FK → `agencies` (agencia de cobro; sonda ACTIVA y de-ese-tipo: la agencia debe pertenecer al tipo declarado, 422) y `bank_account` VARCHAR(34) NULL — OBLIGATORIA CONDICIONADA: exigida (422 sobre `bank_account`) cuando la forma de pago del tipo de agencia de cobro es `tarjeta magnetica`, OPCIONAL con `nomina electronica` (omisión = NULL; proveerla se permite) —. El alta los recibe, el 201/detalle/listado los devuelven con sus proyecciones (provincia, municipio, tipo de agencia con su forma de pago y agencia) y el PUT los admite como campos EDITABLES (decisión explícita del usuario: pueden modificarse) con probes espejo del alta y la exigencia condicional de la cuenta re-evaluada contra el estado RESULTANTE.
- [ ] Clasificación de Ejército Rebelde: booleano «pertenece» y fecha de alta, la cual es OBLIGATORIA cuando el booleano es true y se rechaza cuando es false.
- [ ] El último salario es no negativo y se expresa con dos decimales.
- [ ] El listado de expedientes devuelve la proyección COMPLETA de la persona promovente (todos sus campos), no un resumen.

**RF-EXP-002 (M) — Subregistro de salarios (MO, regla de usuario 1)**
- [ ] Registro anual de salario devengado por expediente; el par expediente-año es único.
- [ ] Se registran como máximo QUINCE salarios por expediente (el 16º responde 422; eliminar una fila libera el cupo).
- [ ] TOPE MÁXIMO DEL RÉGIMEN (corrección de especialistas de seguridad social 2026-10-09, Task 52/S8.8, V-5): cada régimen fija `required_salary_records` N como TOPE — el expediente registra A LO SUMO N salarios (el (N+1)-ésimo responde 422 en ambos puntos de entrada) y PUEDE pasar a revisión con MENOS (RF-EXP-006 corregida: el ítem `salary_records_count` desaparece del checklist); el DÉFICIT que dispara la regla del N efectivo (RF-CAL-003) se mide contra el N de la ESTRATEGIA `average_years_count`, NO contra el tope (D-1); la regla de los QUINCE queda como TECHO del parámetro (validación del catálogo: N entre 1 y 15 — regla de usuario 1 preservada como cota global). ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.
- [x] DECLARACIÓN DE IMPUTABILIDAD (Task 52/S8.8, V-6 — D-2/D-3 confirmados): el expediente lleva `missing_salaries_attributable` TINYINT(1) NULL — ¿los salarios ausentes son imputables al trabajador? —, declarable en el alta y editable por PUT SOLO en `submitted` (semántica PATCH del grupo editable); el especialista la VERIFICA en la vista previa (RF-CAL-006 muestra el flag y su efecto en el divisor) y, si difiere, devuelve el expediente; NULL es válido cuando NO hay déficit (R ≥ N de la estrategia) y la declaración es OBLIGATORIA cuando R < N — el ítem `missing_salaries_attributable` del checklist de revisión y el 422 de vista previa/aprobación la exigen: jamás un cálculo con divisor indeterminado; toda escritura aterriza en la bitácora (ADR-19). (Reparación OpenAPI 1.13.1, 2026-10-10: la spec lo servía SOLO en los schemas de respuesta — PensionCase, vista previa, cálculo congelado — y los cuerpos de petición del alta y del PUT del expediente lo omitían desde la 1.11.0; ambos request bodies ahora lo documentan — opcional en el alta, editable por PUT — y `ApiDocsTest` ancla el campo en las dos superficies.)
- [ ] El año es válido (rango configurable, p. ej. 1950–actual+1) y el importe no negativo.
- [ ] Se advierte ante años consecutivos ausentes en la serie declarada.

**RF-EXP-002b (M) — Subregistro de conceptos de ingreso (MO, regla de usuario 5)**
- [x] Cada expediente declara conceptos de ingreso del catálogo SOLO con su PORCIENTO a aplicar (corrección de usuario, Task 54/SGP-39, 2026-10-10, D-14..D-17 confirmados): el VALOR decimal exacto `amount` se RETIRA de TODA la superficie de captura — el POST individual y las filas anidadas del alta atómica dejan de exigirlo y responden 422 EXPLÍCITO si el payload lo trae (D-14 (b) + D-15 (a): doctrina anti-descarte-silencioso, el mismo trato de `office_id`), la columna `income_concept_records.amount` se ELIMINA con su CHECK (D-16 (a), migración de drop) y las respuestas 201/GET del subregistro dejan de servirlo; la fila queda EXACTAMENTE (caso, concepto, porciento) — lo único que la versión dos de la cuantía (RF-CAL-004) consume: el importe declarado nunca tuvo rol en el motor v2. IMPLEMENTADA 2026-10-10: migración `2026_10_10_100000` aplicada (SHOW COLUMNS queda id, pension_case_id, income_concept_id, applied_percent — columna y CHECK fuera del esquema), suite 1389 tests / 4853 aserciones contra MySQL real, Pint (485 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c re-escopada de 17 comprobaciones TODO OK (la D-15a del 422 por amount y la D-17 del congelado SIN amount incluidas; regresiones S8 de 26, S8b de 15 y S7 de 21 TODO OK; bloque regla 5 de la fumiga de registro re-escopado TODO OK sobre terreno limpio — sus 5 fallos restantes son drift PREEXISTENTE de las Tasks 50/52, reproducido con el código original, ajeno a la Task 54) y spec OpenAPI 1.13.0 servida y anclada por ApiDocsTest.
- [x] Porciento a aplicar (corrección de usuario, Task 42/SGP-36, IMPLEMENTADA — migración `2026_10_03_100300`): cada declaración lleva `applied_percent` DECIMAL(5,2) — Double OBLIGATORIO en el wire con rango 0–100 y 2 decimales exactos (422 si se omite, si queda fuera del rango o si trae más de dos decimales; CHECK de BD como última línea; DEFAULT 0.00 solo para escrituras fuera del wire) —; viaja POR FILA en el alta anidada, en el endpoint propio de alta y en las respuestas.
- [ ] El par expediente-concepto es único: un valor por concepto (422 semántico).
- [ ] El concepto debe existir y estar activo; las altas y bajas solo en `submitted` como el resto de los subregistros.
- [ ] Los conceptos viajan anidados en la creación del expediente (todo o nada) y con endpoints propios de alta/baja.

**RF-EXP-003 (M) — Subregistro de servicios (MO)**
- [x] Cada servicio declara entidad, fecha de inicio, fecha de fin OBLIGATORIA y marcador de coletilla (corrección de usuario, Task 37/SGP-31: el vínculo siempre está CERRADO — no existe el vínculo vigente de fin NULL; migración `2026_10_02_110100` con `end_date` DATE NOT NULL y CHECK `end_date > start_date`).
- [x] Forma de declaración del tiempo de servicio (corrección de usuario, Task 32): Documental (respaldo documental, valor por defecto) o Testifical (declaración testimonial) — campo `declaration_form` VARCHAR(20) NOT NULL DEFAULT 'Documental' con CHECK de los dos valores legales, opcional en el alta (422 con cualquier otro valor; la omisión cae en Documental) y devuelto en el 201 y el detalle del expediente (migración `2026_10_01_120000` + renombre inglés `2026_10_02_100000`, Task 36).
- [x] Forma de declaración en el alta anidada (Task 33): el payload de creación del expediente acepta `declaration_form` POR FILA en `service_records` (`in:Documental,Testifical`; la omisión cae en Documental y un valor desconocido responde 422 sobre `service_records.N.declaration_form` sin crear nada, todo-o-nada S5.5; columna inglesa desde Task 36) — antes de Task 33 el valor declarado en la creación anidada se descartaba silenciosamente y la fila nacía siempre Documental.
- [x] La fecha de fin es OBLIGATORIA y ESTRICTAMENTE posterior a la de inicio (Task 37: 422 sobre `end_date` en el alta individual y sobre `service_records.N.end_date` en el payload anidado, con el CHECK `end_date > start_date` como última línea — un servicio de un día, fin igual al inicio, es 422).
- [x] NINGÚN par de períodos del expediente comparte un día (Task 37, corrección de usuario sobre el «detecta y advierte» del Sprint 5): los solapamientos se RECHAZAN con 422 en los DOS puntos de entrada — filas simultáneas del payload anidado (sobre `service_records`, nombrando los pares de filas) y alta individual contra los subregistros almacenados (sobre `end_date`, nombrando los registros cruzados) — mediante el dominio puro `ServicePeriods` (días inclusivos: el día siguiente al fin de un período arranca limpio); el objeto `warnings` queda solo con los años salariales interiores ausentes (RF-EXP-002).
- [x] AÑOS y MESES DE TRABAJO por fila (corrección de usuario, Task 48/SGP-38 — DECISIÓN 2026-10-04 sobre lo implementado por la Task 47; IMPLEMENTADA 2026-10-04): cada subregistro de servicio persiste y devuelve DOS campos hermanos derivados — `worked_years` DOUBLE (Double: ajuste de usuario de la Task 48, era SMALLINT UNSIGNED truncado) y `worked_months` ENTERO (Integer; SMALLINT UNSIGNED) —, calculados por el servicio de aplicación AL CREAR la fila, en el MISMO momento, con las fórmulas del usuario: meses = (AÑO(fecha_fin) - AÑO(fecha_ini)) × 12 + (MES(fecha_fin) - MES(fecha_ini)) y años = REDONDEAR(meses / M) — el truncamiento de la Task 47 se retira: regresa el redondeo al entero más cercano con mitad hacia arriba (71/12 = 5.9167 → `6`; la media 6/12 = 0.5 → `1`, jamás baja; 11/12 = 0.9167 → `1`) —, donde M = `months_per_year` del régimen de pensión del expediente para worked_years y NINGÚN divisor para worked_months (meses totales literales; AÑO/MES ignoran el día; M > 0 garantizado por el CHECK del catálogo; `end_date > start_date` estricto — Task 37 — garantiza resultados definidos y no negativos; un período dentro del mismo mes rinde 0/0, comportamiento literal de la fórmula). Ambos campos son DERIVADOS y NO se aceptan en el payload de entrada: 422 si el cliente los envía, tanto en el endpoint propio como en las filas anidadas del alta (jamás un descarte silencioso — la lección de Task 33). Se serializan como NÚMEROS JSON (`worked_years`: 6 — type: number, format: double; `worked_months`: 71 — type: integer) en el 201 del alta, el detalle del expediente y el schema OA (spec OpenAPI 1.7.0); sin edición de subregistros (solo alta y baja), los valores quedan CONGELADOS al crear la fila; el listado de expedientes no carga subregistros — sin cambio. Ejemplo numérico del usuario: 2000-01-01 → 2005-12-31 con M = 12 → 71 meses → `worked_months` = 71 y `worked_years` = REDONDEAR(71/12) = 6. Nota RN-005: la doctrina «jamás float» blinda el DINERO y toda entrada del cliente; `worked_years` es un DOUBLE decidido por el usuario, calculado por el servidor (round de una división de enteros: siempre un valor entero exacto) y jamás aceptado del wire — la excepción queda documentada y acotada. Implementada por la Task 48: migración `2026_10_04_200000` (MODIFY a DOUBLE + ADD de `worked_months` + backfill ROUND de una pasada + NOT NULL), cálculo del par derivado en los DOS puntos de entrada, spec OpenAPI 1.7.0 servida y anclada por `ApiDocsTest`, suite 1157 tests / 4030 aserciones contra MySQL real, Pint/PHPStan nivel 8/deptrac en verde y fumiga HTTP dedicada (20 comprobaciones) en verde.

**RF-EXP-004 (M) — Subregistro de ciclos (MO)**
- [ ] Ciclo con días plan, días reales y cantidad de ciclos, todos enteros no negativos.
- [ ] Los ciclos participan en el cómputo de años de servicio según el régimen (RF-CAL-002).

**RF-EXP-005 (M) — Máquina de estados (MO + DA H-10)**
- [x] Solo se permiten las transiciones de la sección 2.4; cualquier otra recibe error 422 y queda en bitácora. ✅ 2026-10-04 IMPLEMENTADA (Sprint 6/Task 49, spec OpenAPI 1.8.0): endpoint declarativo POST /pension-cases/{id}/transitions (ADR-07/arquitectura 9.1) con la matriz de la sección 2.4 como dataset de Pest (16 celdas + la excepción de reapertura), decisión sobre la FILA BLOQUEADA dentro de una transacción (SELECT ... FOR UPDATE: dos aprobaciones concurrentes no pueden ocurrir — test de carrera con proceso hijo real), suite 1260 tests / 4353 aserciones contra MySQL real, Pint/PHPStan 8/deptrac en verde y fumigas HTTP TODO OK (47 comprobaciones de transiciones + 50k de volumen). Cada par ilegal responde 422 con el estado actual y el destino intentado, y el intento aterriza en la bitácora (evento `transition_rejected`, escrito DESPUÉS del rollback para que sobreviva al fallo que registra).
- [x] Cada transición exige permiso del rol correspondiente (el paso a aprobado es exclusivo del rol Director). ✅ 2026-10-04: la ruta admite la familia any-of (cases.review/approve/reject/reopen en la matriz de permisos) y el servicio exige EL permiso de la transición pedida — revisión/devolución → `cases.review` (especialista), aprobación/denegación → `cases.approve`/`cases.reject` (Director, exclusivo), reapertura → `cases.reopen` (Administrador, exclusivo) — resuelto por el puerto Shared `CurrentUserAuthorizerInterface` para no cruzar la frontera de módulos (deptrac).
- [x] Cada cambio de estado persiste `from_status`, `to_status`, usuario, fecha y nota en el historial. ✅ 2026-10-04: la tabla `pension_case_histories` (migración `2026_10_04_300000`) append-only (RN-010) con CHECKs del catálogo de estados en ambas columnas.

**RF-EXP-006 (M) — Revisión con validación de completitud (MO)**
- [x] El paso a `under_review` valida la existencia de: persona, centro de trabajo, al menos un servicio, la serie salarial y último salario. ✅ 2026-10-04: el checklist bloquea el avance con 422 y la lista `missing` COMPLETA (el especialista ve todos los huecos de una vez); persona y centro de trabajo están garantizados estructuralmente (FK NOT NULL de la F3), los tres ítems que la captura puede carecer — `service_records`, `salary_records`, `last_salary` positivo — viajan en la lista.
- [x] (reajuste de usuario 2026-10-06, Task 50/S7; CORREGIDO por especialistas 2026-10-09, Task 52/S8.8, V-5/V-6) La serie salarial vive bajo el TOPE N = `required_salary_records` del régimen: la completitud para revisar exige AL MENOS UN registro declarado (ítem `salary_records`) y, si la serie declarada R < N de la estrategia `average_years_count`, la DECLARACIÓN de imputabilidad (ítem `missing_salaries_attributable`); el ítem exacto `salary_records_count` DESAPARECE del checklist — con más no existe: la entrada rechaza el (N+1)-ésimo (C-6 de entrada). ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.
- [x] El sistema calcula la elegibilidad preliminar y la muestra al especialista sin persistir (RF-CAL-006). → S8.2 (Task 51, decidido 2026-10-06): `POST /pension-cases/{id}/calculation-preview` sobre `CaseCalculationService` con permiso `cases.calculate` y 409 fuera de `submitted`/`under_review` — la respuesta trae la elegibilidad por criterio y el resto del motor (dependencia registrada).

**RF-EXP-007 (M) — Aprobación (MO + DA H-05)**
- [x] El paso a `approved` exige base legal vigente y resultado de cálculo persistido. ✅ 2026-10-04 (mitad base legal): la aprobación exige base legal VIGENTE (`LegalBasisStatus::resolve` contra el reloj compartido): una derogada responde 422 — forzable SOLO por el Administrador con `force: true` y la advertencia en bitácora (RF-LEG-003, evento `legal_basis_forced`), una futura jamás se fuerza —; la mitad «resultado de cálculo persistido» llega en S8.3 (Task 51, decidido 2026-10-06): la MISMA transacción de aprobación ejecuta el motor, congela el snapshot append-only `pension_case_calculations` y escribe `computed_amount`; además el 422 de ELEGIBILIDAD (C-1) bloquea la aprobación del expediente no elegible, y `calculation_setting_id` queda DEPRECADA (C-6: retirada del wire y del esquema). ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8.3): base legal vigente y cálculo persistido quedan resueltos en UNA sola transacción con lock de fila — RF-EXP-007 completa.
- [x] Se registran fecha de decisión, usuario decisor y nota de resolución. ✅ 2026-10-04: las columnas reservadas de F3 por fin tienen su escritor — `approval_legal_basis_id`, `decision_notes` (nota de resolución, mín. 10 caracteres), `decided_by`, `decided_at`; la reapertura administrativa las limpia (no hay decisión viva de vuelta en revisión; el rastro completo vive en el historial).
- [ ] La aprobación dispara la alta del pensionado en la misma transacción de base de datos (RF-PEN-001). → Fase 5 (Pensionados, S9): el gate de S6 exige el flujo «sin pensionado»; la misma transacción de aprobación ganará el alta cuando el módulo exista (dependencia registrada).

**RF-EXP-008 (M) — Denegación (MO)**
- [x] El paso a `rejected` exige motivo obligatorio de longitud mínima. ✅ 2026-10-04: la nota-motivo es OBLIGATORIA con mínimo de 10 caracteres (decisión de implementación documentada de «longitud mínima»), exigible desde `submitted` y desde `under_review`.
- [x] La denegación registra usuario, fecha y motivo, y es estado terminal. ✅ 2026-10-04: `decision_notes`/`decided_by`/`decided_at` (sin base legal — la denegación solo exige el motivo), estado terminal en la matriz y fila en el historial.

**RF-EXP-009 (M) — Historial de estados (DA H-09)**
- [x] El expediente expone su bitácora completa de transiciones con usuario, fecha, estado previo/nuevo y notas. ✅ 2026-10-04: GET /pension-cases/{id}/transitions — la línea de tiempo ordenada del más antiguo al más nuevo, cada fila con la proyección del actor {id, name} (spec OpenAPI 1.8.0).
- [x] El historial es inmutable (append-only) y consultable por roles con permiso de auditoría. ✅ 2026-10-04: el modelo `PensionCaseHistory` RECHAZA actualizar y borrar filas (RuntimeException, RN-010; test de inmutabilidad en la suite y comprobación en la fumiga); la lectura responde a `cases.view` — el Auditor la mantiene (el mismo precedente de lectura cruzada de la bitácora).

**RF-EXP-010 (S) — Reapertura administrativa (DA)**
- [x] El rol Administrador puede revertir `approved`/`rejected` a `under_review` como excepción auditada. ✅ 2026-10-04: el permiso `cases.reopen` vive SOLO en el Administrador de la matriz; la reapertura limpia la evidencia de decisión, respeta la reservación de expediente-abierto-por-persona (409 con el expediente vivo si el promovente abrió uno nuevo mientras el resuelto era terminal) y aterriza en el historial.
- [ ] La reapertura exige motivo y bloquea pagos nuevos del pensionado afectado hasta re-resolución. ✅ 2026-10-04 (mitad motivo): la reapertura exige motivo de mínimo 10 caracteres; el bloqueo de pagos nuevos viaja con el módulo de pagos de la Fase 5 (dependencia registrada — no existen pagos todavía).

**RF-EXP-011 (M) — Búsqueda y filtros (MO)**
- [x] Listado filtrable por estado, persona, rango de fechas de solicitud y número. ✅ 2026-10-04: los filtros de estado/oficina (territorial, SGP-35)/persona/número/rango de fechas componen con la BÚSQUEDA AFINADA `q` — cada palabra debe aparecer en los nombres o el número de identidad del promovente (semántica AND, dentro del alcance territorial) —; índice compuesto `idx_cases_office_requested` y paginación estricta (per_page ≤ 100); medido sobre 50 000 expedientes sintéticos (`PensionCaseVolumeSeeder`, opt-in): página sin filtros 230 ms, estado 167 ms, rango de fechas 160 ms, q por apellido 313 ms, q por fragmento de carnet 396 ms.
- [ ] Exportación CSV del resultado filtrado (ver RF-REP-004). → Fase 6 (Reporting): dependencia ya registrada en el plan (S6.4).
- [x] ALCANCE TERRITORIAL del listado (corrección de usuario, Task 41/SGP-35): solo cargan los expedientes cuya oficina coincide con la oficina del USUARIO AUTENTICADO — la oficina NO viaja en la petición (422 prohibido si llega: el filtro dejó el wire) porque el servidor la deriva de la asignación del actor (ADR-33/ADR-29, el mismo patrón del alta que asume la oficina del usuario que registra); un actor sin oficina — estado de cuenta legítimo — recibe una página VACÍA (fail-closed, nunca el directorio sin scope), y el alcance compone con los filtros restantes, que angulan DENTRO de la oficina del actor, jamás a través de ella.
- [x] DATOS DE RESIDENCIA Y COBRO EN CADA FILA (corrección de usuario, Task 44/SGP-37, IMPLEMENTADA): el listado devuelve la provincia y el municipio de residencia del promovente como proyecciones {id, code, name} y los DATOS de la agencia de cobro — el tipo de agencia con su `payment_form` y la agencia COMPLETA (código, nombre, tipo, provincia y municipio) —, las mismas proyecciones que el detalle del expediente: consumir el directorio no exige una segunda consulta por fila para resolver la geografía o el punto de cobro (spec OpenAPI 1.5.0).

### 4.6 Módulo CAL — Cálculo de pensión

**RF-CAL-001 (M) — Verificación de elegibilidad (MO, reajuste de usuario 2026-10-06)**
- [x] Validación de EDAD mínima por sexo contra el RÉGIMEN de pensión del expediente (`min_age_men`/`min_age_women`): años cumplidos por cumpleaños a la fecha de solicitud (el día del cumpleaños cuenta, el anterior no; dataset de bordes de cumpleaños).
- [x] Validación de AÑOS MÍNIMOS de trabajo — `min_work_years` GENERAL, sin distinción de sexo (C-1), también del régimen — contra los años trabajados TRUNCADOS computados de los servicios (RF-CAL-002; C-3: la fracción no cuenta).
- [x] El resultado de elegibilidad es booleano por criterio (edad, servicio), con explicación legible de cada fallo.
- [x] Los criterios viven en el RÉGIMEN, no en `general_settings` (reajuste): el motor lee expediente → régimen; la configuración general queda sin rol en el cálculo, deprecación diferida (C-5). ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.

**RF-CAL-002 (M) — Cómputo de años de servicio (MO + DA H-15, reajuste de usuario 2026-10-06)**
- [x] AÑOS TRABAJADOS (AT, nivel expediente) = (Σ meses de los `service_records` NO coletilla) / `months_per_year` del régimen del expediente — cada registro aporta sus meses con la aritmética AÑO/MES de SGP-38 ((añoFin−añoIni)×12+(mesFin−mesIni), días ignorados; los vínculos siempre están CERRADOS desde la Task 37 — no existe fin abierto).
- [x] COLETILLA: los registros marcados como coletilla NO suman — regla FIJA (resuelve P-03: el período queda solo documentado).
- [x] CICLOS: los `work_cycles` quedan DIFERIDOS del cómputo — el usuario mantiene dudas en la fórmula (reajuste 2026-10-06; P-02 abierta, RF-EXP-004 anotado); se integran cuando la fórmula se fije.
- [x] TRUNCAMIENTO (C-3): la elegibilidad y los años excedentes comparan con el valor TRUNCADO de AT (24.9 → 24 — solo cuentan los años cumplidos); el AT exacto (DOUBLE) también se expone. Nota: doctrina DISTINTA de la columna `worked_years` por registro (SGP-38: REDONDEADO, congelado al alta) — piezas distintas, ambas decisiones del usuario.
- [x] El cómputo es determinista y reproducible: mismas entradas, mismo resultado. ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.

**RF-CAL-003 (M) — Salario promedio MENSUAL (MO, reajuste de usuario 2026-10-06)**
- [x] SPM = Σ(salario devengado de los registros seleccionados por la ESTRATEGIA) / (N EFECTIVO × 12) — promedio MENSUAL: el divisor son los meses del N EFECTIVO. CORRECCIÓN DE ESPECIALISTAS (2026-10-09, Task 52/S8.8, V-7 — doctrina del divisor revisada): R ≥ N ⇒ N_ef = N; 0 < R < N con `missing_salaries_attributable` = false ⇒ N_ef = R (carencia NO imputable al trabajador: divisor legítimo R×12); = true ⇒ N_ef = N (carencia imputable: el tope se MANTIENE y los períodos ausentes computan SALARIO CERO — el promedio se rebaja); R = 0 ⇒ N_ef = N (SPM 0; el gate exige ≥ 1 registro). Ejemplo vinculante (General, N 5, best_n): serie de 3 registros Σ 6000.00 anuales → no imputable 6000/36 = 166.67; imputable 6000/60 = 100.00. La regla vive en el MOTOR puro (AverageSalaryCalculator deriva N_ef) y el resultado expone `average_years_used` para transparencia de auditoría; el déficit sin declarar es 422 (D-4). ✅ 2026-10-09 IMPLEMENTADA (Task 52/S8.8): migración `2026_10_09_100000` (pension_cases.missing_salaries_attributable + snapshot con average_years_effective y el flag congeladas), suite 1367 tests / 4747 aserciones contra MySQL real, Pint (481 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8b de 15 comprobaciones TODO OK (más las de regresión S8 de 26 y S7 de 21 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.11.0 servida y anclada por ApiDocsTest. CORRECCIÓN DE USUARIO (2026-10-06, Task 51/S8.1, V-1..V-3): N es el parámetro PROPIO de la estrategia — `average_years_count` del régimen —, DESACOPLADO del gate `required_salary_records`: el divisor es N propio × 12 en TODAS las estrategias (selección y divisor cuentan los mismos años), el catálogo valida 1..15 y N propio ≤ N del gate (V-2), y con `all` el N propio IGUALA al del gate (la selección es la serie completa y sus meses son N del gate × 12 — regla de coherencia validada 422 en el CRUD). Backfill del General con 5 = 5: los números confirmados del motor (SPM 4750.00, cuantía 3040.00) NO cambian. El S7 implementó el divisor ligado al N del gate — S8.1 desacopla la fuente del N (migración de la columna, composición desde el nuevo parámetro, validación del catálogo y spec OpenAPI 1.10.0). ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8.1): migración `2026_10_06_200000` (columna con CHECK 1..15 y ≤ gate, backfill = required), composición desde el N propio y catálogo validando 422 la coherencia; el test de composición verifica el desacople real (mejores 3 de 5: 18700.00/36 = 519.44) y la fumiga el 201/422 del CRUD.
- [x] Estrategia por régimen (`average_strategy`, resuelve P-01): `best_n` (mejores N por salario devengado, desempate por año más reciente — determinista), `last_n` (últimos N por año), `all` (todos los introducidos).
- [x] En `Money` con redondeo bancario half-even a 2 decimales (DECIMAL(12,2) en persistencia).
- [x] A LO SUMO N (C-6 de entrada; corrección de especialistas 2026-10-09, Task 52/S8.8, V-5): no pueden existir más de N registros de salario por expediente (la entrada rechaza el exceso con 422); MENOS sí pueden existir y pasar a revisión — el déficit activa la regla del N efectivo (V-7) y la declaración de imputabilidad (V-6). ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.

**RF-CAL-004 (M) — Cuantía base con topes e incrementos (MO, reajuste 2026-10-06; VERSIÓN DOS 2026-10-09, Task 53/S8.9 — los conceptos de ingreso aplicables SUMAN como incrementos sobre la base; VERSIÓN TRES 2026-10-11, Task 57/SGP-42 — bloque combatiente por umbral, conceptos NO aplicables sobre la instantánea e incrementos absolutos de la configuración general)**
- [x] Cuantía = SPM × PCI + (ATE × PIA × SPM), con ATE = max(0, AT truncado − min_work_years) (los años excedentes son el servicio que supera el mínimo del régimen). LA BASE SE MANTIENE en la versión dos (D-6: v2 SUMA sobre v1 — «los valores anteriores se mantienen», la parte ATE×PIA sigue viva).
- [x] INCREMENTOS POR CONCEPTOS (Task 53/S8.9, V-9): RISB = los registros de conceptos de ingreso del expediente cuyo concepto tiene `applies_base_salary = true`; por cada r en RISB, Cuantía += SPM × (r.applied_percent / 100); los conceptos NO aplicables (p. ej. PGR) jamás alteran el resultado y RISB vacío NO es error — el aporte de los conceptos es 0.00 y la cuantía queda igual a la base (D-9). El algoritmo v2 es UNIVERSAL (D-8: no existe `calculation_version` — incorporación al algoritmo existente, todos los regímenes). ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] Cuantía = mínimo(Cuantía, SPM × PIL) — TOPE FINAL por el porciento límite del régimen (el tope intermedio de la v1 queda SUBSUMIDO: con términos no negativos mínimo(mínimo(C0, SPM×PIL) + Δ, SPM×PIL) = mínimo(C0 + Δ, SPM×PIL)).
- [x] REDONDEO (D-13, versión dos): el factor TOTAL — PCI + ATE×PIA + Σ(applied_percent/100) de la RISB — se compone en bcmath ANTES de multiplicar y sufre UN solo redondeo bancario half-even (la doctrina de v1 «jamás dos medio-centavos arrastrados por pasos intermedios» se extiende al bloque de incrementos); SIN conceptos declarados el número es IDÉNTICO al de hoy, al centavo. ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] PCI (porciento de base de cálculo), PIA (porciento de incremento anual) y PIL (porciento límite) son DOUBLE del RÉGIMEN registrados ENTRE CERO Y UNO (fracciones), jamás hardcodeados. Nota RN-005: DOUBLE decidido por el usuario para estos parámetros calculados por el servidor — excepción documentada, como la de `worked_years`. ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.
- [x] VERSIÓN TRES — BLOQUE COMBATIENTE (Task 57/SGP-42, corrección de usuario 2026-10-11, D-24..D-29): si `rebel_army_member` = true, PCT = `pre_threshold_percent` (PAU) cuando `rebel_army_join_date` es ESTRICTAMENTE anterior a `combatant_threshold_date` (FUC — la fecha EXACTA del umbral cuenta como POSTERIOR, D-29) y PCT = `post_threshold_percent` (PPU) en caso contrario; Cuantía += SPM × PCT — PCT ya es fracción [0,1] SIN división entre cien (D-25) y compone el FACTOR TOTAL del bloque SPM: F1 = PCI + ATE×PIA + Σ_RISB(pct/100) + PCT, UN producto y UN redondeo (D-26 — la doctrina D-13 se extiende al porciento combatiente). PAU/PPU/FUC viven en la configuración general ACTIVA (RF-CAT-005); AT sigue sin entrar en la fórmula — solo alimenta ATE (D-24) — y un miembro SIN fecha de ingreso (el wire la exige) es rotura de integridad: el motor falla EXPLÍCITO, jamás un default oculto (D-28).
- [x] VERSIÓN TRES — INSTANTÁNEA Y CONCEPTOS NO APLICABLES (RINSB, D-27/D-32): tras el bloque combatiente se toma la instantánea CuantíaTmp = Cuantía — un valor REAL en centavos, primer redondeo half-even ya aplicado — y por cada concepto de ingreso NO aplicable a salario base (`applies_base_salary` = false, la RINSB — p. ej. PGR) Cuantía += CuantíaTmp × (applied_percent/100); la Σ de la RINSB se compone en UN factor y el bloque sufre UN producto → UN redondeo (D-27: cada bloque redondea UNA vez — SPM, bloque SPM F1, bloque RINSB y la cota SPM×PIL — y las sumas absolutas II/IPmin son EXACTAS en centavos; jamás redondeos por término). La EXCLUSIÓN de la versión dos queda REEMPLAZADA por la participación (D-32): el invariante v2 «los NO aplicables jamás alteran» queda INVERTIDO y la advertencia de excluidos DESAPARECE de la vista previa; los conceptos JAMÁS participan del SPM (RF-CAL-003).
- [x] VERSIÓN TRES — ORDEN DE TOPES E INCREMENTOS ABSOLUTOS (D-30/D-31): (1) tope del RÉGIMEN — Cuantía = mínimo(Cuantía, SPM × PIL) recorta la cuantía compuesta (base + RISB + combatiente + RINSB) ANTES de los absolutos; (2) internacionalista — si `internationalist` = true, Cuantía += `internationalist_increment` (II, monto ABSOLUTO de la activa: puede superar el tope del régimen); (3) mínimo — si Cuantía < `minimum_pension` (PMin), Cuantía += `minimum_pension_increment` (IPmin, absoluto); (4) tope final — Cuantía = mínimo(Cuantía, `maximum_pension` PMax). El pseudocódigo del usuario manda el ORDEN literal (D-31); PMax = 0.00 DESACTIVA el tope final (D-30 (b): la configuración NEUTRA de la semilla — umbral 1970-01-01 y todo ceros — es NO-OP total: PAU/PPU 0 aportan cero, II 0 no incrementa, PMin 0 jamás dispara el mínimo); SIN fila activa el cálculo responde 422 en vista previa Y aprobación (D-30 (a): jamás números sin doctrina).
- [x] VERSIÓN TRES — CONFIGURACIÓN Y CONGELADO (D-33/D-34): CERO migraciones (D-8 extendida: v3 universal, no existe `calculation_version`) — `pension_cases` ya captura `rebel_army_member`/`rebel_army_join_date`/`internationalist` y `general_settings` ya guarda los siete campos (RF-CAT-005). El snapshot congela dentro de `inputs` las banderas y la fecha de ingreso, la lista `non_salary_base_income_concepts[]` ({income_concept_id, code, applied_percent} — la RINSB exacta) y el bloque `general_settings` (id + los SIETE valores de doctrina usados: la re-ejecución histórica reproduce la cuantía aunque la configuración viva publique versiones nuevas); los snapshots PREVIOS sin las claves re-ejecutan EXACTO — claves ausentes ⇒ banderas falsas + RINSB vacía + doctrina NEUTRA ⇒ v2 al centavo (RNF-010). `calculation_setting_id` sigue caída del esquema (D-34: la «versión de configuración» ES la congelación, C-6).
- [x] VERSIÓN TRES — EJEMPLOS VINCULANTES (V-13..V-19): V-13 compatibilidad — SPM 475.00, PCI 0.60, ATE 0, sin conceptos ni banderas y configuración NEUTRA → 285.00 (idéntico a v2/v1 al centavo). V-14 combatiente — FUC 1959-01-01, PAU 0.10, PPU 0.05: ingreso 1958-12-31 → F1 0.70 → 332.50; ingreso 1959-01-01 → F1 0.65 → 308.75. V-15 RINSB — CuantíaTmp 332.50 con RINSB Σ 20.00% → +66.50 → 399.00. V-16 cadena completa — SPM 6000.00, PCI 0.60, ATE 2 (PIA 0.02), RISB Σ 10.00%, PAU 0.10, RINSB Σ 5.00%, PIL 0.80, II 200.00, PMin 2472.00, IPmin 1528.00, PMax 4000.00: F1 0.84 → CuantíaTmp 5040.00 → +252.00 → 5292.00 → tope 4800.00 → internacionalista 5000.00 → tope final 4000.00. V-17 mínimo — cuantía tras el tope 920.00 → +1528.00 → 2448.00 (bajo PMax). V-18 half-even del bloque RINSB — CuantíaTmp 100.10 con Σ 5.00% → 5.005 → 5.00 (centavo PAR); CuantíaTmp 100.30 → 5.015 → 5.02. V-19 umbral exacto — el ingreso EN la fecha FUC aplica PPU (posterior).
    ✅ IMPLEMENTADA 2026-10-11 (Task 57/SGP-42): motor puro v3 (AmountCalculator::composed con PensionDoctrine — combatiente componiendo F1, RINSB sobre la instantánea con UN redondeo por bloque, orden tope→II→IPmin→PMax y PMax 0 = sin tope), composición CaseCalculationService (proyección GeneralDoctrineParameters de la activa, RINSB, banderas, 422 sin activa — D-30 (a)), congelado de banderas + RINSB + bloque general_settings en inputs (D-33) y flecha PensionCalculation→Settings restaurada vía DTO puro (D-35, deptrac actualizado); CERO migraciones (D-8 extendida); suite 1427 tests / 5330 aserciones contra MySQL real (baseline 1389/5123, +38/+207), Pint (491 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S9b de 25 comprobaciones TODO OK (más regresiones S7/S8/S8b/S8c re-escopadas al invariante v3 y S9 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.15.0 servida y anclada por ApiDocsTest.

**RF-CAL-005 (S) — Conceptos de ingreso (MO, corrección de usuario 2026-10-06: NO participan del SPM; VERSIÓN DOS 2026-10-09, Task 53/S8.9: SÍ participan como INCREMENTOS de la cuantía)**
- [x] Los conceptos de ingreso NO participan del SALARIO BASE DE REFERENCIA: el promedio usa EXCLUSIVAMENTE `salary_records` — SE MANTIENE en la versión dos (el `amount` declarado del concepto queda como evidencia del expediente, sin rol en el motor).
- [x] INCREMENTOS (Task 53/S8.9, D-6 (b)): los conceptos con `applies_base_salary = true` participan de la CUANTÍA — cada registro aporta SPM × (applied_percent/100) sobre la base del régimen; el marcador pasa de documentación de catálogo a FILTRO del motor y los que NO aplican (p. ej. PGR) jamás alteran ningún resultado. ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] VERSIÓN TRES (Task 57/SGP-42, D-32): los conceptos con `applies_base_salary` = FALSE (la RINSB — p. ej. PGR) pasan de EXCLUIDOS a PARTICIPANTES: cada registro aporta CuantíaTmp × (applied_percent/100) sobre la instantánea posterior al bloque combatiente (RF-CAL-004) — el invariante v2 «los NO aplicables jamás alteran» queda INVERTIDO y la advertencia de exclusión DESAPARECE de la vista previa; los conceptos JAMÁS participan del SPM (RF-CAL-003 — `salary_records` sigue siendo la fuente EXCLUSIVA del promedio).
- [x] Invariante testeable REESCRITA (v2): declarar un concepto aplicable con porciento X eleva la cuantía exactamente en SPM×X/100 antes del tope; SIN conceptos declarados la cuantía es IDÉNTICA a la base v1 al centavo (el invariante v1 «con y sin conceptos idénticos» queda restringido a los conceptos NO aplicables — la evidencia que sigue documenta la suite v1 previa a la inversión). ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest. ✅ 2026-10-06 IMPLEMENTADA (Task 50/S7, spec OpenAPI 1.9.0): migración `2026_10_06_100000` con las ocho columnas y backfill del General, suite 1328 tests / 4579 aserciones contra MySQL real, Pint (463 archivos), PHPStan nivel 8 y deptrac (Settings fuera de las dependencias) en verde, fumiga HTTP de 21 comprobaciones TODO OK (catálogo con los ocho parámetros, tope N estricto, gate de revisión y los números confirmados del motor) y la fumiga del S6 (47 comprobaciones) en verde sobre el gate re-escopado.

**RF-CAL-006 (M) — Simulación sin persistencia (DA, decidida Task 51/S8 2026-10-06)**
- [x] `POST /api/v1/pension-cases/{id}/calculation-preview` (§9.1 de arquitectura) sobre `CaseCalculationService` — verbo POST como acción, igual que `transitions`: permiso nuevo `cases.calculate` (especialista, Director y Administrador), alcance territorial de oficina como el detalle del expediente.
- [x] Disponible SOLO en `submitted`/`under_review`: cualquier otro estado responde 409 (en `approved` el cálculo está CONGELADO y se consulta por `GET /{id}/calculation`; en `rejected` no hay cálculo que mostrar).
- [x] La respuesta sirve elegibilidad por criterio con su explicación, AT (meses totales, exacto y truncado), SPM, años excedentes, cuantía, los PARÁMETROS DEL RÉGIMEN usados (ambos N incluidos), el N EFECTIVO divisor `average_years_used` y la declaración `missing_salaries_attributable` (Task 52/S8.8, V-7/V-8), y `warnings[]` (serie bajo el TOPE del régimen, déficit con su efecto en el divisor — imputable o no —, criterios de elegibilidad fallidos, años interiores ausentes de la serie); CON DÉFICIT SIN DECLARAR responde 422 (D-4: el divisor es indeterminado — jamás números sobre un default oculto). ✅ 2026-10-09 IMPLEMENTADA (Task 52/S8.8): migración `2026_10_09_100000` (pension_cases.missing_salaries_attributable + snapshot con average_years_effective y el flag congeladas), suite 1367 tests / 4747 aserciones contra MySQL real, Pint (481 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8b de 15 comprobaciones TODO OK (más las de regresión S8 de 26 y S7 de 21 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.11.0 servida y anclada por ApiDocsTest.
- [x] VERSIÓN DOS (Task 53/S8.9): la respuesta añade `income_concept_terms[]` — los conceptos APLICABLES que participan ({income_concept_id, code, name, applied_percent}), SIN término de dinero por concepto (el factor total se compone entero y sufre UN redondeo — D-13) —, el porciento total de incrementos y la cuantía de la fórmula completa (base + incrementos + tope final); `warnings[]` gana el aviso cuando el TOPE FINAL recorta el resultado (D-11) y la nota informativa de conceptos declarados NO aplicables excluidos; RISB vacío NO es error (D-9: lista vacía, aporte 0.00 — la cuantía queda igual a la base v1). ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] VERSIÓN TRES (Task 57/SGP-42): la respuesta añade `non_salary_base_concept_terms[]` + `non_salary_base_concept_percent` (la RINSB que participó), el bloque `general_settings` (id + los siete valores de doctrina usados — paralelo de `regime_parameters`), `combat_percent`/`combat_before_threshold` (porciento combatiente aplicado y rama del umbral; null sin bloque), `internationalist_applied`, `minimum_increment_applied` y `capped_by_maximum`; `warnings[]` gana el aviso del TOPE FINAL ABSOLUTO que recorta (ambos números, paralelo D-11) y el del incremento de la pensión mínima, y PIERDE la nota de conceptos excluidos (D-32); SIN configuración activa responde 422 (D-30 (a)).
- [x] SIN ESCRITURAS: la simulación jamás persiste — el DoD 8.6 lo exige con un test de transacción vacía (la vista previa no abre transacción de escritura ni toca `computed_amount`). ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8): suite 1354 tests / 4703 aserciones contra MySQL real, Pint (471 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde; fumiga HTTP S8 de 26 comprobaciones TODO OK sobre la BD sgp re-sembrada (más las de regresión S7 de 21 y S6 de 47 TODO OK) y spec OpenAPI 1.10.0 servida y anclada por ApiDocsTest. Fumiga: preview en submitted y under_review con los números confirmados (SPM 475.00, cuantía 285.00), 403 del operador, 404 del desconocido, 409 del aprobado y conteos de historial/cálculos/bitácora intactos.

**RF-CAL-007 (M) — Persistencia del cálculo (MO, decidida Task 51/S8 2026-10-06)**
- [x] La MISMA transacción de la aprobación (lock de fila del S6) ejecuta el motor, inserta el snapshot append-only `pension_case_calculations` (UNIQUE(pension_case_id, sequence): una fila por resolución — entradas y parámetros del régimen congelados, cuantía, usuario y fecha; desde Task 52/S8.8 congela también `missing_salaries_attributable` y `average_years_effective` como COLUMNAS explícitas — V-8, D-5) y escribe `pension_cases.computed_amount` como cuantía vigente del expediente resuelto; el déficit sin declarar responde 422 (D-4) junto al gate de elegibilidad C-1.
- [x] VERSIÓN DOS (Task 53/S8.9, D-10): el snapshot congela dentro de `inputs.income_concepts[]` la lista RISB EXACTA que consumió el motor — {income_concept_id, code, amount, applied_percent} por fila — SIN columnas nuevas ni migraciones (D-8: el algoritmo es universal, no existe `calculation_version`); la cuantía resultante ya vive en la columna fuerte `amount`. ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] CORRECCIÓN SGP-39 (Task 54, D-17 (a), 2026-10-10): la lista congelada `inputs.income_concepts[]` pasa a `{income_concept_id, code, applied_percent}` por fila — SIN `amount` — en las congelaciones NUEVAS (el importe ya no existe en la captura, RF-EXP-002b); los snapshots PREVIOS que traen el campo se leen SIN romper — el motor solo consume el porciento y la re-ejecución histórica (RNF-010) queda a salva — y la bitácora conserva los valores previos de las bajas físicas como evidencia de lo que existió (ADR-19). IMPLEMENTADA 2026-10-10: migración `2026_10_10_100000` aplicada (SHOW COLUMNS queda id, pension_case_id, income_concept_id, applied_percent — columna y CHECK fuera del esquema), suite 1389 tests / 4853 aserciones contra MySQL real, Pint (485 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c re-escopada de 17 comprobaciones TODO OK (la D-15a del 422 por amount y la D-17 del congelado SIN amount incluidas; regresiones S8 de 26, S8b de 15 y S7 de 21 TODO OK; bloque regla 5 de la fumiga de registro re-escopado TODO OK sobre terreno limpio — sus 5 fallos restantes son drift PREEXISTENTE de las Tasks 50/52, reproducido con el código original, ajeno a la Task 54) y spec OpenAPI 1.13.0 servida y anclada por ApiDocsTest.
- [x] VERSIÓN TRES (Task 57/SGP-42, D-33): `inputs` congela las banderas `rebel_army_member`/`rebel_army_join_date`/`internationalist`, la lista `non_salary_base_income_concepts[]` (la RINSB exacta — {income_concept_id, code, applied_percent}) y el bloque `general_settings` (id + los siete valores de doctrina usados); SIN columnas nuevas (D-8 extendida) y los snapshots previos sin las claves re-ejecutan exacto (claves ausentes ⇒ neutral ⇒ v2 al centavo).
- [x] GATE DE ELEGIBILIDAD (C-1): la aprobación de un expediente NO elegible responde 422 con la explicación de cada criterio — criterio objetivo del régimen (edad/años); la discrecionalidad del Director ya vive en la excepción de base legal derogada (RF-LEG-003) y NO se duplica.
- [x] Un expediente aprobado conserva inmutable el cálculo que lo resolvió: la reapertura administrativa limpia `computed_amount` (como limpia el resto de la decisión) pero JAMÁS borra snapshots — una re-aprobación genera `sequence` 2 y el cálculo anterior sobrevive para trazabilidad.
- [x] La «versión de configuración» es la CONGELACIÓN de los parámetros del régimen en el snapshot (`regime_parameters`); `pension_cases.calculation_setting_id` queda DEPRECADA (C-6: sin rol desde el reajuste del S7) y se retira del wire y del esquema (spec OpenAPI 1.10.0). ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8): suite 1354 tests / 4703 aserciones contra MySQL real, Pint (471 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde; fumiga HTTP S8 de 26 comprobaciones TODO OK sobre la BD sgp re-sembrada (más las de regresión S7 de 21 y S6 de 47 TODO OK) y spec OpenAPI 1.10.0 servida y anclada por ApiDocsTest. Fumiga: snapshot sequence 1 con amount 285.00 y computed_amount en la fila; el 422 de elegibilidad sin congelar nada; reapertura limpia la referencia y conserva la evidencia; re-aprobación sequence 2.

**RF-CAL-008 (M) — Trazabilidad del motor (DA H-05/H-09, decidida Task 51/S8 2026-10-06)**
- [x] Cada ejecución persistente registra las entradas y los parámetros del RÉGIMEN utilizados (reajuste 2026-10-06: `general_settings` sin rol en el motor — la «versión de configuración» es la congelación de los parámetros del régimen en el snapshot: `regime_parameters` con porcientos, mínimos, ambos N, estrategia y `months_per_year`; `inputs` con los ids y valores usados; desde Task 52/S8.8 `inputs` congela también la declaración `missing_salaries_attributable` — la re-ejecución histórica reproduce el N EFECTIVO y el divisor exacto —).
- [x] VERSIÓN DOS (Task 53/S8.9): la re-ejecución histórica con el motor v2 reproduce `amount` EXACTO — los snapshots ANTERIORES no traen `income_concepts` en `inputs` ⇒ lista vacía ⇒ Σ = 0 ⇒ solo la parte base (la historia no cambia); los snapshots v2 re-ejecutan con la lista congelada aunque el catálogo mute o DESACTIVE conceptos después (la lista viaja con id, code y porciento — sin dependencia del catálogo vivo). ✅ 2026-10-09 IMPLEMENTADA (Task 53/S8.9): algoritmo UNIVERSAL SIN migraciones (D-8), suite 1391 tests / 4853 aserciones contra MySQL real, Pint (484 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde, fumiga HTTP S8c de 15 comprobaciones TODO OK (más las de regresión S8 de 26, S8b de 15 y S7 re-escopada al invariante v2 TODO OK sobre la BD sgp re-sembrada) y spec OpenAPI 1.12.0 servida y anclada por ApiDocsTest.
- [x] VERSIÓN TRES (Task 57/SGP-42): la re-ejecución histórica con el motor v3 reproduce `amount` EXACTO — los snapshots ANTERIORES sin `general_settings`/banderas/RINSB ⇒ doctrina NEUTRA + banderas falsas + RINSB vacía ⇒ solo la parte v2 (la historia no cambia); los snapshots v3 re-ejecutan con la doctrina congelada aunque la configuración viva publique versiones nuevas (el bloque viaja con id y valores — sin dependencia de la fila viva, que además es append-only).
- [x] La re-ejecución histórica sobre los mismos datos reproduce exactamente la cuantía original (RNF-010): test que aprueba, MUTA el régimen vivo por el catálogo y re-ejecuta el motor puro con `inputs` + `regime_parameters` congelados → `amount` IDÉNTICO; `computed_amount` del expediente no cambia.
- [x] `GET /pension-cases/{id}/calculation` (permiso `cases.view`): el snapshot vigente del expediente aprobado con su línea de versiones por `sequence`. ✅ 2026-10-06 IMPLEMENTADA (Task 51/S8): suite 1354 tests / 4703 aserciones contra MySQL real, Pint (471 archivos), PHPStan nivel 8 (0 errores) y deptrac (0 violaciones) en verde; fumiga HTTP S8 de 26 comprobaciones TODO OK sobre la BD sgp re-sembrada (más las de regresión S7 de 21 y S6 de 47 TODO OK) y spec OpenAPI 1.10.0 servida y anclada por ApiDocsTest. Fumiga: tras mutar el régimen vivo (base 0.80) el GET sirve los parámetros CONGELADOS (0.6) con computed_amount intacto, y la línea de versiones enumera las dos resoluciones (285.00 y 380.00).

### 4.7 Módulo PEN — Pensionados

**RF-PEN-001 (M) — Alta automática desde aprobación (MO + DA H-04)**
- [ ] La aprobación del expediente crea el pensionado en la misma transacción: persona, tipo y régimen de pensión y cuantía calculada.
- [ ] El pensionado referencia el expediente de origen (`origin_case_id`) de forma única.
- [ ] Una persona solo puede tener un pensionado activo; el alta falla si ya existe.

**RF-PEN-002 (M) — Consulta y ficha del pensionado (MO)**
- [ ] Ficha con datos de persona, tipo y régimen, cuantía, expediente de origen, historial de estados y controles bancarios.
- [ ] Listados filtrables por provincia del control bancario, tipo de pensión, régimen y estado.

**RF-PEN-003 (M) — Ciclo de vida de la pensión (DA)**
- [ ] Estados del pensionado: activo, suspendido y terminado, con motivo obligatorio en cada transición.
- [ ] El registro de fallecimiento (RF-PER-003) sugiere la terminación de la pensión activa.
- [ ] Toda transición queda en bitácora con usuario, fecha y motivo.

**RF-PEN-004 (S) — Reclasificación (DA)**
- [ ] El rol Director puede reclasificar tipo/regimen de un pensionado activo dejando constancia del expediente o resolución que la respalda.

### 4.8 Módulo PAG — Pagos y control bancario

**RF-PAG-001 (M) — Registro de control bancario (MO)**
- [ ] Control bancario con número secuencial único, agencia, cuenta y marcador de nómina electrónica.
- [ ] El número se asigna desde la secuencia centralizada, segura ante concurrencia (RF-PAG-006).
- [ ] La cuenta valida el formato bancario declarado por el catálogo de agencias.

**RF-PAG-002 (M) — Asignación al pensionado (MO)**
- [ ] Un pensionado tiene exactamente un control bancario activo; los anteriores permanecen como histórico.
- [ ] El cambio de agencia o cuenta desactiva el control previo y crea uno nuevo con nuevo número.
- [ ] El histórico de controles es consultable en la ficha del pensionado.

**RF-PAG-003 (M) — Catálogos del pago (MO)**
- [ ] Gestión de conceptos de ingreso conforme al modelo original. Corrección de usuario (Task 42/SGP-36, implementada): el catálogo `Tipo de pago` se ELIMINÓ del modelo — la forma de pago del cobro vive en el tipo de agencia (`agency_types.payment_form`) y ya no existe una superficie de catálogo que gestionar para el pago.

**RF-PAG-004 (S) — Exportación de nómina electrónica (MO)**
- [ ] Generación del archivo de nómina electrónica por agencia y período para el consumo del banco.
- [ ] El formato del archivo es configurable y queda registrado como entregable pendiente de especificación bancaria (sección 7).

**RF-PAG-005 (C) — Registro de pagos periódicos (DA H-16, propuesta)**
- [ ] Generación mensual de pagos por pensionado activo con estado pendiente/pagado/anulado.
- [ ] Conciliación básica de pagos por período y agencia. Marcado como propuesta a validar con el área funcional.

**RF-PAG-006 (M) — Secuencias centralizadas (DA H-06)**
- [ ] Tabla genérica de secuencias con incremento transaccional y bloqueo pesimista.
- [ ] Los números emitidos nunca se reutilizan, ni siquiera tras rollback de negocio (huecos permitidos).

### 4.9 Módulo SEG — Seguridad y control de acceso

**RF-SEG-001 (M) — Autenticación (MO implícito)**
- [ ] Login con email y contraseña hasheada (bcrypt/argon2id) y sesiones o tokens Sanctum.
- [ ] Bloqueo temporal tras N intentos fallidos y desbloqueo por el Administrador.
- [ ] Política de contraseñas: longitud mínima, complejidad, caducidad opcional y renovación.

**RF-SEG-002 (M) — RBAC (MO implícito + DA)**
- [ ] Roles del sistema: administrador, director, especialista, operador y auditor.
- [ ] Permisos por módulo y acción (ver, crear, editar, aprobar, exportar) asignables a roles.
- [ ] Las políticas se aplican en capa de dominio, no solo en la interfaz (defense in depth).

**RF-SEG-003 (M) — Restricción por estado (DA)**
- [ ] Las acciones sobre expedientes se habilitan según estado y rol (matriz de la sección 2.4).
- [ ] El ámbito territorial del usuario (oficina) filtra los expedientes visibles según su jerarquía.

**RF-SEG-004 (M) — Asociación usuario-persona (DA)**
- [ ] Todo usuario del sistema puede vincularse a una persona registrada para la trazabilidad de acciones.

### 4.10 Módulo AUD — Auditoría y trazabilidad

**RF-AUD-001 (M) — Bitácora de acciones (DA H-09)**
- [ ] Registro automático de crear/editar/eliminar en entidades críticas con usuario, fecha, valores previos y nuevos.
- [ ] La bitácora es append-only: ningún rol, incluido el Administrador, puede modificarla.

**RF-AUD-002 (M) — Historial del expediente (DA H-10)**
- [ ] Bitácora de transiciones de estado conforme RF-EXP-009, integrada a la consulta de auditoría.

**RF-AUD-003 (M) — Consulta de bitácoras (DA)**
- [ ] Filtros por usuario, entidad, acción, módulo y rango de fechas; exportación CSV para el Auditor.

**RF-AUD-004 (M) — Borrado lógico y restauración (DA)**
- [ ] Soft deletes en entidades de negocio; restauración exclusiva del Administrador y auditada.

### 4.11 Módulo REP — Reportes

**RF-REP-001 (M) — Reportes de expedientes (DA)**
- [ ] Expedientes por estado y oficina en un rango de fechas, con totales y desglose por oficina subordinada.

**RF-REP-002 (M) — Reportes de pensionados (DA)**
- [ ] Pensionados por provincia (según control bancario activo), tipo de pensión y régimen.
- [ ] Monto total de cuantías por los mismos ejes de análisis.

**RF-REP-003 (S) — Reportes de pagos (DA)**
- [ ] Controles bancarios por agencia y marcador de nómina electrónica; pagos del período si RF-PAG-005 se aprueba.

**RF-REP-004 (M) — Exportaciones (DA)**
- [ ] Todo reporte exporta a CSV y Excel; PDF para fichas de expediente y pensionado.

**RF-REP-005 (C) — Tablero de indicadores (DA)**
- [ ] Indicadores de carga por oficina, tiempo medio de tramitación y tasa de aprobación.

### 4.12 Módulo API — Interfaz REST

**RF-API-001 (M) — API REST versionada (DA)**
- [ ] Recursos JSON bajo `/api/v1` con autenticación por token (Sanctum).
- [ ] Cobertura completa de las operaciones de los módulos PER, ENT, LEG, EXP, CAL, PEN y PAG.

**RF-API-002 (M) — Convenciones de respuesta (DA)**
- [ ] Colecciones paginadas con metadatos de paginación estándar.
- [ ] Errores estructurados conforme a RFC 9457 (problem+json) con código, título y detalle.

**RF-API-003 (M) — Idempotencia y concurrencia (DA)**
- [ ] Creación de recursos protegida contra doble envío (llave de idempotencia opcional).
- [ ] Actualizaciones concurrentes detectadas mediante `updated_at` (optimistic locking).

**RF-API-004 (S) — Documentación (DA)**
- [ ] Especificación OpenAPI generada y publicada en el entorno de desarrollo.
- [x] Spec servida siempre vigente (corrección de usuario, Task 39/SGP-33): la regeneración `L5_SWAGGER_GENERATE_ALWAYS` está activa en desarrollo, tests y staging (`docker-compose.yml`), de modo que la spec publicada en el entorno refleja SIEMPRE el código desplegado — sin ella, el volumen persistente `app-storage` sirve un api-docs.json cacheado de una imagen anterior y el Schema de Entrada de los catálogos deja de reconocer los campos incorporados (`sector`, `deceased_person`) —; el contrato de ApiDocsTest ancla ambos campos en los schemas de entrada del POST y del PATCH, y `info.version` (1.1.0) es la señal de frescura de la spec servida.

---

## 5. Requisitos no funcionales

| ID | Categoría | Requisito | Criterio de verificación |
|---|---|---|---|
| RNF-001 | Rendimiento | Respuesta de APIs transaccionales ≤ 500 ms (p95) con 100 usuarios concurrentes | Prueba de carga en staging |
| RNF-002 | Rendimiento | Listados y reportes paginados ≤ 2 s (p95) sobre volúmenes objetivo (500k personas, 200k expedientes) | Prueba de carga + EXPLAIN de consultas |
| RNF-003 | Disponibilidad | Disponibilidad ≥ 99,5 % en horario laboral (7×12) | Monitoreo de uptime |
| RNF-004 | Seguridad | Hashing Argon2id/bcrypt, rate limiting, validación de entrada en servidor, protección OWASP Top 10 | Revisión de seguridad + suite de tests |
| RNF-005 | Auditoría | Ningún dato crítico se modifica sin registro de autor, fecha y valores previos | Tests de integración de bitácora |
| RNF-006 | Portabilidad | Desplegable on-premise vía Docker/Compose sin servicios externos de internet | Despliegue limpio en VM del Ministerio |
| RNF-007 | Mantenibilidad | Cobertura ≥ 90 % en dominio/aplicación y ≥ 80 % global; PHPStan nivel 8 sin errores | Pipeline de CI |
| RNF-008 | Integridad | Dinero siempre `DECIMAL(12,2)`; ninguna operación financiera con coma flotante | Inspección de esquema + tests |
| RNF-009 | Respaldos | Respaldo diario completo + binlog; RPO ≤ 24 h, RTO ≤ 4 h | Simulacro de restauración mensual |
| RNF-010 | Trazabilidad | Reproducibilidad del cálculo de cualquier pensión histórica | Tests de regresión con datasets congelados |

## 6. Reglas de negocio transversales

| ID | Regla |
|---|---|
| RN-001 | El número de identidad cubano (11 dígitos) valida 11 dígitos, mes (dígitos 3-4) y día (dígitos 5-6); el sexo se codifica en el dígito 10 (par masculino, impar femenino) y se contrasta con el declarado; es único e inmutable (dígito verificador: P-08) |
| RN-002 | Sexo restringido a `M`/`F`; toda regla sensible al sexo deriva de la configuración vigente |
| RN-003 | Las jerarquías de entidades y oficinas son acíclicas; un nodo no puede ser ascendiente de sí mismo |
| RN-004 | En toda entidad con provincia y municipio, el municipio pertenece a la provincia |
| RN-005 | Todo importe monetario se almacena y calcula en `DECIMAL(12,2)` con redondeo bancario |
| RN-006 | Toda fecha de fin es posterior o igual a su fecha de inicio (servicios, vigencias, vigencias legales) |
| RN-007 | La configuración general activa es ÚNICA en el tiempo (una sola fila activa garantizada por constraint de base de datos; Task 55/SGP-40); la historia de versiones es append-only y los cálculos congelan los parámetros usados (desde el reajuste S7, del RÉGIMEN) |
| RN-008 | Toda clave natural declarada única (códigos, NIT, número de expediente, número de control) se garantiza con constraint de base de datos, no solo en aplicación |
| RN-009 | Los números de secuencia (expediente, control bancario) jamás se reutilizan |
| RN-010 | La bitácora y el historial de estados son append-only |

## 7. Supuestos y preguntas abiertas

Durante el análisis se identificaron puntos que requieren validación del área funcional del Ministerio antes o durante la fase de cálculo. Ninguno bloquea el arranque del desarrollo porque el diseño los parametriza, pero sí condiciona los datos de prueba de aceptación.

| ID | Pregunta abierta | Impacto si cambia | Estrategia de contención |
|---|---|---|---|
| P-01 | RESUELTA e IMPLEMENTADA (reajuste 2026-10-06, Task 50): estrategia de promedio por régimen — `best_n`/`last_n`/`all` con N = `required_salary_records` estricto; SPM = Σ(selección)/(N×12) mensual | Motor de cálculo (estrategia) | Columna `average_strategy` + N del régimen; sembrada `best_n`/5 en el General; firma del analista pendiente (gate 8.7) |
| P-02 | ABIERTA (amplificada): semántica de `meses por año` (valores > 12, dirección) Y fórmula de conversión de `work_cycles` — los ciclos quedan DIFERIDOS del cómputo (dudas del usuario, reajuste 2026-10-06) | Cómputo de años de servicio | M del régimen rige el AT de los servicios desde ya; los ciclos se integran cuando el usuario fije la fórmula |
| P-03 | RESUELTA e IMPLEMENTADA (reajuste 2026-10-06, Task 50): la coletilla NO suma — regla fija, no paramétrica | Cómputo de años de servicio | Exclusión fija de los registros coletilla de la sumatoria |
| P-04 | Funcionalidad futura del catálogo `Tipo de beneficiario` (pensión de sobrevivencia a terceros) | Nuevo submódulo de beneficiarios y pagos repartidos | Catálogo sembrado y modelo preparado para extensión |
| P-05 | Formato del archivo de nómina electrónica exigido por cada agencia | Exportación (RF-PAG-004) | Generador de archivos con plantillas configurables |
| P-06 | Catálogos oficiales definitivos (razas, niveles educacionales, categorías, tipos de pensión, regímenes vigentes) | Seeders y pruebas de aceptación | Seeders versionables en el repositorio, ajustables sin migraciones |
| P-07 | Volumen real de datos históricos a migrar y fuente autorizada | Plan de fases 7 | Migración como proyecto aparte, acotada al inicio de UAT |
| P-08 | Algoritmo oficial del dígito verificador del carnet de identidad (posición 11); no existe fuente pública verificable | Validación de identidad en People (RN-001) | Validación estructural corregida 2026-09-30 (ADR-30: 11 dígitos, mes/día y sexo por paridad del dígito 10 — año y consecutivo sin validar); política de checksum intercambiable cuando el Ministerio confirme la regla |
| P-09 | Residencia en el municipio especial Isla de la Juventud: el municipio no pertenece a provincia alguna, pero la corrección de la Task 42 exige provincia y municipio de residencia obligatorios y coherentes (RN-004) | Expediente: promoventes residentes en la Isla de la Juventud no podrían declarar una residencia válida | Implementado con la misma regla de entidades/oficinas/agencias (RN-004 plena: el municipio especial queda fuera del dominio de residencia — 422 sobre residence_municipality_id); la alternativa (provincia de residencia nullable solo para el municipio especial) queda registrada por si el área funcional la reclama |

## 8. Matriz de trazabilidad

Resumen de correspondencia requisito → módulo arquitectónico → tablas principales. El detalle completo de columnas reside en `Modelo de datos.md`.

| Grupo de requisitos | Módulo Laravel | Tablas principales |
|---|---|---|
| RF-CAT-* | Catalogs, Settings | `provinces`, `municipalities`, `agency_types`, `agencies`, `organizations`, `pension_regimes`, `income_concepts`, `general_settings`, `numbering_sequences` |
| RF-PER-* | People | `people`, `races` |
| RF-ENT-* | Organizations | `entity_types`, `entities`, `office_types`, `offices`, `positions`, `authorized_signatures` |
| RF-LEG-* | LegalBasis | `legal_basis_types`, `legal_bases` |
| RF-EXP-* | PensionCases | `pension_cases`, `salary_records`, `service_records`, `work_cycles`, `pension_case_histories` |
| RF-CAL-* | PensionCalculation | consume `pension_cases`, `general_settings`, `pension_regimes`; produce cálculo persistido |
| RF-PEN-* | Pensioners | `pensioners`, `pension_types` |
| RF-PAG-* | Payments | `bank_controls`, `agencies`, `pension_payments` (propuesta; sin `payment_types`, eliminado por la Task 42) |
| RF-SEG-* | Security | `users`, `roles`, `permissions` y tablas de relación |
| RF-AUD-* | Security (Auditing) | `activity_log`, `pension_case_histories` |
| RF-REP-* | Reporting | vistas sobre todas las anteriores |
| RF-API-* | Presentation (transversal) | n/a (capa de interfaz) |

## 9. Cambios y control de versiones

| Versión | Fecha | Cambios | Autor |
|---|---|---|---|
| 1.0 | 2026-09-22 | Versión inicial derivada del análisis del modelo conceptual `mdeditor.a8RzJZB8.md` | Arquitectura Backend |


