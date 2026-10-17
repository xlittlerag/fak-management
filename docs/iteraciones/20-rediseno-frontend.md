# Iteración 20 — Rediseño de frontend (ai-zome & shiaijo)

Reescritura visual completa del frontend con una identidad propia para la
Federación Argentina de Kendo, sin cambiar contratos funcionales (rutas,
estados y textos asertados por los tests E2E se preservan).

## Identidad

- **Marca:** wordmark corto **Kendo Argentina** (sidebar, login, admin-login,
  títulos); nombre completo **Federación Argentina de Kendo** en pie/pantallas
  formales y cuerpo/pie de emails. Se elimina toda referencia a "FAK" y a
  "Kendo Manager" en la UI y en las docs vivas.
- **Monograma:** ensō + línea de shinai + punto hinomaru, en índigo, sin letras
  (`frontend/public/favicon.svg`, `components/ui/Wordmark.tsx`).
- **Paleta (ai-zome):** índigo (`--color-ai #2b4a79`, `--color-ai-strong`,
  `--color-ai-soft`), papel (`--color-paper #f4f6f9`), superficie
  (`--color-surface`), carmesí hinomaru (`--color-hinomaru #b23a2e`) para
  acciones destructivas/activo, éxito, alerta y bambú/steel para neutros.
- **Tipografía:** Zen Old Mincho (display, títulos) + Zen Kaku Gothic New
  (texto) vía Google Fonts CDN con `display=swap` y preconnect.
- **Tema:** solo claro. Tokens en `frontend/src/index.css` (`@theme`).

## Fases

- **Fase 0 — base:** `index.html` (lang/título/metadata/fuentes),
  `favicon.svg`, tokens en `index.css`, primitivas en
  `components/ui/` (`Button`, `Badge`, `Panel`, `Field`/`Input`/`Select`/
  `Textarea`, `PageHeader`, `Alert`, `EmptyState`, `Table`, `Wordmark`) y
  restyle de `Modal`, `ConfirmModal`, `Spinner`, `Pagination`, `FileUpload`.
- **Fase 1 — identidad:** `AuthLayout` y `StatusPage` + reescritura de
  `Login`, `AdminLogin`, `Register`, `ResetPassword`, `_404` y las tres
  pantallas de resultado de pago.
- **Fase 2 — shell y público:** `Dashboard` (sidebar índigo, ítem activo con
  regla carmesí, cabecera serif) y `Eventos` / `EventoDetalle`.
- **Fase 3 — rutas de registro:** migración de tokens de todas las pantallas
  restantes (usuarios, asociaciones, eventos admin, inscripciones, diplomas y
  certificados, mesas, auditoría, bajas/afiliaciones, perfil, config y 2FA).

## Compatibilidad E2E

- Se preservan IDs (`#login-*`, `#admin-password`, `#reg-*`,
  `#inscripciones-busqueda`) y textos asertados.
- El componente `Alert` usa `role="alert"`; los dos locators que dependían de
  `.bg-red-50` se migraron a `getByRole('alert')`.

## Correcciones asociadas

- `src/auth/auth.controller.ts`: el throttle de auth ahora lee
  `THROTTLE_LIMIT`/`THROTTLE_TTL`, lo que permite a la suite E2E correr sin
  falsos 429 (pasa de 11/16 a 16/16).

## Verificación

- `pnpm --dir frontend run build` y `run lint`: verdes.
- Backend: `pnpm run build`, `eslint`, `pnpm run test:e2e` (250/250).
- Navegador: `frontend/e2e` con Playwright, 16/16 en Chromium.
