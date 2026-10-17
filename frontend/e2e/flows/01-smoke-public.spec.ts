import { test, expect } from '@playwright/test';
import { adminApi, createPublishedSeminario } from '../helpers/api';

test.describe('Smoke público', () => {
  test('la página de eventos carga con su encabezado', async ({ page }) => {
    await page.goto('/eventos');
    await expect(
      page.getByRole('heading', { name: 'Próximos Eventos' }),
    ).toBeVisible();
  });

  test('un evento publicado es visible públicamente con su dirección', async ({
    page,
    playwright,
  }) => {
    const admin = await adminApi(playwright);
    const { direccion } = await createPublishedSeminario(admin);
    await admin.dispose();

    await page.goto('/eventos');
    await expect(page.getByText(direccion).first()).toBeVisible();
  });

  test('detalle de evento publicado muestra su tipo', async ({
    page,
    playwright,
  }) => {
    const admin = await adminApi(playwright);
    const { id } = await createPublishedSeminario(admin);
    await admin.dispose();

    await page.goto(`/eventos/${id}`);
    await expect(page.getByText('SEMINARIO').first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('login con credenciales inválidas muestra error y no redirige', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('#login-dni').fill('00000000-inexistente');
    await page.locator('#login-password').fill('ClaveIncorrecta1!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test('ruta desconocida muestra página 404', async ({ page }) => {
    await page.goto('/ruta-que-no-existe-12345');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Página no encontrada')).toBeVisible();
  });
});
