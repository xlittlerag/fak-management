# Iteración 29 — Actualización de dependencias y release 1.2.1

**Estado:** implementado.

## Contexto

Antes del deploy al homeserver se actualizaron las dependencias dentro de los
rangos semánticos vigentes y se remediaron los CVEs que bloqueaban el
`preflight` del hook `pre-push`. No hay cambios funcionales ni de schema.

## Cambios

### Backend

| Paquete                    | Antes   | Después |
| -------------------------- | ------- | ------- |
| `@nestjs/common`           | 12.1.3  | 12.3.2  |
| `@nestjs/core`             | 12.1.3  | 12.3.2  |
| `@nestjs/platform-express` | 12.1.3  | 12.3.2  |
| `@nestjs/testing`          | 12.1.3  | 12.3.2  |
| `@nestjs/serve-static`     | 12.0.0  | 12.1.1  |
| `nodemailer`               | 10.1.2  | 10.3.1  |
| `multer`                   | 2.4.0   | 2.5.0   |
| `dotenv`                   | 18.0.8  | 18.0.9  |
| `@swc/core`                | 1.16.20 | 1.16.21 |
| `@swc/cli`                 | 0.8.1   | 0.8.2   |
| `@types/node`              | 26.6.5  | 26.6.6  |
| `oxlint`                   | 1.89.0  | 1.90.0  |

### Frontend

| Paquete  | Antes  | Después |
| -------- | ------ | ------- |
| `axios`  | 1.20.0 | 1.21.0  |
| `preact` | 11.0.1 | 11.1.0  |
| `vite`   | 8.3.4  | 8.3.5   |

### Overrides de seguridad

- `body-parser@2: 2.4.0` en `pnpm-workspace.yaml`. Express 5.3.0 depende de
  `body-parser ^2.3.0`; el lockfile resolvía 2.3.0, vulnerable a
  GHSA-27r3-jxmh-p828 (high, DoS con bytes finales tras un cuerpo comprimido).
  El override fuerza la versión parcheada sin cambiar Express.

### Dependencias que no se actualizaron

- **`better-sqlite3` 13.0.3:** `@prisma/adapter-better-sqlite3@7.10.1` declara
  `better-sqlite3: ^12.6.0`. Subir a 13 instalaría dos copias nativas y queda
  fuera del rango soportado por el adapter. Se mantiene 12.11.1.
- **`typescript` 7.0.2:** el typecheck ya usa TypeScript 7 vía el alias
  `typescript-native`. El `typescript@6` de la raíz se conserva a propósito para
  el peer opcional de Prisma y el editor; subirlo duplicaría TS7 y no aporta al
  runtime.
- **`prisma` 8.0.0-rc.29:** es un release candidate, no una versión estable.

## Validación

| Chequeo                             | Resultado                   |
| ----------------------------------- | --------------------------- |
| `pnpm audit --prod`                 | 0 vulnerabilidades          |
| `pnpm run lint`                     | OK (warnings preexistentes) |
| `pnpm run typecheck`                | OK                          |
| `pnpm run typecheck:test`           | OK                          |
| `pnpm --filter frontend typecheck`  | OK                          |
| `pnpm test`                         | 23/23                       |
| `pnpm run test:e2e`                 | 251/251                     |
| E2E de navegador (Playwright)       | 31 passed, 3 skipped        |
| `pnpm run build` + build frontend   | OK                          |
| Imagen Docker + arranque producción | OK                          |
| `dist` frontend (`vendor`)          | 81,03 kB / 30,70 kB gzip    |
| Imagen final                        | 774,7 MB                    |

El E2E de navegador se corrió con Chromium del sistema
(`PLAYWRIGHT_CHROMIUM_PATH`), porque el entorno NixOS no ejecuta el binario
empaquetado por Playwright.

## Corrección del CI de imagen

El job `imagen` venía fallando con `buildx failed with: Learn more at
https://docs.docker.com/go/build-cache-backends/`. El mensaje corresponde a un
error del backend de cache de GHA, no al build: el mismo `Containerfile`
compila sin problemas con `docker build --no-cache` local, y la compilación de
las etapas previas del job también pasa.

Se cambió `cache-to` de `type=gha,mode=max` (introducido en la iteración 24) a
`type=gha,mode=min,ignore-error=true`:

- `mode=min` exporta solo las capas de la imagen final, en lugar del cache de
  todas las etapas.
- `ignore-error=true` evita que un fallo del cache (evicción, límite de
  tamaño) bloquee la publicación de la imagen.

## Archivos afectados

- `package.json`, `frontend/package.json`, `pnpm-lock.yaml`
- `pnpm-workspace.yaml` (override de `body-parser`)
- `.github/workflows/ci.yml` (cache del build de imagen)
- `docs/iteraciones/29-actualizacion-dependencias.md`
- `AGENTS.md` (línea de iteración completada)
- `CHANGELOG.md` y versiones `1.2.1` en el commit de release
