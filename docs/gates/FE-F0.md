# Gate FE-F0 — Setup

| Campo | Valor |
|---|---|
| Fase | FE-F0 — Setup |
| Sprint | FE-S0 |
| Fecha nominal | 2026-10-26 |
| Fecha real | 2026-09-27 |
| Estado | ✅ SUPERADO |
| Tech lead | Arquitecto Frontend Senior (GLM) |

## Checklist

### Infraestructura de proyecto

- [x] Repo `keniercb/inass_siss_web` con rama `main` y directorio `frontend/`
- [x] `package.json` con dependencias fijadas (React 18, Vite 5, TS 5.7, Tailwind 3.4, TanStack Query 5, Zustand 5, RHF 7, Zod 3, i18next 24, MSW 2, Vitest 2, Playwright 1.49, Axios, Lucide, Headless UI 2, react-hot-toast, class-variance-authority)
- [x] 618+ paquetes npm instalados sin errores
- [x] `.gitignore` configurado para `node_modules/`, `dist/`, `.env*`, logs, etc.

### Configuración

- [x] `vite.config.ts` con alias `@/`, manualChunks (react-vendor, query-vendor, forms-vendor, i18n-vendor), sourcemap
- [x] `tsconfig.json` con `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `noUncheckedIndexedAccess`, paths `@/*`
- [x] `tsconfig.node.json` para vite.config.ts
- [x] `tailwind.config.ts` con design tokens base-nova (sidebar #16202E, primary #418AD1, nova accent semánticos)
- [x] `postcss.config.js` con autoprefixer
- [x] `eslint.config.js` con plugins TypeScript, React, React Hooks, jsx-a11y
- [x] `.prettierrc` con prettier-plugin-tailwindcss
- [x] `playwright.config.ts` con 3 browsers (Chromium, Firefox, WebKit)
- [x] `index.html` con Inter font preload, favicon SVG (#418AD1 con "SGP")
- [x] `.env.example` con `VITE_API_URL`, `VITE_ENABLE_MSW`, `VITE_APP_VERSION`

### Estructura de carpetas

```
src/
├── components/ui/      (Button, Input, Avatar, Toast, DropdownMenu, Dialog, Badge)
├── layout/
│   ├── AppLayout.tsx
│   ├── PublicLayout.tsx
│   ├── sidebar-config.tsx
│   └── components/ (TopNavbar, Sidebar, UserDropdown, LanguageSwitcher)
├── pages/ (LoginPage, DashboardPage, ModulePlaceholder, NotFound)
├── routes/ (router.tsx, ProtectedRoute.tsx)
├── lib/ (http.ts, query-client.ts, utils.ts)
├── store/ (auth-store.ts, ui-store.ts)
├── hooks/ (use-permiso.ts, use-debounce.ts)
├── types/ (domain.ts)
├── i18n/ (index.ts + locales/es-CU, es-ES, en-US con common.json + auth.json)
├── styles/ (theme.css con tokens CSS)
├── test/ (setup.ts)
├── index.css (Tailwind + grid layout + badges)
└── main.tsx
```

### Design System (ADR-FE-19)

- [x] `theme.css` con tokens CSS (--sidebar-bg #16202E, --primary #418AD1, --sidebar-fg #FFFFFF, --sidebar-muted, --sidebar-active, base shadcn/ui neutros, nova accent semánticos)
- [x] Tokens mapeados a TailwindCSS via `tailwind.config.ts`
- [x] Sidebar con bg `#16202E`, texto blanco, item activo `#418AD1`
- [x] Botones primarios con `#418AD1` (variantes cva: primary, secondary, destructive, outline, ghost, link)
- [x] Iconos Lucide tree-shakeable
- [x] Toasts en top-right fijo (top: 64px, z-index 9999, 5s success / 7s error, iconos Lucide)
- [x] Avatar fallback con bg `#418AD1`

### Layout

- [x] `AppLayout` con grid CSS (topnavbar 56px full-width + sidebar 256px + main 1fr + footer 32px)
- [x] `TopNavbar` full-width con: toggle sidebar + logo SGP + breadcrumb + búsqueda global (⌘K hint) + language switcher + UserDropdown
- [x] `UserDropdown` con avatar + nombre + email + rol + acciones (Mi perfil, Configuración, Cerrar sesión)
- [x] `Sidebar` con 10 ítems filtrados por permiso (Dashboard, Personas, Entidades, Expedientes, Base legal, Pensionados, Pagos, Reportes, Auditoría, Catálogos)
- [x] `LanguageSwitcher` con 3 idiomas (es-CU, es-ES, en-US)
- [x] `PublicLayout` minimalista para login
- [x] `ToastContainer` renderizado en main.tsx fuera del layout

### Funcionalidad base

- [x] `auth-store` (Zustand) con persist en `sessionStorage` (ADR-FE-08): token, user, roles, permissions, login(), logout(), setSession(), hasPermission(), hasRole()
- [x] `ui-store` (Zustand) con persist en `localStorage`: sidebarCollapsed, locale, toggleSidebar(), setLocale()
- [x] `http.ts` (Axios) con baseURL configurable (`VITE_API_URL`), interceptors: request añade `Authorization: Bearer`, response maneja 401 (clear auth + redirect /login?expired=1)
- [x] `query-client.ts` (TanStack Query) con staleTime 30s, retry inteligente (no reintenta 4xx excepto 429), refetchOnWindowFocus false
- [x] `i18n/index.ts` con namespaces common + auth, detección por navigator + localStorage (`sgp.lang`), fallback es-CU
- [x] `use-permiso.ts` hook para RBAC (admin tiene todos los permisos implícitamente)
- [x] `use-debounce.ts` hook para inputs de búsqueda
- [x] `utils.ts` con cn() (twMerge+clsx), formatCUP(), formatDate(), uuidv4()

### Componentes UI base

- [x] `Button` con cva (6 variantes × 4 sizes)
- [x] `Input` con estado error
- [x] `Avatar` + `AvatarImage` + `AvatarFallback`
- [x] `Toast` con `ToastContainer` y `useToast()` hook (success/error/warning/info/errorDetail/dismiss)
- [x] `DropdownMenu` con Headless UI (Menu, MenuButton, MenuItems, MenuItem, MenuSeparator, MenuHeading)
- [x] `Dialog` con Headless UI (overlay + panel + título + botón cerrar + ESC)
- [x] `Badge` con 7 variantes (submitted, under_review, approved, rejected, active, suspended, terminated)

### Páginas

- [x] `LoginPage` con formulario Zod + React Hook Form: email + password, validación client-side, mutation con manejo de 401/422/429, mensajes i18n
- [x] `DashboardPage` con tarjetas KPI (visibles por permiso) + sección "Estado del sistema"
- [x] `ModulePlaceholder` para módulos no implementados (muestra sprint previsto)
- [x] `NotFound` (404)

### Router

- [x] `router.tsx` con createBrowserRouter
- [x] Rutas públicas: `/login`
- [x] Rutas autenticadas: `/dashboard`, `/personas`, `/entidades`, `/expedientes`, `/bases-legales`, `/pensionados`, `/pagos`, `/reportes`, `/auditoria`, `/catalogos` (con placeholders + permiso requerido)
- [x] `ProtectedRoute` con verificación de auth + permiso, redirect a login si no auth, Forbidden si no permiso
- [x] Catch-all 404

### i18n

- [x] Namespace `common` con claves: app, actions, status, errors, pagination, table, user, language (es-CU, es-ES, en-US)
- [x] Namespace `auth` con claves: login (title, email, password, submit, errors, validation), session (expired, logout_success) (es-CU, es-ES, en-US)

### CI/CD

- [x] `.github/workflows/ci.yml` con jobs: lint, type-check, test, build, bundle size check (≤ 256 MB), artifact upload

### Build

- [x] Build de producción exitoso en 4.36s
- [x] TypeScript strict sin errores
- [x] Bundle total: 200 KB gzip (dentro del budget de 250 KB ✓)
- [x] Manual chunks: react-vendor (68 KB gzip), app code (76 KB), forms-vendor (24 KB), i18n-vendor (18 KB), query-vendor (10 KB), CSS (4.5 KB)

## Verificación

```bash
# Build
cd frontend && npm run build
# Resultado: ✓ 1970 modules transformed, built in 4.36s
# Bundle total: ~200 KB gzip (budget 250 KB ✓)

# Type check
npm run type-check
# Resultado: sin errores

# Dev server
npm run dev
# Resultado: Vite dev server en http://localhost:5173
```

## Próximos pasos (FE-S1)

- Login funcional contra backend real cuando `/auth/me` esté enriquecido con roles y permissions
- Implementar MSW handler para `/auth/me` en desarrollo
- Configurar rate limiting (5 intentos fallidos → bloqueo)
- Lazy loading por ruta
- Tests E2E de auth flow

## Firma

- Tech lead: Arquitecto Frontend Senior (GLM)
- Fecha: 2026-09-27
- Estado: ✅ SUPERADO — Sprint FE-S0 completado, listo para iniciar FE-S1
