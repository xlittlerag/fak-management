import { test, expect } from '@playwright/test';
import { adminLoginAs, loginAs } from '../helpers/auth-ui';
import { ASOC_DNI, BASICO_DNI, DESAFILIADO_DNI } from '../helpers/env';

test.describe('Roles y panel', () => {
  test('ADMIN_GENERAL entra por /admin-login y cae en Miembros', async ({ page }) => {
    await adminLoginAs(page);
    await expect(page).toHaveURL(/\/dashboard\/usuarios/);
    await expect(page.getByRole('heading', { name: 'Miembros' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('BASICO ve su menú (perfil, eventos, inscripciones)', async ({ page }) => {
    await loginAs(page, BASICO_DNI);
    await expect(page.getByRole('link', { name: 'Mi Perfil' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver Eventos' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mis Inscripciones' })).toBeVisible();
  });

  test('ADMIN_ASOCIACION ve Miembros y no ve Auditoría', async ({ page }) => {
    await loginAs(page, ASOC_DNI);
    await expect(page.getByRole('link', { name: 'Miembros' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Auditoría' })).toHaveCount(0);
  });

  test('DESAFILIADO solo accede a perfil y afiliación', async ({ page }) => {
    await loginAs(page, DESAFILIADO_DNI);
    // La app redirige al perfil para desafiliados.
    await expect(page).toHaveURL(/\/dashboard\/(perfil|afiliacion)/, { timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Ver Eventos' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Mis Inscripciones' })).toHaveCount(0);
  });

  test('cerrar sesión vuelve al login', async ({ page }) => {
    await loginAs(page, BASICO_DNI);
    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
