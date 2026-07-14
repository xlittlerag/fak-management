# Kendo Manager — Agent Onboarding

## Repository
- `kendo-manager/` — Monorepo for the FAK (Federación Argentina de Kendo) membership platform

## Commands
```bash
pnpm install                  # install deps
pnpm run start:dev            # NestJS dev server
pnpm run build                # compile TypeScript
pnpm run test:e2e             # Jest E2E tests with supertest
pnpm run seed                 # seed database with test data
```

## Architecture
- **Backend:** NestJS (v11+) + Prisma 7.8 + SQLite
- **Frontend:** Preact + Vite + Tailwind v4 (fully implemented — see frontend/ directory)
- **Auth:** JWT with DNI-based login; bcrypt passwords
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

## Pending / Next
- Dashboard / Reportes — Estadísticas de miembros, eventos, ingresos; gráficos
- Carga de archivos — refinamiento UX en subida de archivos
- Schema changes use `npx prisma db push` (no migration files)
