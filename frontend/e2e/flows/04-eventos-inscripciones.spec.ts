import { test, expect } from '@playwright/test';
import {
  adminApi,
  approveUser,
  baseAsociacionDojo,
  createPublishedSeminario,
  inscribir,
  pagarCuota,
  registerUser,
  userApi,
} from '../helpers/api';
import { adminLoginAs, loginAs } from '../helpers/auth-ui';

test.describe('Eventos e inscripciones', () => {
  test('flujo completo: publicación, inscripción, aprobación por UI y estado visible', async ({
    page,
    playwright,
  }) => {
    // Preparación por API con datos únicos.
    const admin = await adminApi(playwright);
    const { id: eventoId } = await createPublishedSeminario(admin);
    const { asociacionId, dojoId } = await baseAsociacionDojo(admin);
    const nuevo = await registerUser(admin, asociacionId, dojoId);
    await approveUser(admin, nuevo.id);
    await admin.dispose();

    const user = await userApi(playwright, nuevo.dni);
    await pagarCuota(user);
    await inscribir(user, eventoId);
    await user.dispose();

    // Aprobación desde la UI de administración.
    await adminLoginAs(page);
    await page.goto('/dashboard/inscripciones');
    await page.locator('#inscripciones-busqueda').fill(nuevo.dni);
    const fila = page.locator('tbody tr', { hasText: nuevo.dni });
    await expect(fila).toBeVisible({ timeout: 15000 });
    await fila.getByRole('button', { name: 'Aprobar' }).click();
    await expect(page.getByText('No hay inscripciones pendientes.')).toBeVisible({
      timeout: 15000,
    });

    // El usuario ve su inscripción aprobada en su panel.
    await page.goto('/login');
    await loginAs(page, nuevo.dni);
    await page.getByRole('link', { name: 'Mis Inscripciones' }).click();
    await expect(page).toHaveURL(/\/dashboard\/mis-inscripciones/);
    await expect(page.getByText('SEMINARIO').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Aprobado').first()).toBeVisible();
  });

  test('búsqueda de inscripciones filtra por DNI', async ({ page, playwright }) => {
    const admin = await adminApi(playwright);
    const { id: eventoId } = await createPublishedSeminario(admin);
    const { asociacionId, dojoId } = await baseAsociacionDojo(admin);
    const nuevo = await registerUser(admin, asociacionId, dojoId);
    await approveUser(admin, nuevo.id);
    await admin.dispose();

    const user = await userApi(playwright, nuevo.dni);
    await pagarCuota(user);
    await inscribir(user, eventoId);
    await user.dispose();

    await adminLoginAs(page);
    await page.goto('/dashboard/inscripciones');
    await page.locator('#inscripciones-busqueda').fill(nuevo.dni);
    await expect(page.locator('tbody tr', { hasText: nuevo.dni })).toBeVisible({
      timeout: 15000,
    });
    // Un DNI inexistente no debe mostrar filas.
    await page.locator('#inscripciones-busqueda').fill('00000000-ZZZ');
    await expect(page.getByText('No hay inscripciones pendientes.')).toBeVisible({
      timeout: 15000,
    });
  });
});
