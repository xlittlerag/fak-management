import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { adminLoginAs, loginAs } from '../helpers/auth-ui';
import { adminApi, createPublishedSeminario } from '../helpers/api';
import { BASICO_DNI } from '../helpers/env';

const VIEWPORTS = [
  { name: '320', width: 320, height: 568 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1536', width: 1536, height: 864 },
] as const;

const PUBLIC_ROUTES = ['/login', '/register', '/eventos'];
const BASIC_ROUTES = [
  '/dashboard',
  '/dashboard/perfil',
  '/dashboard/eventos',
  '/dashboard/mis-inscripciones',
  '/dashboard/mis-diplomas',
  '/dashboard/certificados',
  '/dashboard/afiliacion',
];
const ADMIN_ROUTES = [
  '/dashboard/usuarios',
  '/dashboard/asociaciones',
  '/dashboard/bajas',
  '/dashboard/eventos-admin',
  '/dashboard/inscripciones',
  '/dashboard/certificados-pendientes',
  '/dashboard/diplomas-admin',
  '/dashboard/reimpresiones',
  '/dashboard/admin/config',
  '/dashboard/auditoria',
  '/dashboard/seguridad',
];

let eventoId: number;

test.beforeAll(async ({ playwright }) => {
  const api = await adminApi(playwright);
  try {
    const evento = await createPublishedSeminario(api);
    eventoId = evento.id;
  } finally {
    await api.dispose();
  }
});

async function auditPage(page: Page, label: string, touch: boolean) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);

  const report = await page.evaluate(() => {
    const isVisible = (el: Element) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const describe = (el: Element) => {
      const html = el.outerHTML.slice(0, 120).replace(/\s+/g, ' ');
      return `${el.tagName.toLowerCase()} ${html}`;
    };

    const doc = document.documentElement;
    const tables = Array.from(document.querySelectorAll('table')).map((t) => ({
      display: getComputedStyle(t).display,
      cards: t.classList.contains('table-cards'),
      text: (t.textContent ?? '').trim().slice(0, 60),
    }));

    const controls = Array.from(
      document.querySelectorAll(
        'button, aside nav a, main input, main select, main textarea',
      ),
    )
      .filter((el) => {
        if (!(el instanceof HTMLElement) || !isVisible(el)) return false;
        if (
          el instanceof HTMLInputElement &&
          ['hidden', 'checkbox', 'radio', 'file'].includes(el.type)
        ) {
          return false;
        }
        return true;
      })
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el: describe(el),
          height: Math.round(rect.height * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
          fontSize: parseFloat(getComputedStyle(el).fontSize),
        };
      });

    const images = Array.from(document.images)
      .filter((img) => isVisible(img) && img.naturalWidth > 0)
      .filter((img) => img.getBoundingClientRect().right > doc.clientWidth + 1)
      .map(describe);

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      tables,
      controls,
      images,
    };
  });

  expect(
    report.scrollWidth,
    `${label}: desborde horizontal del documento`,
  ).toBeLessThanOrEqual(report.clientWidth + 1);
  expect(
    report.bodyScrollWidth,
    `${label}: desborde horizontal del body`,
  ).toBeLessThanOrEqual(report.clientWidth + 1);
  expect(report.images, `${label}: imagen fuera del viewport`).toEqual([]);

  if (touch) {
    const smallControls = report.controls.filter(
      (control) => control.height < 43.5 || control.width < 43.5,
    );
    expect(
      smallControls.map((c) => `${c.el} (${c.width}x${c.height})`),
      `${label}: controles táctiles menores a 44px`,
    ).toEqual([]);

    const smallInputs = report.controls.filter(
      (control) => control.fontSize < 16 && control.el.startsWith('input'),
    );
    expect(
      smallInputs.map((c) => `${c.el} (${c.fontSize}px)`),
      `${label}: inputs con tipografía menor a 16px en móvil`,
    ).toEqual([]);

    const nonCardTables = report.tables.filter((table) => !table.cards);
    expect(
      nonCardTables.map((t) => t.text),
      `${label}: tablas sin modo tarjeta en móvil`,
    ).toEqual([]);
    expect(
      report.tables.filter((table) => !table.display.includes('block')).length,
      `${label}: tablas que no se apilan como tarjetas`,
    ).toBe(0);
  }
}

for (const viewport of VIEWPORTS) {
  const touch = viewport.width < 768;

  test.describe(`Responsive ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test(`páginas públicas @ ${viewport.name}px`, async ({ page }) => {
      for (const route of [...PUBLIC_ROUTES, `/eventos/${eventoId}`]) {
        await page.goto(route);
        await auditPage(page, `${route} @ ${viewport.name}px`, touch);
      }
    });

    test(`dashboard usuario básico @ ${viewport.name}px`, async ({ page }) => {
      await loginAs(page, BASICO_DNI);

      if (viewport.width < 1024) {
        const menuButton = page.getByRole('button', { name: 'Abrir menú' });
        await expect(menuButton).toBeVisible();
        await menuButton.click();
        await expect(
          page.getByRole('button', { name: 'Cerrar menú' }).first(),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Cerrar menú' }).first().click();
      } else {
        await expect(
          page.getByRole('button', { name: 'Abrir menú' }),
        ).toHaveCount(0);
      }

      for (const route of BASIC_ROUTES) {
        await page.goto(route);
        await auditPage(page, `${route} @ ${viewport.name}px`, touch);
      }
    });

    test(`dashboard admin general @ ${viewport.name}px`, async ({ page }) => {
      await adminLoginAs(page);

      for (const route of ADMIN_ROUTES) {
        await page.goto(route);
        await auditPage(page, `${route} @ ${viewport.name}px`, touch);
      }
    });
  });
}
