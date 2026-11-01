# Iteración 28 — Simplificación de dependencias y SWC

**Estado:** implementado (fases 1–3). Fase 5 (spike Vite + Preact + SWC) evaluada y descartada.

## Contexto

El backend usa hoy `@nestjs/cli` con el builder SWC, pero el CLI solo orquesta:
el emit real ya lo hace SWC. Alrededor quedaron dependencias que se pueden
eliminar o reemplazar sin cambiar comportamiento:

- `@nestjs/cli` + `@nestjs/schematics` (build/start/generate).
- El stack de Passport (`@nestjs/passport`, `passport`, `passport-jwt`,
  `@types/passport-jwt`), usado solo para extraer y validar el JWT.
- `tsx` en producción, que arrastra `esbuild` y su binario de plataforma.
- Un `typescript` duplicado en el frontend que no se usa.
- `autoprefixer`/`postcss` en el frontend, heredados de Tailwind v3.
- `@types/compression` declarado como dependencia de runtime.

Además, el seed del entrypoint (`SEED_DATABASE=true`) está roto en la imagen:
el runtime no copia `src/` y `prisma/seed.ts` importa
`../src/auth/password.service`.

## Objetivo

1. Reemplazar `nest build`/`nest start` por SWC CLI + Node.
2. Eliminar dependencias sin uso o reemplazables por APIs ya presentes.
3. Unificar la transformación de TypeScript del backend en SWC (build, dev,
   tests y scripts), sin agregar un build script propio.
4. Reducir el tamaño de la imagen y el tiempo de instalación/CI.
5. Dejar el seed del entrypoint funcionando o explícitamente fuera del runtime.

## Estado actual medido

| Métrica                   | Valor                                                                     |
| ------------------------- | ------------------------------------------------------------------------- |
| Instancias instaladas     | 727                                                                       |
| Closure de producción     | 365                                                                       |
| Solo desarrollo           | 468                                                                       |
| `@nestjs/cli` (closure)   | 331 instancias                                                            |
| `@nestjs/cli` exclusivas  | 300 instancias / 245 nombres no-platforma / ~39.4 MB                      |
| `tsx` en producción       | `tsx` 0.5 MB + `esbuild` 12 MB + `@esbuild/linux-x64` 11 MB ≈ **23.5 MB** |
| `typescript@6`            | 24 MB (en prod por peers opcionales de Prisma)                            |
| `typescript-native` (TS7) | 3.6 MB + binario Linux 27 MB ≈ **30 MB**                                  |
| Stack Passport            | 4 paquetes, ~1.8 MB                                                       |
| `qrcode`                  | 24 paquetes, ~1.5 MB                                                      |
| `@nestjs/serve-static`    | 5 paquetes, ~1.4 MB                                                       |
| `mercadopago`             | 0.5 MB, sin dependencias                                                  |

`pnpm why typescript --prod` confirma que TS6 entra en producción por
`@prisma/client`, `prisma` y `@prisma/dev`, no por Nest CLI.

## Hallazgo: el seed de producción ya está roto

Verificado con la imagen `fak-vitest:test`:

```text
$ docker run --rm -e SEED_DATABASE=true -e NODE_ENV=development ... fak-vitest:test
→ Cargando datos de prueba (SEED_DATABASE=true)...
Error: Cannot find module '../src/auth/password.service'
Require stack:
- /app/prisma/seed.ts
```

`/app/src` no existe en el runtime (`Containerfile` solo copia `dist`,
`prisma`, `frontend/dist`, `prisma.config.ts`, `scripts` y el entrypoint).
Por eso `tsx` en producción hoy no cumple ninguna función real.

## Decisiones

1. **SWC CLI reemplaza `nest build`.** El `.swcrc` replica los defaults del
   builder SWC de Nest. Se mantiene el typecheck separado con TS7 nativo.
2. **`@swc-node/register` reemplaza a `tsx` en dev** (`start:dev`, scripts que
   importan módulos Nest). Para los seeds se usa **Node 26 nativo** con
   extensiones `.ts` explícitas, sin transformer.
3. **Se mantiene `typescript@6`.** Es el peer opcional que Prisma resuelve en
   producción; si desaparece, pnpm instalaría TS7 nativo (~30 MB) en lugar de
   TS6 (24 MB). También lo requiere `@swc-node/register` (`<7`).
   Se elimina solo el `typescript` duplicado del frontend.
4. **Se elimina el stack de Passport.** El guard usa `JwtService.verifyAsync`;
   los E2E de auth cubren el comportamiento.
5. **No se agregan build scripts propios.** Se usan CLIs estándar
   (`swc`, `node --watch`, `@swc-node/register`).
6. **`@nestjs/serve-static`, `qrcode` y `mercadopago` quedan para una fase
   opcional.** Su ahorro es menor y su reemplazo tiene más riesgo.
7. **El seed se arregla con Node nativo**, extrayendo `ARGON2_OPTIONS` a un
   módulo sin decoradores y copiando ese archivo al runtime.
8. **El frontend no se migra a SWC en esta iteración.** Se evalúa
   `@vitejs/plugin-react-swc` como spike separado (Fase 5), pero no se adopta
   por defecto: es un plugin de React y su HMR es React Refresh, no Preact.

## Validación previa realizada

- Build SWC-only a `/tmp`: **107 archivos compilados + 13 HTML copiados, 0
  specs**, `dist/main.js` en la raíz y `.js` byte-idénticos a `nest build`
  (`diff -r -x '*.map'` = 0 líneas).
- `node -r @swc-node/register src/main.ts` levanta la app completa en Node
  26 (“Nest application successfully started”), con DI y `design:paramtypes`.
- `node --watch-path=src ...` reinicia al cambiar un `.ts`.
- `swc -w -D` copia los HTML al editarlos (equivalente a `watchAssets`).
- Los mecanismos del seed nativo se probaron por separado: Node 26 resuelve
  imports `.ts` explícitos y named imports de `@prisma/client` en ESM nativo.

## Implementación (fases 1–3)

### Fase 1 — Passport y manifiestos

- `JwtAuthGuard` ahora implementa `CanActivate` y valida con
  `JwtService.verifyAsync`; extrae el token de la cookie `access_token` o de
  `Authorization: Bearer`, rechaza tokens con `pendiente_2fa` con el mismo
  mensaje y asigna `req.user` con el mismo `AuthUser`.
- Se eliminaron `src/auth/jwt.strategy.ts`, `@nestjs/passport`, `passport`,
  `passport-jwt` y `@types/passport-jwt`; `AuthModule` ya no importa
  `PassportModule` ni declara `JwtStrategy`.
- `types/express.d.ts` declara `Request.user` (antes lo aportaba
  `@types/passport`).
- `@types/compression` pasó a `devDependencies`.
- Se quitaron del frontend `typescript`, `autoprefixer` y `postcss`.

### Fase 2 — SWC build

- `.swcrc` replica los defaults del builder SWC de Nest: `target es2021`,
  decoradores legacy, metadata, `keepClassNames` y CommonJS.
- `build` ejecuta
  `swc src -d dist --config-file .swcrc --delete-dir-on-start --copy-files --strip-leading-paths --ignore "**/*.spec.ts"`.
- Se eliminaron `nest-cli.json`, `@nestjs/cli` y `@nestjs/schematics`.
- `vitest.config.mts` usa `swc.vite({ swcrc: false })` porque `@swc/core`
  aplica automáticamente el `.swcrc` del build (CommonJS) y rompería la
  resolución ESM de Vitest.

### Fase 3 — Dev, scripts y seed sin `tsx`

- `start` compila y ejecuta `dist/main.js`; `start:dev` y `start:debug` usan
  `node --watch-path=src -r @swc-node/register`; `test:email` usa el mismo
  register.
- `ARGON2_OPTIONS` se movió a `src/auth/argon2-options.ts` (sin decoradores).
  `PasswordService`, `prisma/seed.ts`, `scripts/e2e-seed.ts` y
  `test/test-utils.ts` lo importan desde ahí.
- Los seeds se ejecutan con Node 26 nativo (`node prisma/seed.ts`) e importan
  `../src/auth/argon2-options.ts` con extensión explícita.
- `docker-entrypoint.sh` usa `node /app/prisma/seed.ts`; el `Containerfile`
  copia `src/auth/argon2-options.ts` al runtime.
- Se quitó `tsx` de `dependencies`; `esbuild` ya no está en la closure de
  producción.

### Resultados medidos

| Métrica                                             | Antes (plan)    | Después                        |
| --------------------------------------------------- | --------------- | ------------------------------ |
| `pnpm why esbuild --prod`                           | `tsx`           | vacío                          |
| `pnpm why tsx --prod`                               | `tsx`           | vacío                          |
| `pnpm why @swc-node/register --prod`                | —               | vacío (solo dev)               |
| `pnpm why typescript --prod`                        | TS6             | TS6 (sin cambios)              |
| `pnpm run build`                                    | `nest build`    | SWC CLI, ~1.5 s                |
| Archivos compilados / HTML copiados / specs en dist | 106 / 13 / 0    | 107 / 13 / 0                   |
| `dist` vs build anterior (sin mapas)                | —               | solo `argon2-options.js` nuevo |
| Tests unitarios / E2E                               | 23 / 251        | 23 / 251                       |
| `node_modules` en la imagen                         | 488 MB          | 464 MB                         |
| Entradas en `.pnpm` de la imagen                    | 393             | 374                            |
| Imagen final                                        | 797.5 MB        | 773.6 MB                       |
| `tsx`/`esbuild`/`passport`/`@nestjs/cli` en imagen  | 7 coincidencias | 0                              |

El seed se verificó en local y dentro de la imagen:

```text
→ Cargando datos de prueba (SEED_DATABASE=true)...
✅ Base de datos sembrada correctamente.
```

### Hallazgos

- **`.swcrc` y Vitest:** `@swc/core` lee `.swcrc` automáticamente aunque
  `unplugin-swc` reciba opciones explícitas. Sin `swcrc: false`, las specs se
  emiten como CommonJS y fallan al resolver imports `.ts` sin extensión.
- **Warning de Node nativo:** los seeds emiten
  `MODULE_TYPELESS_PACKAGE_JSON` porque el repo no declara `"type": "module"`.
  Es cosmético y no afecta la ejecución; agregar `"type": "module"` al
  `package.json` raíz rompería el runtime CommonJS de Nest.
- **Seed en imagen:** `SEED_DATABASE=true` exige `NODE_ENV != production`. Con
  `NODE_ENV=development` el seed funciona, pero el arranque posterior falla
  porque `pino-pretty` es dev-only. Es una limitación preexistente del runtime,
  ajena a este cambio; el arranque normal con `NODE_ENV=production` se verificó
  correctamente.

## Plan original (referencia)

Las fases siguientes son el plan aprobado. Las fases 1–3 ya están
implementadas según la sección anterior; se conservan como referencia.

### Fase 1 — Passport y limpieza de manifiestos

**Objetivo:** quitar dependencias sin tocar el pipeline de build.

Tareas:

1. Reescribir `src/auth/guards/jwt-auth.guard.ts`:
   - Mantener el chequeo de `@Public()` con `Reflector`.
   - Extraer el token de `req.cookies[AUTH_COOKIE_NAME]` o de
     `Authorization: Bearer`.
   - Validar con `JwtService.verifyAsync`.
   - Rechazar tokens con `pendiente_2fa` con el mismo mensaje actual.
   - Asignar `req.user` con el mismo `AuthUser` que devolvía `JwtStrategy`.
2. Borrar `src/auth/jwt.strategy.ts`.
3. En `src/auth/auth.module.ts`: quitar `PassportModule`, `JwtStrategy` y el
   import de `@nestjs/passport`. Mantener y exportar `JwtModule`.
4. Quitar de `package.json`:
   - `@nestjs/passport`
   - `passport`
   - `passport-jwt`
   - `@types/passport-jwt`
5. Mover `@types/compression` de `dependencies` a `devDependencies`.
6. En `frontend/package.json`, quitar:
   - `typescript` (el typecheck usa `typescript-native`)
   - `autoprefixer`
   - `postcss` (Vite ya depende de `postcss`)
7. Correr:
   - `pnpm test:e2e test/auth.e2e-spec.ts`
   - `pnpm test:e2e test/auth-2fa.e2e-spec.ts`
   - `pnpm --filter frontend run typecheck`
   - `pnpm --filter frontend run build`

**Criterio de aceptación:** auth y 2FA pasan sin cambios; el frontend tipa y
buildea; no queda ninguna referencia a `passport` en `src/`.

### Fase 2 — SWC build

**Objetivo:** eliminar `@nestjs/cli` y `nest-cli.json`.

Tareas:

1. Agregar `.swcrc` en la raíz:

   ```json
   {
     "$schema": "https://json.schemastore.org/swcrc",
     "sourceMaps": true,
     "module": { "type": "commonjs" },
     "jsc": {
       "target": "es2021",
       "parser": {
         "syntax": "typescript",
         "decorators": true,
         "dynamicImport": true
       },
       "transform": {
         "legacyDecorator": true,
         "decoratorMetadata": true,
         "useDefineForClassFields": false
       },
       "keepClassNames": true
     }
   }
   ```

2. Cambiar el script `build`:

   ```json
   "build": "swc src -d dist --config-file .swcrc --delete-dir-on-start --copy-files --strip-leading-paths --ignore \"**/*.spec.ts\""
   ```

3. Borrar `nest-cli.json`.
4. Quitar `@nestjs/cli` y `@nestjs/schematics` de `devDependencies`.
5. Mantener `typescript@6` y `@swc/cli`/`@swc/core`.
6. Verificar (guardar una copia del `dist` actual como `dist-anterior` antes
   del cambio):
   - `pnpm run build`
   - `diff -r -x '*.map' -x 'tsconfig.test.tsbuildinfo' dist dist-anterior`
   - 13 HTML en `dist/notificaciones/templates`
   - 0 `*.spec.js` en `dist`
   - `pnpm run typecheck`, `pnpm run typecheck:test`, `pnpm test`

**Criterio de aceptación:** `pnpm run build` produce el mismo árbol y los
mismos `.js`; `pnpm run preflight` pasa (salvo los hallazgos de audit
preexistentes).

### Fase 3 — Dev, scripts y seed sin `tsx`

**Objetivo:** unificar en SWC y sacar `tsx`/`esbuild`.

Tareas:

1. Agregar `@swc-node/register` a `devDependencies`.
2. Cambiar scripts:

   ```json
   "start": "pnpm build && node dist/main.js",
   "start:dev": "node --watch-path=src --watch-preserve-output -r @swc-node/register src/main.ts",
   "start:debug": "node --inspect --watch-path=src -r @swc-node/register src/main.ts",
   "test:email": "node -r @swc-node/register scripts/send-test-email.ts"
   ```

3. Extraer `ARGON2_OPTIONS` de `src/auth/password.service.ts` a
   `src/auth/argon2-options.ts` (sin decoradores).
4. `src/auth/password.service.ts` importa el constante desde el nuevo módulo.
5. `prisma/seed.ts` y `scripts/e2e-seed.ts` importan
   `../src/auth/argon2-options.ts` con extensión `.ts` explícita.
6. Cambiar los comandos de seed:
   - `package.json`: `"seed": "node prisma/seed.ts"`.
   - `package.json` (clave legacy `prisma.seed`, si se conserva):
     `node prisma/seed.ts`.
   - `prisma.config.ts`: `seed: 'node prisma/seed.ts'`.
   - `docker-entrypoint.sh`: `node prisma/seed.ts`.
7. `frontend/e2e/global-setup.ts`: reemplazar
   `pnpm exec tsx scripts/e2e-seed.ts` por `node scripts/e2e-seed.ts`.
8. En `Containerfile`:
   - Copiar `src/auth/argon2-options.ts` al runtime (o `src/` completo) para
     que el seed funcione.
   - Evaluar quitar `COPY scripts /app/scripts`: el runtime no lo referencia.
9. Quitar `tsx` de `dependencies`.
10. Verificar:
    - `pnpm why esbuild` (debería desaparecer o quedar solo en dev).
    - `pnpm run seed` contra una base temporal.
    - `SEED_DATABASE=true NODE_ENV=development` en la imagen.
    - `pnpm run test:e2e`.

**Criterio de aceptación:** no queda `tsx` en el manifiesto; `start:dev` levanta
la app y reinicia; el seed funciona en local y en la imagen; los E2E pasan.

### Fase 4 — Opcional (no bloqueante)

1. `qrcode` → `uqr`/`qrcode-generator` (zero-dep) o generar el QR en el
   frontend.
2. `@nestjs/serve-static` → `useStaticAssets` + fallback SPA en `main.ts`.
3. `mercadopago` → `fetch` REST (solo si se acepta reimplementar la firma del
   webhook).

### Fase 5 — Spike opcional: Vite + Preact + SWC

**Propuesta:** evaluar
[`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc)
como reemplazo de `@preact/preset-vite` para unificar el frontend en SWC.

**Estado:** no se adopta por defecto; queda como spike separado y no
bloqueante.

Motivos:

- El plugin es de **React**, no de Preact. `jsxImportSource: 'preact'` cambia
  el factory de JSX, pero el HMR que inyecta es **React Refresh**
  (`$RefreshReg$`/`$RefreshSig$`), no `@prefresh`. Preact usa
  `@prefresh/vite`; mezclarlos requiere alias y probablemente rompe el HMR.
  El soporte de Preact en `plugin-react-swc` no es oficial (upstream lo
  rechazó); existen [`@swc/plugin-prefresh`](https://www.npmjs.com/package/@swc/plugin-prefresh)
  y un fork, pero son experimentales.
- En Vite 8 el plugin usa SWC **solo en dev**; en build sigue usando Oxc
  salvo que se configuren `plugins`, `compiler` o
  `useAtYourOwnRisk_mutateSwcOptions`. No deja el build “SWC-only”.
- El frontend actual **ya usa Oxc** para JSX: `preact()` sin la opción `babel`
  configura `oxc.jsx`/`esbuild.jsx`; Babel solo se usa si se pasa `babel` o
  dentro de `@prefresh/vite` 2.x para el wrapper de HMR. La versión 4.x de
  `@prefresh/vite` ya usa Oxc y deja Babel como fallback selectivo, así que la
  ruta más limpia para sacar Babel del HMR es actualizar
  `@prefresh/vite`/`@preact/preset-vite` cuando haya una versión compatible,
  no adoptar React Refresh. El propio README del plugin recomienda
  `@vitejs/plugin-react` (Oxc) para la mayoría de los casos.
- El costo/beneficio no cierra: se agrega `@swc/core` + React Refresh al
  frontend, se desactiva Oxc en dev y se arriesga HMR, sin cambiar el build de
  producción.

Si se quiere probar igual, el spike debe ir en un branch aparte y validar:

1. Reemplazar `preact()` por `react({ jsxImportSource: 'preact' })` y agregar
   alias de `react`, `react-dom` y `react/jsx-runtime` a `preact/compat` y
   `preact/jsx-runtime`. Para HMR con SWC hace falta además
   `@swc/plugin-prefresh` + `jsc.transform.react.refresh`; sin eso el HMR es
   React Refresh y no funciona con Preact.
2. HMR de un componente (`frontend/src/routes/...`) sin recargar la página.
3. `pnpm --filter frontend run build` y verificar que el bundle no incluya
   React.
4. Sin errores de `$RefreshReg$`/preamble en consola.
5. Comparar tiempo de dev server y tamaño de bundle contra el baseline.

**Criterio de aceptación del spike:** solo se adopta si hay una mejora
medible en dev y se mantienen HMR/build sin regresiones. Si no, se documenta y
se descarta.

### Resultado del spike (Fase 5)

Se implementó el spike en un worktree/branch aparte
(`spike/vite-preact-swc`, eliminado al terminar) con:

- `@vitejs/plugin-react-swc` + `@swc/plugin-prefresh` en el frontend.
- `jsxImportSource: 'preact'`, alias de `react`/`react-dom`/`react/jsx-runtime`
  a `preact/compat` y `preact/jsx-runtime`.
- `jsc.transform.react.refresh` y `development` **solo en `serve`**; aplicarlos
  también al build duplicaba los chunks de ruta (p. ej. `EventosAdmin` pasaba
  de 23 kB a 48 kB por el `jsxDEV`).
- `@swc/plugin-prefresh` para el manejo de `createContext`.

Mediciones contra el baseline (`@preact/preset-vite`):

| Métrica                                   | Baseline (`@preact/preset-vite`)  | Spike (`@vitejs/plugin-react-swc`) |
| ----------------------------------------- | --------------------------------- | ---------------------------------- |
| Arranque del dev server (3 corridas)      | 746 / 707 / 769 ms                | 521 / 451 / 452 ms                 |
| Build de producción                       | ~0.5–0.6 s                        | ~0.6 s                             |
| Tamaño total de `dist`                    | 395.165 B                         | 395.810 B (+0,16 %)                |
| `vendor` (sin gzip / gzip)                | 73,38 kB / 28,05 kB               | 73,38 kB / 28,02 kB                |
| React / React Refresh en el build         | —                                 | ausente                            |
| `typecheck` del frontend                  | pasa                              | pasa                               |
| **HMR real (cambio de texto en `Login`)** | **actualiza el DOM sin recargar** | **no actualiza el DOM ni recarga** |

El HMR es el punto que invalida el spike: Vite registra el módulo y muestra
`[vite] hot updated`, pero la página no cambia y tampoco se recarga. React
Refresh necesita que un renderer se registre en
`__REACT_DEVTOOLS_GLOBAL_HOOK__` con `scheduleRefresh` y `setRefreshHandler`;
Preact no lo hace. `@swc/plugin-prefresh` solo transforma `createContext`, no
aporta el runtime de Prefresh. El resultado es un HMR roto en silencio, peor
que un fallback a recarga completa. Además, en dev se pierde la integración de
`preact/debug` que sí carga el preset actual.

**Decisión:** se descarta el spike y no se mergea. Se mantiene
`@preact/preset-vite`; la mejora de arranque (~40 %) no compensa un HMR roto ni
justifica dos toolchains. El branch y el worktree se eliminaron; `main` queda
sin cambios de frontend por este spike.

## Archivos afectados

- `package.json`, `pnpm-lock.yaml`, `frontend/package.json`
- `nest-cli.json` (eliminar), `.swcrc` (nuevo)
- `src/auth/jwt.strategy.ts` (eliminar)
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/auth.module.ts`
- `types/express.d.ts`
- `src/auth/password.service.ts`, `src/auth/argon2-options.ts` (nuevo)
- `prisma/seed.ts`, `prisma.config.ts`
- `scripts/e2e-seed.ts`
- `frontend/e2e/global-setup.ts`
- `vitest.config.mts`, `test/test-utils.ts`
- `frontend/vite.config.ts` (solo spike de la Fase 5)
- `docker-entrypoint.sh`, `Containerfile`
- `AGENTS.md` (toolchain y comandos)
- `docs/iteraciones/28-simplificacion-dependencias-y-swc.md`

## Validación

- `pnpm install --frozen-lockfile` y revisar el diff del lockfile.
- `pnpm run typecheck`, `pnpm run typecheck:test`, `pnpm run lint`.
- `pnpm test`, `pnpm run test:e2e`.
- `pnpm --filter frontend run typecheck`, `pnpm --filter frontend run build`.
- `pnpm run build` + diff de `dist`.
- `pnpm run preflight`.
- Docker: build, arranque, `SEED_DATABASE=true`, tamaño de imagen.
- `pnpm why typescript --prod` debe seguir mostrando TS6.
- `pnpm why esbuild` no debe mostrar `esbuild` en producción.

## Riesgos y mitigaciones

| Riesgo                                                      | Mitigación                                                                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `.swcrc` se desincroniza de `tsconfig.json`                 | Documentar que `target`, decoradores y metadata se replican; el build es el único consumidor.      |
| `node --watch-path=src` reinicia ante cambios de HTML/specs | Aceptable en dev; si molesta, apuntar el watcher a `src` y excluir templates.                      |
| `@swc-node/register` no soporta una versión futura de Node  | Probado en Node 26; si falla, volver a `tsx` o usar `concurrently` + `swc -w`.                     |
| Borrar TS6 hace entrar TS7 en prod                          | No borrar TS6; verificar `pnpm why typescript --prod` después de cada fase.                        |
| Seed nativo con imports `.ts`                               | Usar extensiones explícitas y copiar `src/auth/argon2-options.ts` al runtime; probar en la imagen. |
| `@swc/cli` imprime banner beta                              | Cosmético; no afecta el build.                                                                     |
| `nest generate` deja de estar disponible                    | No se usa; si se necesita, ejecutar `@nestjs/schematics` con `pnpm dlx`.                           |

## Rollback

Las fases son independientes y cada una puede ir en un commit:

- Fase 1: revertir el commit de Passport/manifiestos.
- Fase 2: restaurar `nest-cli.json` y los scripts de Nest.
- Fase 3: volver a `tsx` y a los comandos anteriores.

## Fuera de alcance

- Reemplazar `@nestjs/config`, `multer`, `reflect-metadata`, `pino`,
  `@nestjs/mapped-types`, `class-validator`/`class-transformer`,
  `nodemailer`, `better-sqlite3` o `@node-rs/argon2`.
- Migrar el frontend a SWC: se evalúa en la Fase 5 y no se adopta por defecto
  (Vite 8 usa Rolldown/Oxc; `@vitejs/plugin-react-swc` es de React y su HMR
  es React Refresh, no Preact).
- Cambiar el esquema de Prisma o el pipeline de migraciones.
- Reemplazar el SDK de Mercado Pago en esta iteración.
