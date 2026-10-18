import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * En entornos sin las dependencias de sistema de los navegadores
 * empaquetados (p. ej. NixOS), se puede usar un Chromium del sistema vía
 * PLAYWRIGHT_CHROMIUM_PATH o detección automática de rutas conocidas.
 * En CI se usa el Chromium empaquetado (instalado con --with-deps).
 */
function systemChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH)
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  for (const p of [
    '/home/francis/.nix-profile/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      // Probar la siguiente ruta.
    }
  }
  return undefined;
}

const executablePath = systemChromium();

// Permite medir performance contra un servidor ya levantado (p. ej. el build
// de producción servido por el backend en :3000) en lugar de los dev servers.
const perfBaseUrl = process.env.PERF_BASE_URL;

/**
 * Suite E2E de navegador (reemplaza el QA manual).
 * - Chromium únicamente.
 * - Base aislada `e2e-test.db` (nunca toca `dev.db`).
 * - `global-setup` siembra la base antes de correr los specs.
 * - `webServer` levanta backend (:3000) y frontend (:5173) automáticamente.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: perfBaseUrl ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: perfBaseUrl
    ? undefined
    : [
        {
          command: 'pnpm start:dev',
          cwd: '..',
          port: 3000,
          timeout: 180 * 1000,
          reuseExistingServer: !process.env.CI,
          env: {
            DATABASE_URL: 'file:./e2e-test.db',
            E2E_DATABASE_URL: 'file:./e2e-test.db',
            JWT_SECRET: 'e2e-test-secret-0123456789abcdef0123456789abcdef',
            MERCADO_PAGO_SIMULATED: 'true',
            MERCADO_PAGO_ACCESS_TOKEN: 'test',
            CORS_ORIGIN: 'http://localhost:5173',
            PORT: '3000',
            // La suite genera mucho tráfico desde una sola IP; se relaja el
            // rate limit solo en el backend E2E (ver app.module.ts).
            THROTTLE_LIMIT: '1000',
          },
        },
        {
          command: 'pnpm dev --port 5173 --strictPort',
          port: 5173,
          timeout: 120 * 1000,
          reuseExistingServer: !process.env.CI,
        },
      ],
});
