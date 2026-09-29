import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FullConfig } from '@playwright/test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Siembra la base E2E aislada (`e2e-test.db`) antes de la suite.
 * Incluye `prisma db push`, por lo que `playwright test` es autosuficiente.
 */
async function globalSetup(_config: FullConfig) {
  execSync('pnpm exec tsx scripts/e2e-seed.ts', {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      E2E_DATABASE_URL: 'file:./e2e-test.db',
      DATABASE_URL: 'file:./e2e-test.db',
    },
  });

  // Espera al backend (levantado por webServer) antes de los specs.
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const res = await fetch('http://localhost:3000/api/eventos');
      if (res.ok || res.status === 401 || res.status === 403) return;
    } catch {
      // Reintenta hasta el deadline.
    }
    if (Date.now() > deadline) {
      throw new Error('El backend E2E no respondió en http://localhost:3000');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export default globalSetup;
