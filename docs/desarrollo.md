# Guía de desarrollo — Kendo Manager

Setup para trabajar en el monorepo (backend NestJS + frontend Preact).

## Requisitos

- Node.js (LTS)
- pnpm

## Configuración del entorno

1. Instalar dependencias en la raíz:

   ```bash
   pnpm install
   ```

2. Crear el archivo `.env` a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

   Al menos reemplazar `JWT_SECRET` por un valor aleatorio, p.ej.
   `openssl rand -hex 64`. Para activar el 2FA del admin general, definir
   también `TOTP_ENCRYPTION_KEY` (p.ej. `openssl rand -hex 32`).

## Base de datos (SQLite)

SQLite no necesita servidor. Crear el esquema y cargar los registros iniciales:

```bash
npx prisma db push   # crea el archivo dev.db en la raíz con el esquema actual
pnpm run seed        # carga los datos de prueba (asociaciones, dojos, usuarios, eventos...)
```

- `npx prisma db push` crea `dev.db` automáticamente; `npx prisma generate` ya
  se ejecuta vía `postinstall` al instalar dependencias.
- `pnpm run seed` es idempotente: limpia y recrea los datos de prueba. Solo debe
  usarse en desarrollo/test.

### Usuarios de prueba (seed)

| Rol                             | Login                        | Password    |
| ------------------------------- | ---------------------------- | ----------- |
| Admin General                   | `POST /api/auth/admin-login` | `Admin123`  |
| Admin de Asociación (Yoshinkan) | `dni: 11111111`              | `Test1234!` |
| Usuario básico                  | `dni: 55555555`              | `Test1234!` |

Todos los usuarios del seed comparten la contraseña `Test1234!`.

## Backend

```bash
pnpm run start:dev
```

Se sirve en `http://localhost:3000` (API bajo `/api`).

## Frontend

```bash
cd frontend
pnpm run dev
```

Se sirve en `http://localhost:5173`. En modo desarrollo el frontend apunta a
`http://localhost:3000/api` (CORS habilitado en el backend solo para
`http://localhost:5173`; si usa otro puerto, agregue `CORS_ORIGIN` en `.env`).

## Pruebas

| Suite                         | Comando                    | Ubicación            |
| ----------------------------- | -------------------------- | -------------------- |
| Unit (backend)                | `pnpm test`                | `src/`               |
| E2E (backend, supertest)      | `pnpm test:e2e`            | `test/`              |
| E2E (navegador, Playwright)   | `cd frontend && pnpm e2e`  | `frontend/e2e/`      |
| Rendimiento (Core Web Vitals) | `cd frontend && pnpm perf` | `frontend/e2e/perf/` |

- Correr un test E2E puntual:
  `pnpm test:e2e -- test/<archivo>.e2e-spec.ts`.
- La suite de Playwright usa una base de datos aislada (`e2e-test.db`).

## Notas

- **Mercado Pago:** para probar pagos sin checkout real, setear
  `MERCADO_PAGO_SIMULATED=true` en `.env` antes de iniciar el backend (modo
  simulado, ver `iteraciones/10-modo-simulado-mercadopago.md`).
- **Cambios de esquema:** se aplican con `npx prisma db push` (no hay archivos
  de migración).
