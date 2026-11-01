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

El job `imagen` venía fallando en ~1 segundo con `buildx failed with: Learn
more at https://docs.docker.com/go/build-cache-backends/`. Esa URL la emite
buildx en `notSupported(driver.CacheExport, ...)`: el builder por defecto
(`docker` driver) **no soporta exportar cache**, y el workflow no ejecutaba
`docker/setup-buildx-action`. La causa se introdujo en la iteración 24, al
agregar `cache-to: type=gha`; el `Containerfile` nunca fue el problema (un
`docker build --no-cache` local termina con éxito).

Se agregó el paso `docker/setup-buildx-action` (pineado por SHA), que crea un
builder `docker-container` con soporte de export, y se dejó
`cache-to: type=gha,mode=max,ignore-error=true`:

- `mode=max` conserva la intención de la iteración 24: cachear todas las etapas
  (apt, `pnpm install` y builds).
- `ignore-error=true` evita que un fallo del cache (evicción, límite de
  tamaño) bloquee la publicación de la imagen.

## Corrección del scan de Trivy

Con el job `imagen` arreglado, el `scan` pasó a ejecutarse y falló con 5 HIGH.
Reproducido localmente con Trivy 0.76.1 contra la imagen publicada, todos los
hallazgos estaban en `usr/local/lib/node_modules/pnpm`:

| Paquete  | Instalado | Corregido                | CVE             |
| -------- | --------- | ------------------------ | --------------- |
| `tar`    | 7.5.19    | 7.5.21                   | CVE-2026-73566  |
| `undici` | 6.27.0    | 6.29.1 / 7.30.1 / 8.12.2 | CVE-2026-109383 |
| `undici` | 6.27.0    | 6.28.1 / 7.29.1 / 8.10.2 | CVE-2026-19534  |
| `undici` | 6.27.0    | 6.29.1 / 7.30.1 / 8.12.2 | CVE-2026-87018  |
| `undici` | 6.27.0    | 6.29.1 / 7.30.1 / 8.12.2 | CVE-2026-109869 |

Son dependencias **internas de pnpm**, no del proyecto: los `overrides` del
workspace no las alcanzan. El `Containerfile` creía limpiarlas con
`rm -rf /usr/local/lib/node_modules/npm /pnpm`, pero `npm install -g pnpm`
instala en `/usr/local/lib/node_modules/pnpm` (no en `PNPM_HOME=/pnpm`), así
que ~20 MB de pnpm sobrevivían en la imagen final junto con sus binarios
`pn`, `pnpx` y `pnx`. El fallo es preexistente (las CVE son posteriores al
release 1.2.0); solo quedó expuesto al actualizar la base de datos de Trivy.

Se amplió el `rm -rf` del runtime a `/usr/local/lib/node_modules/pnpm` y a esos
binarios. Verificado con un build local + Trivy 0.76.1
(`--severity HIGH,CRITICAL --ignore-unfixed`): 0 hallazgos en `debian 13.7` y
0 en `node-pkg`, con la imagen arrancando en producción sin errores.

## Archivos afectados

- `package.json`, `frontend/package.json`, `pnpm-lock.yaml`
- `pnpm-workspace.yaml` (override de `body-parser`)
- `.github/workflows/ci.yml` (cache del build de imagen)
- `Containerfile` (limpieza de pnpm en el runtime)
- `docs/iteraciones/29-actualizacion-dependencias.md`
- `AGENTS.md` (línea de iteración completada)
- `CHANGELOG.md` y versiones `1.2.1` en el commit de release
