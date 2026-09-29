# Iteración 14 — E2E de Navegador con Playwright (reemplaza QA manual)

## Objetivo
Automatizar el QA de los flujos críticos de usuario en un navegador real (Chromium), reemplazando el QA manual. La suite existente de `test/*.e2e-spec.ts` (supertest) solo cubre la API; esta capa verifica renderizado, navegación, roles y pagos simulados de punta a punta.

## Cómo correr
```bash
pnpm --dir frontend e2e          # headless, autosuficiente (levanta backend+frontend, siembra BD)
pnpm --dir frontend e2e:ui       # modo interactivo (ver y re-correr flujos)
pnpm --dir frontend e2e:headed   # navegador visible, paso a paso
pnpm --dir frontend e2e:report   # ver reporte del último run
```
No requiere preparación manual: `global-setup` hace `prisma db push` + seed, y `webServer` levanta ambos servidores.

## Cambios

### Suite nueva (`frontend/`)
- **`playwright.config.ts`**: proyecto único `chromium`; `workers: 1` (SQLite); screenshot/video/trace solo en fallo; `webServer` con backend (`DATABASE_URL=file:./e2e-test.db`, `MERCADO_PAGO_SIMULATED=true`, `THROTTLE_LIMIT=1000`) y Vite en `:5173`. Detección automática de Chromium del sistema (`PLAYWRIGHT_CHROMIUM_PATH` o rutas Nix) con fallback al empaquetado (CI usa `--with-deps`).
- **`e2e/global-setup.ts`**: ejecuta `scripts/e2e-seed.ts` y espera al backend.
- **`e2e/helpers/`**: `env.ts` (constantes y DNI únicos), `api.ts` (contextos API con cookie httpOnly: `adminApi`, `userApi`, `registerUser`, `approveUser`, `createPublishedSeminario`, `pagarCuota`, `inscribir`), `auth-ui.ts` (`loginAs`, `adminLoginAs`).
- **`e2e/flows/`** — 16 tests:
  - `01-smoke-public` (5): lista/detalle público de eventos, login inválido, 404.
  - `02-auth-register` (3): registro por UI → aviso de aprobación, login de aprobado, pendiente bloqueado.
  - `03-roles-dashboard` (5): redirecciones y menús de `ADMIN_GENERAL`/`ADMIN_ASOCIACION`/`BASICO`/`DESAFILIADO`, logout.
  - `04-eventos-inscripciones` (2): publicación → inscripción → aprobación por UI → estado "Aprobado" visible; filtro por DNI.
  - `05-pagos-cuota` (1): pago simulado por UI → `/pagos/exito` → "Al día".
- **`scripts/e2e-seed.ts`** (raíz, usa deps del backend): base aislada `e2e-test.db` (nunca toca `dev.db`): admin (`00000000`/`Admin123!`), asociación+dojo E2E, usuarios basico/asociación/desafiliado, cuota global $15000.
- **CI (`.github/workflows/ci.yml`)**: job `browser-e2e` (instala Chromium con deps, corre `pnpm --dir frontend e2e`).

### Bugs encontrados por la suite (corregidos)
1. **Búsqueda por DNI insensible a mayúsculas rota** (`InscripcionesAdmin.tsx`, `CertificadosPendientesAdmin.tsx`): la query se minusculiza pero `dni.includes(query)` no — buscar un DNI con letras nunca matcheaba. Fix: `dni.toLowerCase().includes(query)`. Los DNI reales (solo dígitos) ocultaban el bug.
2. **Carrera en el registro** (`Register.tsx`): `handleChange` usaba `setFormData({ ...formData, ... })` con cierre desactualizado y perdía campos ante input rápido (el DNI llegaba vacío al backend). Fix: actualización funcional.
3. **Rate limit vs E2E** (`src/app.module.ts`): el `ThrottlerGuard` global (30 req/min por IP) devolvía 429 a `/auth/session` en mitad de la suite y deslogueaba al usuario. Límites ahora configurables (`THROTTLE_LIMIT`/`THROTTLE_TTL`, documentados en `.env.example`); defaults de producción intactos.

## Notas
- Patrón de los specs: siembra por API con datos únicos → acción/aseveración por UI → confirmación de estado. `workers: 1` y DNIs únicos aíslan los tests entre sí.
- Usuarios frescos necesitan cuota al día para inscribirse: helper `pagarCuota()` (checkout + `POST /api/pagos/simulate`).
- Estado verificado: 16/16 en Chromium headless (3 corridas consecutivas), build backend+frontend OK, suite API existente 226/226 OK.
