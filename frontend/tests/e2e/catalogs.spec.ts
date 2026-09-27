// E2E Test: Catálogos CRUD flow
// Verifica el flujo completo de gestión de catálogos con MSW activado.
// Cubre: index de catálogos, listado de un tipo, crear, editar, desactivar.

import { test, expect } from '@playwright/test';

test.describe('Catálogos CRUD E2E', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('http://localhost:5173/login');
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
    await page.reload();

    // Login como admin
    await page.getByLabel(/Correo electrónico/i).fill('admin@sgp.local');
    await page.getByLabel(/Contraseña/i).fill('password');
    await page.getByRole('button', { name: /Iniciar sesión/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('índice de catálogos muestra los 16 tipos + municipios + agencias', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos');

    // Verificar algunos tipos de catálogo visibles
    await expect(page.getByText('Provincias')).toBeVisible();
    await expect(page.getByText('Tipos de agencia')).toBeVisible();
    await expect(page.getByText('Organismos')).toBeVisible();
    await expect(page.getByText('Régimenes de pensión')).toBeVisible();

    // Verificar municipios y agencias (endpoints dedicados)
    await expect(page.getByText('Municipios')).toBeVisible();
    await expect(page.getByText('Agencias bancarias')).toBeVisible();
  });

  test('listado de catálogo Provincias muestra las 15 provincias', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/provinces');

    // Esperar a que cargue la tabla
    await expect(page.locator('table')).toBeVisible();

    // Verificar algunas provincias
    await expect(page.getByText('Pinar del Río')).toBeVisible();
    await expect(page.getByText('La Habana')).toBeVisible();
    await expect(page.getByText('Santiago de Cuba')).toBeVisible();
    await expect(page.getByText('Guantánamo')).toBeVisible();
  });

  test('crear nueva entrada de catálogo', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/agency-types');
    await expect(page.locator('table')).toBeVisible();

    // Click en "Nuevo"
    await page.getByRole('button', { name: /Nuevo/i }).click();

    // Llenar el formulario del modal
    await page.getByLabel(/Código/i).fill('TEST1');
    await page.getByLabel(/Nombre/i).fill('Tipo de Agencia Test');

    // Guardar
    await page.getByRole('button', { name: /Guardar/i }).click();

    // Verificar que el modal se cierra y la nueva entrada aparece en la tabla
    await expect(page.getByText('Tipo de Agencia Test')).toBeVisible();
  });

  test('editar entrada de catálogo con code inmutable', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/agency-types');

    // Click en el primer botón de editar
    await page.getByRole('button', { name: /Editar/i }).first().click();

    // Verificar que el campo code está deshabilitado en edición
    const codeInput = page.getByLabel(/Código/i);
    await expect(codeInput).toBeDisabled();

    // Modificar el nombre
    const nameInput = page.getByLabel(/Nombre/i);
    await nameInput.clear();
    await nameInput.fill('Nombre modificado por test');

    // Guardar
    await page.getByRole('button', { name: /Guardar/i }).click();

    // Verificar toast de éxito
    await expect(page.getByText(/actualizada correctamente/i)).toBeVisible({ timeout: 5000 });
  });

  test('desactivar entrada sin referencias muestra confirmación', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/agency-types');

    // Crear una nueva entrada para luego desactivarla
    await page.getByRole('button', { name: /Nuevo/i }).click();
    await page.getByLabel(/Código/i).fill('DEL1');
    await page.getByLabel(/Nombre/i).fill('Entrada a Desactivar');
    await page.getByRole('button', { name: /Guardar/i }).click();
    await expect(page.getByText('Entrada a Desactivar')).toBeVisible();

    // Click en desactivar
    await page.getByRole('button', { name: /Desactivar/i }).last().click();

    // Confirmar en el modal
    await expect(page.getByText(/Esta acción desactivará/i)).toBeVisible();
    await page.getByRole('button', { name: /Desactivar/i }).click();
  });

  test('listado de municipios muestra los municipios sembrados', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/municipios');
    await expect(page.locator('table')).toBeVisible();

    await expect(page.getByText('La Habana Vieja')).toBeVisible();
    await expect(page.getByText('Centro Habana')).toBeVisible();
    await expect(page.getByText('Nueva Gerona')).toBeVisible();
  });

  test('listado de agencias muestra las agencias sembradas', async ({ page }) => {
    await page.goto('http://localhost:5173/catalogos/agencias');
    await expect(page.locator('table')).toBeVisible();

    await expect(page.getByText('BPA La Habana Vieja')).toBeVisible();
    await expect(page.getByText('BPA Centro Habana')).toBeVisible();
  });

  test('configuración general muestra 3 versiones seedeadas', async ({ page }) => {
    await page.goto('http://localhost:5173/configuracion-general');

    // Verificar tarjeta de vigente actual
    await expect(page.getByText(/Vigente actual/i)).toBeVisible();

    // Verificar badges de estado
    await expect(page.getByText(/Vigente/i).first()).toBeVisible();
    await expect(page.getByText(/Futura/i)).toBeVisible();
    await expect(page.getByText(/Histórica/i)).toBeVisible();
  });
});
