# E2E Test: Auth Flow
# Verifica el flujo completo de autenticación con MSW activado en dev mode.
# Cubre: login → redirect → logout → sesión expirada
#
# Requisitos:
# - Dev server corriendo con VITE_ENABLE_MSW=true (default en dev)
# - Playwright configurado con webServer (auto-start en tests)

import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  admin: { email: 'admin@sgp.local', password: 'password' },
  operator: { email: 'operator@sgp.local', password: 'password' },
  auditor: { email: 'auditor@sgp.local', password: 'password' },
} as const;

test.describe('Auth Flow E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    // Limpiar sessionStorage y localStorage antes de cada test
    await context.clearCookies();
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();
  });

  test('login exitoso con admin redirige al dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Llenar credenciales admin
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();

    // Verificar redirect al dashboard
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verificar que el TopNavbar muestra el nombre del usuario
    await expect(page.locator('header')).toContainText(/SGP Demo Admin/i);

    // Verificar que el sidebar está visible
    await expect(page.locator('aside')).toBeVisible();
  });

  test('login con credenciales inválidas muestra error sin redirigir', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill('wrong-password');
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();

    // Verificar que sigue en /login
    await expect(page).toHaveURL(/\/login$/);

    // Verificar mensaje de error visible
    await expect(page.getByText(/Credenciales inválidas/i)).toBeVisible();
  });

  test('logout redirige a login', async ({ page }) => {
    // Login primero
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Abrir el UserDropdown (click en el avatar/nombre)
    await page.getByRole('button', { name: /SGP Demo Admin/i }).click();

    // Click en "Cerrar sesión"
    await page.getByRole('menuitem', { name: /Cerrar sesión/i }).click();

    // Verificar redirect a login
    await expect(page).toHaveURL(/\/login$/);
  });

  test('sidebar muestra ítems según el rol del usuario', async ({ page }) => {
    // Login como admin — debería ver todos los ítems
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verificar ítems del sidebar visibles para admin
    const sidebar = page.locator('aside');
    await expect(sidebar).toContainText(/Dashboard/i);
    await expect(sidebar).toContainText(/Personas/i);
    await expect(sidebar).toContainText(/Expedientes/i);
    await expect(sidebar).toContainText(/Auditoría/i);
  });

  test('sidebar con operator muestra ítems según sus permisos', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.operator.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.operator.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const sidebar = page.locator('aside');

    // Operator tiene permisos para ver Personas, Expedientes
    await expect(sidebar).toContainText(/Personas/i);
    await expect(sidebar).toContainText(/Expedientes/i);

    // Operator no tiene permisos para ver Auditoría (no 'audit.view')
    await expect(sidebar).not.toContainText(/Auditoría/i);
  });

  test('sesión persiste tras refresco de página', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Refrescar
    await page.reload();

    // Debe seguir autenticado (no redirigir a login)
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('header')).toContainText(/SGP Demo Admin/i);
  });

  test('ruta protegida sin sesión redirige a login', async ({ page }) => {
    // Intentar acceder a /expedientes sin login
    await page.goto('http://localhost:5173/expedientes');

    // Debe redirigir a /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('sidebar colapsable funciona', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.getByLabel(/Correo electrónico/i).fill(TEST_CREDENTIALS.admin.email);
    await page.getByLabel(/Contraseña/i).fill(TEST_CREDENTIALS.admin.password);
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Click en el botón de toggle (PanelLeftClose cuando expandido)
    const toggleButton = page.getByRole('button', { name: /Colapsar menú lateral/i });
    await toggleButton.click();

    // Verificar que el botón ahora muestra "Expandir"
    await expect(page.getByRole('button', { name: /Expandir menú lateral/i })).toBeVisible();

    // Click de nuevo para expandir
    await page.getByRole('button', { name: /Expandir menú lateral/i }).click();
    await expect(page.getByRole('button', { name: /Colapsar menú lateral/i })).toBeVisible();
  });
});
