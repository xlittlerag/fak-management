# Kendo Argentina — Agent Onboarding

## Repository

- `kendo-manager/` — Monorepo for the Federación Argentina de Kendo membership platform

## Commands

```bash
pnpm install                  # install deps
pnpm run start:dev            # NestJS dev server
pnpm run build                # compile TypeScript
pnpm run test:e2e             # Jest E2E tests with supertest
pnpm run seed                 # seed database with test data
```

## Automatización (opencode)

- Al editar, opencode aplica `prettier` (formatter nativo, `.prettierrc`) y corre `eslint --fix` por workspace vía `.opencode/plugins/lint-on-edit.ts`; los problemas no corregibles se reportan en el log.
- Gates reales: Husky `pre-commit` (`lint-staged`) y el job `lint` de CI (eslint sin `--fix` + `tsc -b` del frontend). Los comandos de esta sección siguen siendo la fuente de verdad.

## Architecture

- **Backend:** NestJS (v11+) + Prisma 7.8 + SQLite
- **Frontend:** Preact + Vite + Tailwind v4 (fully implemented — see frontend/ directory)
- **Auth:** JWT with DNI-based login; argon2id passwords (`PasswordService`)
- **API:** All routes prefixed with `/api` (set in `main.ts`)

## Key Conventions

- **Global guards:** `JwtAuthGuard` (skips non-@Public routes) and `RolesGuard` (reads `@Roles()` metadata, gates by `user.rol`)
- **Global logging:** `LoggingInterceptor` logs every HTTP request/response with correlation ID (UUID), method, URL, query, headers, body, status, duration. Arrays >20 items truncated. 5xx → error, 4xx → warn, success → info. `X-Correlation-Id` header on responses.
- **Logger:** Pino via `nestjs-pino` — replaces NestJS default Logger. JSON output in prod, `pino-pretty` in dev. Level from `LOG_LEVEL` env var (default `info`).
- **Password masking:** Prisma `omit: { usuario: { password: true } }` — never log or expose passwords
- **Language:** All error/UX strings in formal Argentine Spanish (usted)
- **Asociación ID 0:** The federation itself; excluded from views per `docs/core-global.md`
- **File uploads:** No standalone upload endpoint. Files are uploaded inline as multipart in the record's creation/update endpoint. `FilesService` is an injectable infrastructure service used internally. `FileInterceptor` with `limits: { fileSize: 10MB }` on every endpoint that accepts files.

## Testing

- E2E tests live in `test/` and use `supertest` + `createTestApp()` bootstrap
- Tests are organized by module (e.g. `pagos.e2e-spec.ts`, `auth.e2e-spec.ts`) — not by sprint
- Each test owns its DB state via `beforeEach(cleanupDb)`; `cleanupDb()` removes tables in reverse FK order
- Mock external APIs with `jest.spyOn` in `beforeAll` only when needed (e.g. Mercado Pago SDK)
- Run single tests: `pnpm test:e2e -- test/<file>.e2e-spec.ts`

## Setup

1. `pnpm install` in the repo root
2. Copy `.env.example` → `.env` (default `DATABASE_URL=file:./dev.db`)
3. Run `npx prisma db push` to create the database schema
4. Start backend (`pnpm start:dev`) and frontend (`cd frontend && pnpm dev`)

## Workflow

- **Commits:** `tipo(área): descripción` in Spanish, lowercase (`feat`, `fix`, `docs`, `chore`, `ci`); one commit per task; never commit secrets (`.env`, `deploy.env` are gitignored)
- **Docs:** each iteration gets `docs/iteraciones/NN-nombre.md` + one line in Completed Iterations below
- **Releases:** bump `package.json` + `frontend/package.json` in sync, add `CHANGELOG.md` entry (`chore(release)` commit), then `git tag vX.Y.Z && git push origin vX.Y.Z` — CI publishes `ghcr.io` image tags (`latest`, `sha-*`, `vX.Y.Z`) and runs the Trivy scan; see `docs/iteraciones/18-cicd-empaquetado.md`

## Completed Iterations

- **Iteración 1** — API base, auth (JWT/DNI), CRUD asociaciones/dojos/usuarios
- **Iteración 2** — Frontend Preact + Tailwind, dashboard, perfil, registro
- **Iteración 3** — Pago cuota federativa (MercadoPago), admin de cuota
- **Iteración 4** — Eventos e inscripciones (torneo/examen/seminario), visibilidad, permisos
- **Iteración 5** — Diplomas nacionales, certificaciones externas, reimpresión — see `docs/iteraciones/05-diplomas-certificaciones.md`
- **Iteración 6** — Módulo de Auditoría (logging automático de cambios) — see `docs/iteraciones/06-auditoria.md`
- **Iteración 7** — Mejoras de eliminación de eventos: validación de inscripciones aprobadas (bloquean borrado), transacción para limpiar pendientes, botón "Eliminar permanentemente" dentro del formulario de edición, separación próximos/pasados en frontend — see `docs/iteraciones/07-eliminar-eventos.md`
- **Iteración 8** — Sistema de notificaciones por email (nodemailer + SMTP): bienvenida, reseteo de contraseña, estado de inscripciones y certificaciones — see `docs/iteraciones/08-notificaciones.md`
- **UX Phases 1–5** — Refinamiento frontend: reemplazo de alert/confirm por ConfirmModal, Spinner en cargas, unificación de estilos (badges, cursor), Pagination + search en listas, extracción de EventoForm — commit `8152823`
- **Iteración 9** — Infraestructura y CI: Containerfile (multi-stage, usuario no-root, volumes), entrypoint con admin automático, GitHub Actions CI, scripts de backup/restore con rclone — see `docs/iteraciones/09-infraestructura-ci.md`
- **Iteración 10** — Modo simulado para Mercado Pago (test): saltea el checkout modal en entorno de test, `MERCADO_PAGO_SIMULATED=true`, endpoint `POST /api/pagos/simulate` que procesa pagos mock reusando la lógica del webhook — see `docs/iteraciones/10-modo-simulado-mercadopago.md`
- **Iteración 11** — Desafiliación y afiliación (transferencia de asociación): alta/baja de socios con aprobaciones y notificaciones a federación/asociaciones — see `docs/iteraciones/11-desafiliacion.md`
- **Iteración 12** — Mesas examinadoras: CRUD de mesas por examen, carga de resultados por instancia (práctico/kata/escrito) con asignación automática/manual de mesa, registro de pago por disciplina — see `docs/iteraciones/12-mesas-examinadoras.md`
- **Iteración 13** — Secuencialidad de resultados y graduación efectiva por diploma: instancias en orden (PRÁCTICO→KATA→ESCRITO), endpoint atómico `POST /admin/resultados/avance` con prefijo invariante editable, guard secuencial en `cargarResultado`; el registro de pago solo se habilita con todas las instancias aprobadas; la graduación se aplica al cargar el Diploma Nacional (gate: todas las instancias + pago), mesas ya no la efectivizan, ediciones bloqueadas post-diploma — see `docs/iteraciones/13-secuencialidad-resultados-graduacion-diploma.md`
- **Iteración 14** — E2E de navegador con Playwright (reemplaza QA manual): 16 tests Chromium en `frontend/e2e/` con BD aislada `e2e-test.db`, job `browser-e2e` en CI; fixes encontrados por la suite (búsqueda DNI case-insensitive, carrera en registro, throttle configurable) — see `docs/iteraciones/14-e2e-navegador.md`
- **Iteración 15** — Hashing de contraseñas con argon2id: `PasswordService` único punto de hashing (`@node-rs/argon2`, params OWASP), reemplazo total de bcrypt (prod, seeds, tests, entrypoint), corte limpio sin compatibilidad legacy — see `docs/iteraciones/15-hashing-argon2.md`
- **Iteración 16** — 2FA TOTP opt-in para el admin general: `TwoFactorService` (RFC 6238 sobre node:crypto, secreto cifrado AES-256-GCM con `TOTP_ENCRYPTION_KEY`), login en dos pasos con token pendiente, 10 códigos de respaldo de un uso, gestión en `/dashboard/seguridad`, reset por SQL documentado — see `docs/iteraciones/16-2fa-admin.md`
- **Iteración 17** — Endurecimiento de seguridad P0→P3 (un commit por ítem): reset con crypto + throttle + bloqueo por intentos, política 12–128 (admin 15), redacción en logs/auditoría, uploads por magic-bytes + attachment + disco, helmet/CSP, firma de webhook, idempotencia persistente, JWT/ADMIN_PASSWORD fail-closed, seed gateado, CI pineada, CORS fail-closed, backups cifrados — see `docs/iteraciones/17-endurecimiento.md`
- **Iteración 18** — CI/CD y empaquetado: job lint, imagen GHCR (`latest`, `sha-*`, `v*`), scan Trivy, artefactos Playwright, `compose.yml` con healthcheck, labels OCI, `deploy.env.example`, versión 1.0.0 + CHANGELOG — see `docs/iteraciones/18-cicd-empaquetado.md`
- **Iteración 19** — Correcciones de QA (planilla Test C Kendo): validación de fecha de nacimiento y teléfono, fecha de obtención en certificados, fix +1 día en fechas de evento, rango a nivel evento como requisito adicional; TC-01/02/05/08/09/10 documentados como comportamiento esperado — see `docs/iteraciones/19-correcciones-qa.md`
- **Iteración 20** — Rediseño de frontend (ai-zome & shiaijo): identidad "Kendo Argentina" (tokens `@theme`, tipografías Zen, monograma ensō+shinai+hinomaru), primitivas `components/ui/`, shells `AuthLayout`/`StatusPage`, shell de dashboard y migración de tokens de todas las rutas; reemplazo de "FAK"/"Kendo Manager" en UI y docs vivas — see `docs/iteraciones/20-rediseno-frontend.md`
- **Iteración 21** — Rendimiento: lazy loading de rutas (`app.tsx`, `Dashboard.tsx`), chunk `vendor`, `apiGet` con cache TTL+dedupe, `compression` gzip, `useMemo`/`useCallback` en `AuthContext`, fuentes Zen self-hosted (WOFF2 subset latin) y SDK de Mercado Pago on-demand, índices Prisma + `take` defensivo + PRAGMAs WAL, harness de Core Web Vitals (`PERF=1`, `frontend/perf-budget.json`) — see `docs/iteraciones/21-performance.md`

## Pending / Next

- Schema changes use `npx prisma db push` (no migration files)
