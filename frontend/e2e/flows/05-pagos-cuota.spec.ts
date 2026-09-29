import { test, expect } from '@playwright/test';
import { adminApi, approveUser, baseAsociacionDojo, registerUser } from '../helpers/api';
import { loginAs } from '../helpers/auth-ui';

test.describe('Pago de cuota federativa (modo simulado)', () => {
  test('usuario adeudando paga por UI y queda al día', async ({ page, playwright }) => {
    const admin = await adminApi(playwright);
    const { asociacionId, dojoId } = await baseAsociacionDojo(admin);
    const nuevo = await registerUser(admin, asociacionId, dojoId);
    await approveUser(admin, nuevo.id);
    await admin.dispose();

    await loginAs(page, nuevo.dni);

    // Tarjeta de cuota con estado deudor.
    await expect(page.getByText('Mi Cuota Federativa').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Adeuda').first()).toBeVisible();

    // Checkout simulado (MERCADO_PAGO_SIMULATED=true en el backend E2E).
    await page.getByRole('button', { name: 'Pagar con Mercado Pago' }).click();
    const simular = page.getByRole('button', {
      name: 'Pagar en modo prueba (simulado)',
    });
    await expect(simular).toBeVisible({ timeout: 15000 });
    await simular.click();

    await expect(page).toHaveURL(/\/pagos\/exito/, { timeout: 15000 });
    await expect(page.getByText('¡Pago Exitoso!')).toBeVisible();

    // Al volver, la cuota figura al día.
    await page.goto('/dashboard');
    await expect(page.getByText('Al día').first()).toBeVisible({ timeout: 15000 });
  });
});
