# SGP — Frontend

Sistema de Gestión de Pensionados (SGP) — Frontend React + Vite + TailwindCSS para el Ministerio de Trabajo de Cuba.

## Stack

- **Vite** 5 + **React** 18 + **TypeScript** strict
- **React Router** v6 (data router)
- **TanStack Query** v5 (cache server state)
- **Zustand** 5 (client state)
- **TailwindCSS** 3.4 + design system `base-nova`
- **Headless UI** 2 + **shadcn/ui** pattern
- **React Hook Form** 7 + **Zod** 3
- **i18next** + namespaces por módulo (es-CU, es-ES, en-US)
- **MSW** 2 (mocking)
- **Vitest** + **Testing Library** + **Playwright** (testing)
- **Lucide** (iconos)

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar .env
cp .env.example .env

# 3. Iniciar dev server
npm run dev

# 4. Abrir http://localhost:5173
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Build de producción (`tsc -b && vite build`) |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | ESLint con --max-warnings 0 |
| `npm run type-check` | TypeScript check sin emit |
| `npm run test` | Vitest en modo run (CI) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:e2e` | Playwright E2E |
| `npm run format` | Prettier write |
| `npm run sync:api` | Regenera tipos desde `../docs/backend/docs.json` |
| `npm run msw:init` | Inicializa Service Worker de MSW |

## Estructura

```
src/
├── components/
│   ├── ui/            # Componentes base (Button, Input, Toast, Avatar, Dialog, ...)
│   └── crud/          # Componentes del patrón CRUD genérico (futuro)
├── layout/
│   ├── AppLayout.tsx
│   ├── PublicLayout.tsx
│   ├── sidebar-config.tsx
│   └── components/
│       ├── TopNavbar.tsx
│       ├── Sidebar.tsx
│       ├── UserDropdown.tsx
│       └── LanguageSwitcher.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ModulePlaceholder.tsx
│   └── NotFound.tsx
├── routes/
│   ├── router.tsx
│   └── ProtectedRoute.tsx
├── lib/
│   ├── http.ts        # Cliente Axios con interceptors
│   ├── query-client.ts # TanStack Query config
│   ├── i18n.ts        # Setup i18next
│   └── utils.ts       # cn(), formatCUP(), formatDate(), uuidv4()
├── store/
│   ├── auth-store.ts  # Zustand: token, user, roles, permissions
│   └── ui-store.ts    # Zustand: sidebar, locale
├── hooks/
│   ├── use-permiso.ts
│   └── use-debounce.ts
├── types/
│   └── domain.ts      # CaseStatus, PensionerStatus, etc.
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── es-CU/     # Español Cuba (default)
│       ├── es-ES/     # Español España
│       └── en-US/     # English US
├── styles/
│   └── theme.css     # Design tokens (base-nova + colores de marca)
└── index.css          # Tailwind + grid layout
```

## Design System

- **Sidebar**: `#16202E` (azul oscuro)
- **Botones primarios**: `#418AD1`
- **Estilo**: base-nova (shadcn/ui base + acentos semánticos)
- **Iconografía**: Lucide
- **Toasts**: top-right fijo (debajo del TopNavbar, z-index 9999)

Ver `docs/frontend/02_Diseno_Arquitectura_Frontend.md` sección 4.4 para el detalle completo.

## CI/CD

GitHub Actions workflow en `.github/workflows/ci.yml`:
- Lint + type-check + test + build
- Bundle size check (≤ 256 MB budget)
- Artifact upload de `dist/`

## Estado actual

**Sprint FE-S0 — Setup** (completado)

Gate FE-F0:
- ✅ Repo y dependencias
- ✅ Vite + TypeScript strict
- ✅ TailwindCSS con design tokens
- ✅ ESLint + Prettier + Vitest + Playwright
- ✅ AppLayout + TopNavbar + Sidebar + UserDropdown
- ✅ ToastContainer + useToast hook
- ✅ PublicLayout + LoginPage (form + Zod + RHF)
- ✅ ProtectedRoute + router con placeholders por módulo
- ✅ i18next con namespaces common + auth (3 idiomas)
- ✅ Zustand stores (auth-store + ui-store)
- ✅ GitHub Actions CI

Próximos sprints:
- **FE-S1**: Login funcional contra backend real (cuando `/auth/me` esté enriquecido)
- **FE-S2**: Catálogos (16 tipos) + Configuración general
- **FE-S3**: Personas + Usuarios
- ... ver `docs/frontend/03_Plan_De_Desarrollo_Frontend.md`
