# Iteración 15 — Hashing de Contraseñas con Argon2id

## Objetivo
Reemplazar `bcrypt` (costo 10) por `argon2id` (`@node-rs/argon2`) como único algoritmo de hashing de secretos. Corte limpio sin compatibilidad hacia atrás: el proyecto aún no está en producción, así que las BDs locales se regeneraron en lugar de migrar hashes.

## Cambios

### Nuevo `PasswordService` (`src/auth/password.service.ts`)
- Único punto de hashing: `hash()` / `verify()` sobre `@node-rs/argon2` (argon2id por defecto).
- Parámetros base OWASP exportados como `ARGON2_OPTIONS` (`memoryCost: 19456, timeCost: 2, parallelism: 1`) para reutilizar en scripts standalone.
- Registrado como provider de `AuthModule` y exportado para `UsuariosModule` (sin ciclo: `AuthModule` no depende de usuarios/pagos).

### Reemplazos en prod
- **`src/auth/auth.service.ts`**: registro, login, admin-login, `requestReset` / `completeReset` (password + `codigo_blanqueo`) vía `PasswordService`.
- **`src/usuarios/usuarios.service.ts`** (`updatePerfil`) vía `PasswordService`; `UsuariosModule` importa `AuthModule`.

### Soporte (mismo algoritmo en todos lados)
- **`prisma/seed.ts`**, **`scripts/e2e-seed.ts`**, **`test/test-utils.ts`**: hasheo directo con `@node-rs/argon2` + `ARGON2_OPTIONS`.
- **`docker-entrypoint.sh`**: el snippet `node -e` de creación del admin usa `require('@node-rs/argon2')`.

### Dependencias y build
- `package.json`: agregado `@node-rs/argon2@^2.2.1`; eliminados `bcrypt` y `@types/bcrypt` (cero referencias en el repo).
- `pnpm-workspace.yaml`: eliminada la entrada `bcrypt` de `allowBuilds` (`@node-rs/*` distribuye binarios prebuilt napi, no requiere toolchain).
- `Containerfile`: sin cambios (no hace falta `python3/make/g++`, a diferencia del paquete `argon2` clásico).
- Schema sin cambios: las columnas son `String` sin longitud fija y aceptan el formato `$argon2id$...`.

## Notas
- BDs locales regeneradas (`npx prisma db push` + `pnpm run seed` para `dev.db`; `scripts/e2e-seed.ts` para `e2e-test.db`); hashes verificados con prefijo `$argon2id$v=19$`.
- Latencia medida: hash ~7ms, verify ~8ms — sin riesgo de DoS en login.
- Estado verificado: build OK, suite E2E API 226/226 OK (auth+perfil 21/21 incluidos).
