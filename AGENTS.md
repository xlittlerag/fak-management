# Kendo Manager — Agent Onboarding

## Repository
- `kendo-manager/` — Monorepo for the FAK (Federación Argentina de Kendo) membership platform

## Commands
```bash
pnpm install                  # install deps
pnpm run start:dev            # NestJS dev server
pnpm run build                # compile TypeScript
pnpm run test:e2e             # Jest E2E tests with supertest
pg_ctl -D .db -l .db/log start  # local Postgres (if not using env DB)
```

## Architecture
- **Backend:** NestJS (v11+) + Prisma 7.8 + PostgreSQL
- **Frontend:** Preact + Vite + Tailwind v4 (directory exists, not yet implemented in this repo)
- **Auth:** JWT with DNI-based login; bcrypt passwords
- **API:** All routes prefixed with `/api` (set in `main.ts`)

## Key Conventions
- **Global guards:** `JwtAuthGuard` (skips non-@Public routes) and `RolesGuard` (currently a no-op fallback)
- **Password masking:** Prisma `omit: { usuario: { password: true } }` — never log or expose passwords
- **Language:** All error/UX strings in formal Argentine Spanish (usted)
- **Asociación ID 0:** The federation itself; excluded from views per `docs/core-global.md`

## Testing
- E2E tests live in `test/` and use `supertest` + `createTestApp()` bootstrap
- Tests are organized by module (e.g. `pagos.e2e-spec.ts`, `auth.e2e-spec.ts`) — not by sprint
- Each test owns its DB state via `beforeEach(cleanupDb)`; `cleanupDb()` removes tables in reverse FK order
- Mock external APIs with `jest.spyOn` in `beforeAll` only when needed (e.g. Mercado Pago SDK)
- Run single tests: `pnpm test:e2e -- test/<file>.e2e-spec.ts`

## Setup
1. `pnpm install` in the repo root
2. Copy `.env.example` → `.env` and set `DATABASE_URL` (or rely on `pg_ctl`)
3. Run migrations (`npx prisma migrate dev`) before starting
4. Start backend (`pnpm start:dev`) and frontend (`cd frontend && pnpm dev`)

## Completed Iterations
- **Iteración 1** — API base, auth (JWT/DNI), CRUD asociaciones/dojos/usuarios
- **Iteración 2** — Frontend Preact + Tailwind, dashboard, perfil, registro
- **Iteración 3** — Pago cuota federativa (MercadoPago), admin de cuota
- **Iteración 4** — Eventos e inscripciones (torneo/examen/seminario), visibilidad, permisos
- **Iteración 5** — Diplomas nacionales, certificaciones externas, reimpresión — see `docs/iteraciones/05-diplomas-certificaciones.md`

## Pending / Next
- Auditoría module (automatic change logging) — planned
- RolesGuard proper RBAC logic — planned
- `.env.example` and `podman-compose.yml` — missing
- Schema changes use `npx prisma db push` (no migration files)
