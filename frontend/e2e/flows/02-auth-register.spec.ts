import { test, expect } from '@playwright/test';
import { adminApi, anonApi, baseAsociacionDojo, registerUser } from '../helpers/api';
import { loginAs } from '../helpers/auth-ui';
import { BASICO_DNI, USER_PASSWORD, uniqueDni, uniqueSuffix } from '../helpers/env';

test.describe('Autenticación y registro', () => {
  test('registro por UI crea la cuenta y muestra el aviso de aprobación', async ({
    page,
    playwright,
  }) => {
    const anon = await anonApi(playwright);
    const { asociacionId, dojoId } = await baseAsociacionDojo(anon);
    await anon.dispose();

    const suffix = uniqueSuffix();
    const dni = uniqueDni('UI');

    await page.goto('/register');
    await page.locator('#reg-nombre').fill('E2E');
    await page.locator('#reg-apellido').fill('Registro');
    await page.locator('#reg-email').fill(`registro-${suffix}@example.com`);
    await page.locator('#reg-password').fill(USER_PASSWORD);
    await page.locator('#reg-dni').fill(dni);
    await page.locator('#reg-fecha-nacimiento').fill('1995-05-15');
    await page.locator('#reg-asociacion').selectOption(String(asociacionId));
    // El dojo se carga al elegir la asociación (los <option> no son visibles:
    // se espera al estado attached).
    await page
      .locator('#reg-dojo option')
      .nth(1)
      .waitFor({ state: 'attached', timeout: 15000 });
    await page.locator('#reg-dojo').selectOption(String(dojoId));
    await page.locator('#reg-calle-altura').fill('Av. E2E 123');
    await page.locator('#reg-ciudad').fill('CABA');
    await page.locator('#reg-codigo-postal').fill('1000');
    await page.locator('#reg-telefono').fill('1199999999');
    await page.getByRole('button', { name: 'Registrarse' }).click();

    await page.waitForURL('**/login?registered=true', { timeout: 15000 });
    await expect(page.getByText('Registro exitoso')).toBeVisible();
  });

  test('usuario aprobado inicia sesión y ve su panel', async ({ page }) => {
    await loginAs(page, BASICO_DNI);
    await expect(page.getByText(/Bienvenido/i)).toBeVisible();
  });

  test('usuario pendiente de aprobación no puede iniciar sesión', async ({
    page,
    playwright,
  }) => {
    const admin = await adminApi(playwright);
    const { asociacionId, dojoId } = await baseAsociacionDojo(admin);
    const pending = await registerUser(admin, asociacionId, dojoId);
    await admin.dispose();

    await page.goto('/login');
    await page.locator('#login-dni').fill(pending.dni);
    await page.locator('#login-password').fill(USER_PASSWORD);
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.locator('.bg-red-50').first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
