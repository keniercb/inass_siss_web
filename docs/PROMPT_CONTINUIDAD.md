# Prompt de continuidad — INASS SISS Web (frontend)

> **Uso**: pegar este documento completo al inicio de un nuevo chat para retomar el trabajo sin perder contexto. Mantener actualizado después de cada tarea. Ubicación: `docs/PROMPT_CONTINUIDAD.md`.

---

## 1. Rol y contexto

Eres el agente de desarrollo frontend del sistema **INASS SISS Web** (`inass_siss_web/`, React 18 + TypeScript + Vite + TanStack Query + react-i18next + Headless UI + Tailwind CSS + MSW para mocks). El repositorio está en `/home/z/my-project/repo/inass_siss_web`.

El backend está en otro repo (`inass_siss`, Laravel 12 + PHP 8.3 + MySQL 8.4). La conexión entre ambos es la spec OpenAPI: `docs/backend/docs.json` (generado por Scribe) → `npm run sync:api` → `frontend/src/types/api.ts`.

### Stack y convenciones inapelables
- **React 18 + TypeScript estricto** — `npm run type-check` (tsc --noEmit) debe pasar verde.
- **Vite** — dev server en puerto 5173.
- **TanStack Query v5** — mutations con `onSuccess` (invalidateQueries + toast) y `onError` (422 con `errors` → toast.errorDetail).
- **react-i18next** — 3 locales paritarios: es-CU, es-ES, en-US. Sin strings hardcodeadas en TSX.
- **Headless UI Dialog** — `z-[10000]` para modales.
- **Tailwind CSS** — clases utility.
- **MSW** — handlers en `mocks/handlers/` para desarrollo local. Shape-only, sin lógica de negocio.
- **Zod** — schemas en `features/<modulo>/schemas/`.
- **lucide-react** — iconos.
- **react-hot-toast** — toasts con `z-index: 10100` (por encima de modales).

### Jerarquía de z-index
- Dialog (modal): `z-[10000]`
- SearchSelect portal (dropdown): `z-index: 10050`
- Toast container: `z-index: 10100`

### formatDate (lib/utils.ts)
Las cadenas date-only (`YYYY-MM-DD`, 10 chars) se interpretan como LOCAL (`new Date(iso + 'T00:00:00')`) para evitar el off-by-one del parsing UTC. Las datetime con TZ pasan tal cual. **Nunca** usar `new Date('2026-01-01')` directamente en otros archivos — siempre usar `formatDate()` de lib/utils.ts.

### Regla de textos user-facing
**PROHIBIDO** referenciar Tasks, Doctrinas (D-73xx, D-74xx), Bloques (A/B/C), RF-INV, SGP, Sprints (S8, S9) o números de issue en strings i18n, placeholders, labels, help texts, tooltips. Esas referencias solo son válidas en comentarios de código (developer-facing).

### Comando `act_backend`
Cuando el usuario dice `act_backend`:
1. `git fetch origin main`
2. Diff `docs/backend/docs.json` entre HEAD y `origin/main`
3. Analizar cambios (versión, paths, schemas, props)
4. `npm run sync:api` para regenerar `api.ts`
5. Preparar plan de ajustes del frontend
6. **Presentar el plan y esperar confirmación** — NO ejecutar hasta que el usuario apruebe

---

## 2. Estructura del repo

```
inass_siss_web/
├── docs/
│   ├── backend/                    # docs.json + .md maestros del backend
│   └── PROMPT_CONTINUIDAD.md       # ← este archivo
├── frontend/
│   ├── src/
│   │   ├── components/ui/           # Dialog, Button, Input, SearchSelect, DatePickerField, Toast, Badge, DropdownMenu
│   │   ├── features/
│   │   │   ├── auth/api/mutations.ts        # useChangeLanguage
│   │   │   ├── catalogs/                    # 17 tipos uniformes via /catalogos/:type
│   │   │   ├── disability-config/           # reglas invalidez, modificaciones especiales, reglas beneficiario
│   │   │   ├── pension-cases/               # schemas, api, pages (List, Detail), components (FormModal, TransitionModal)
│   │   │   ├── pensioners/                  # api/queries, pages (List, Detail)
│   │   │   ├── payments/                    # api, pages (List, Detail, PayrollExports)
│   │   │   ├── settings/                    # GeneralSettings
│   │   │   ├── people/ organizations/ agencies/ municipalities/ roles/ users/ legal-basis/
│   │   ├── layout/                 # AppLayout, TopNavbar, Sidebar, UserDropdown, LanguageSwitcher, sidebar-config.tsx
│   │   ├── lib/                    # http.ts (axios), utils.ts (cn, formatCUP, formatDate, uuidv4)
│   │   ├── store/                  # auth-store.ts (zustand), ui-store.ts
│   │   ├── mocks/handlers/         # auth, catalogs, disability-config, pension-cases, pensioners, payments, etc.
│   │   ├── i18n/locales/{es-CU,es-ES,en-US}/common.json
│   │   └── types/api.ts            # generado por sync:api — NO editar a mano
│   └── package.json                # scripts: sync:api, type-check, test, dev, build
└── worklog.md
```

### Catálogos (17 uniformes + 2 dedicados)
`VALID_CATALOG_TYPES` en `catalog-types.ts`: provinces, agency-types, organizations, entity-types, office-types, legal-basis-types, scientific-categories, educational-levels, occupational-categories, pension-types, beneficiary-types, races, positions, pension-regimes, income-concepts, diseases.

**Importante**: el menú lateral (`layout/sidebar-config.tsx`) tiene una lista HARDCODED de catálogos — no lee de `VALID_CATALOG_TYPES`. Si se añade un catálogo nuevo, actualizar AMBOS lugares.

### pension-types: eje retirement_type
El booleano `deceased_person` (Task 38) fue sustituido por `retirement_type: 'edad' | 'invalidez' | 'fallecimiento'`. La rama invalidez exige el bloque de invalidez del expediente.

### Bloque de invalidez del expediente (PensionCase)
5 campos condicionales: `disease_id`, `disease_origin` (enum 4 valores), `re_assessment_date`, `requires_personal_care`, `temporary_disability`. Obligatorios cuando el pension_type tiene `retirement_type === 'invalidez'`, prohibidos en el resto. El frontend NO valida coherencia — el backend la hace con 422.

### Configuración de invalidez (features/disability-config/)
4 recursos CRUD (tag Settings, spec 1.34.0):
- `DisabilityRule` — regla por origen (5 orígenes incluyendo 'fallecimiento'), con brackets anidados
- `DisabilityIncrementBracket` — tramo por rango de años
- `SpecialDisabilityModification` — modificación nominada (code + percent)
- `BeneficiaryRule` — regla por rango de cantidades de beneficiarios

Página unificada en `/configuracion-invalidez` con 3 secciones.

### Consulta FUC (GET /fuc/people/{identityNumber}, spec 1.44.0)
En el formulario de ALTA de persona (`PersonFormModal`), botón «Consultar Ficha Única» junto al campo CI (solo modo alta; en edición el CI está deshabilitado). Habilitado solo con CI estructuralmente válido (11 dígitos + mes 01-12 + día 01-31 en dígitos 3-6 — validación de formato, no de negocio). El hook `useFucPersonLookup` (people/api/mutations.ts) dispara la consulta; con 200 autollena: nombres, apellidos, sexo, birth_date, dirección, padre, madre y `citizen_card_id` ← **fuc_id (UID-P de 32 chars [A-Z0-9])**. Los null del proveedor no tocan el valor actual. Si `deceased === true` muestra toast de advertencia (no bloquea). Errores: 404/422/502/503/504 llegan con `message` — se muestra como detalle del toast con título localizado. El Zod de citizen_card_id ahora es max(32).

### Declaración de fallecimiento (to=deceased, spec 1.44.0)
Quinto destino de la máquina de estados — `TRANSITION_MATRIX.approved` incluye `{ to: 'deceased', permission: 'cases.approve', deathBlockRequired: true }`. `deceased` es TERMINAL (matriz vacía, jamás reabrible). `CaseTransitionModal` recibe prop `pensionTypeId` y oculta el destino cuando el tipo de pensión es rama fallecimiento (el backend lo rechaza 422). El bloque de defunción (5 claves todo-o-nada: disease_id + disease_origin + death_date + death_certificate + death_certificate_date) se captura en el modal; **forced_age_retirement JAMÁS viaja — el sistema lo escribe TRUE**. La nota es opcional (el certificado es la evidencia). Badge `badge-deceased` (zinc) en CSS. Tras 200, `derived_case` llega en la respuesta: la mutation hace `setQueryData` del derivado y toast con su número.

En el expediente derivado: `parent_case_id` se muestra en el resumen («Expediente de origen #N»), los subregistros copiados nacen con `derived: true` — la UI muestra distintivo «Copia» + candado en vez del botón de borrar (el DELETE del mock responde 422 como el backend). El índice soporta `parent_case_id` como filtro de búsqueda inversa.

---

## 3. Estado actual

**Rama activa**: `feat/task-85-86-consulta-fuc-declaracion-fallecimiento`
**Spec OpenAPI consumida**: 1.44.0
**Último commit**: ver `git log --oneline -3`

### Tareas completadas
- Task 72/73 (spec 1.31.0): pagos iniciales, meses imputables, idioma del usuario
- Task 74 Bloque C (spec 1.32.0): catálogo diseases, eje retirement_type, bloque invalidez en PensionCase
- Tasks 75/76 (spec 1.34.0): configuración de invalidez (reglas, brackets, modificaciones especiales, reglas de beneficiario)
- Tasks 77-81 (spec 1.39.0): age_of_majority, maximum_percent, bloque de defunción del expediente (Causa/Tipo), Familiares con derecho como tab independiente + EntitledRelativeFormModal
- Task 82 (spec 1.41.0): proyecciones embebidas de EntitledRelative (beneficiary/tutor/type/agencias) sin casts
- Task 84 (spec 1.42.0): forced_age_retirement (checkbox «Forzar jubilación por edad» en el bloque de defunción)
- Task 85 (spec 1.44.0): consulta FUC con autollenado del formulario de persona + UID-P en citizen_card_id
- Task 86 (spec 1.44.0): declaración de fallecimiento (to=deceased, terminal) con expediente derivado de sobrevivientes + subregistros derivados bloqueados + parent_case_id
- modern-web-guidance v1.0.1: scrollbars estándar, toSorted, ES2023, autoComplete en formularios
- Fixes UX: pago inicial al aprobar, formatDate off-by-one, toast z-index, menú lateral diseases
- Limpieza i18n: sin referencias a Tasks/Doctrinas en textos user-facing

---

## 4. Comandos útiles

```bash
# Sincronizar tipos desde docs.json
cd frontend && npm run sync:api

# Type-check
npm run type-check

# Tests
npm test -- --run

# Dev server
npm run dev

# Commit workflow
git add -A && git commit -m "feat(scope): descripción"
git push origin <branch>

# Analizar nuevos docs del backend (act_backend)
git fetch origin main
git diff HEAD..origin/main -- docs/backend/docs.json
git checkout origin/main -- docs/backend/docs.json
npm run sync:api
npm run type-check
```

---

## 5. Notas de seguridad

- El PAT de GitHub se configura en la URL del remote. **Nunca pegar PATs en el chat** — si el usuario pega uno, usarlo solo para `git remote set-url` y recomendar revocarlo después.
- El remote URL contiene credenciales embebidas — no imprimir `git remote -v` en output que se comparta.
- Si el sandbox se recicla entre mensajes, los commits no empujados se pierden. Siempre empujar antes de terminar.
