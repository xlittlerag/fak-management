import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ADMIN_PASSWORD, USER_PASSWORD } from './env';

/** Login de usuario por DNI desde la UI. Termina en /dashboard. */
export async function loginAs(page: Page, dni: string, password = USER_PASSWORD) {
  await page.goto('/login');
  await page.locator('#login-dni').fill(dni);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await expect(page.locator('text=Cerrar Sesión')).toBeVisible();
}

/** Login de ADMIN_GENERAL desde /admin-login. Termina en /dashboard. */
export async function adminLoginAs(page: Page, password = ADMIN_PASSWORD) {
  await page.goto('/admin-login');
  await page.locator('#admin-password').fill(password);
  await page.getByRole('button', { name: 'Ingresar como Administrador' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await expect(page.locator('text=Cerrar Sesión')).toBeVisible();
}
