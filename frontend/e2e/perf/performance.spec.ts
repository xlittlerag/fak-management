import fs from 'node:fs';
import path from 'node:path';
import type { Page, CDPSession } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { loginAs, adminLoginAs } from '../helpers/auth-ui';
import { BASICO_DNI } from '../helpers/env';

/**
 * Harness de performance (Iteración 21).
 *
 * Mide Core Web Vitals y costo de red en flujos reales vía CDP (Chromium).
 * Se saltea salvo `PERF=1` para no ensuciar CI ni la suite funcional:
 *
 *   PERF=1 pnpm e2e -- e2e/perf/performance.spec.ts
 *
 * Escribe un JSON por escenario en `perf-results/` para comparar antes/después.
 * Un incremento de red o una métrica peor hace fallar el test contra los
 * umbrales de `perf-budget.json` (si existe).
 */

const PERF = process.env.PERF === '1';
const OUT_DIR = path.resolve(process.cwd(), 'perf-results');
const BUDGET_FILE = path.resolve(process.cwd(), 'perf-budget.json');

interface WebVitals {
  lcp: number | null;
  cls: number;
  fcp: number | null;
  ttfb: number | null;
}

interface ResourceEntry {
  name: string;
  transferSize: number;
  duration: number;
  initiatorType: string;
}

interface ScenarioResult {
  name: string;
  vitals: WebVitals;
  requests: number;
  thirdPartyRequests: number;
  transferKB: number;
  resources: ResourceEntry[];
}

const WEB_VITALS_SNIPPET = `
(() => {
  const state = { lcp: null, cls: 0, fcp: null, ttfb: null };
  window.__perfVitals = state;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') state.fcp = entry.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch {}
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) state.ttfb = nav.responseStart;
  } catch {}
})();
`;

async function collect(page: Page, cdp: CDPSession): Promise<ScenarioResult> {
  await page.waitForTimeout(1500);
  const vitals = await page.evaluate(() => {
    const s = (window as unknown as { __perfVitals?: WebVitals }).__perfVitals;
    return s ?? { lcp: null, cls: 0, fcp: null, ttfb: null };
  });
  const resources = await page.evaluate(
    () =>
      performance.getEntriesByType('resource').map((r) => ({
        name: r.name,
        transferSize: (r as PerformanceResourceTiming).transferSize,
        duration: Math.round(r.duration),
        initiatorType: (r as PerformanceResourceTiming).initiatorType,
      })) as ResourceEntry[],
  );
  const requests = resources.length;
  const transferKB = Math.round(
    resources.reduce((sum, r) => sum + r.transferSize, 0) / 1024,
  );
  const thirdPartyRequests = resources.filter(
    (r) => !r.name.includes('localhost'),
  ).length;

  await cdp.send('Network.disable').catch(() => undefined);
  return {
    name: '',
    vitals,
    requests,
    thirdPartyRequests,
    transferKB,
    resources,
  };
}

function loadBudget(): Record<
  string,
  { maxRequests?: number; maxTransferKB?: number; maxLcp?: number }
> {
  // Los umbrales sólo aplican al build de producción (PERF_BASE_URL); en los
  // dev servers de Vite el grafo de módulos y los tamaños no son comparables.
  if (!process.env.PERF_BASE_URL) return {};
  try {
    return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function runScenario(
  name: string,
  page: Page,
  navigate: () => Promise<void>,
): Promise<ScenarioResult> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await page.addInitScript(WEB_VITALS_SNIPPET);
  await navigate();
  const result = { ...(await collect(page, cdp)), name };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, `${name}.json`),
    JSON.stringify(result, null, 2),
  );
  return result;
}

function assertBudget(result: ScenarioResult) {
  const budget = loadBudget()[result.name];
  if (!budget) return;
  if (budget.maxRequests !== undefined) {
    expect(result.requests, `${result.name}: requests`).toBeLessThanOrEqual(
      budget.maxRequests,
    );
  }
  if (budget.maxTransferKB !== undefined) {
    expect(result.transferKB, `${result.name}: transferKB`).toBeLessThanOrEqual(
      budget.maxTransferKB,
    );
  }
  if (budget.maxLcp !== undefined && result.vitals.lcp !== null) {
    expect(result.vitals.lcp, `${result.name}: LCP`).toBeLessThanOrEqual(
      budget.maxLcp,
    );
  }
}

test.describe('performance', () => {
  test.skip(!PERF, 'Se ejecuta solo con PERF=1');

  test('login público', async ({ page }) => {
    const result = await runScenario('login', page, async () => {
      await page.goto('/login');
      await page.waitForSelector('#login-dni');
    });
    assertBudget(result);
  });

  test('dashboard básico', async ({ page }) => {
    const result = await runScenario('dashboard-basico', page, async () => {
      await loginAs(page, BASICO_DNI);
    });
    assertBudget(result);
  });

  test('dashboard admin', async ({ page }) => {
    const result = await runScenario('dashboard-admin', page, async () => {
      await adminLoginAs(page);
    });
    assertBudget(result);
  });
});
