# Iteración 26 — Performance del build

## Contexto

El build de la imagen de producción en frío (`--no-cache`) tardaba **3m26s** y
el ciclo local de verificación (build + typecheck + lint) sumaba ~40s, de los
cuales la mayor parte era trabajo redundante: dos instalaciones de dependencias,
un typecheck completo dentro del build y ESLint con type-checking.

El objetivo fue reducir el tiempo del build en frío (Docker/CI) y, de paso,
acelerar los chequeos locales, sin cambiar el comportamiento en runtime.

## Diagnóstico

Mediciones sobre el `Containerfile` anterior (`--no-cache`, imagen 752 MB):

| Etapa / comando                      | Tiempo  | Observación                                            |
| ------------------------------------ | ------: | ------------------------------------------------------ |
| `apt-get install … && apt-get upgrade` | ~45 s | El `upgrade` reinstalaba paquetes ya parcheados        |
| `pnpm install` (dev)                 | 33.2 s  | Incluía ~300 paquetes de ESLint                        |
| `pnpm install --prod` (closure)      | 16.3 s  | Segunda instalación completa                           |
| `nest build` (tsc)                   |  8–11 s | Compilaba tipos además de emitir                       |
| `tsc -b` + `vite build` (frontend)   | 7–10 s  | `tsc -b` nunca cacheaba (`noEmit` + `-b`)              |
| ESLint (backend)                     |    16 s | Type-aware sobre todo el proyecto                      |
| ESLint (frontend)                    |   8.9 s | —                                                      |

Además, el cache de **metadata** de pnpm (`~/.cache/pnpm`, ~356 MB) se escribía
dentro de la capa de la imagen: engordaba la capa del install y el tamaño final.
El store sí estaba en el cache mount (`/pnpm/store`), pero la metadata no.

## Cambios

### Backend

- **SWC** para emitir (`nest-cli.json`: `"builder": "swc"`, `"typeCheck": false`).
  Nest ya configura decoradores y `decoratorMetadata`; no hace falta `.swcrc`.
  El typecheck se corre aparte.
- **TypeScript 7 nativo** para typecheck: `typescript-native` (alias de
  `typescript@7`) invocado por path (`node ./node_modules/typescript-native/bin/tsc`).
  `typescript@6` queda para ts-jest y el editor.
- `pnpm run build` ya no tipa; `pnpm run typecheck` es el gate de tipos.

### Frontend

- `build` = `vite build` (se eliminó `tsc -b`, que nunca aprovechaba el cache).
- `typecheck` = TS 7 nativo sobre `tsconfig.app.json` y `tsconfig.node.json`.
- Lint con Oxlint (reglas de sintaxis, React y accesibilidad), sin type-aware
  para mantener la paridad con la configuración anterior y no romper CI.

### Lint: ESLint → Oxlint

- `oxlint` 1.89 + `oxlint-tsgolint` (type-aware en backend).
- Se removieron ESLint y todos sus plugins/configs (root y frontend).
- Paridad verificada: 0 errores; 403 warnings preexistentes de
  `no-unsafe-argument` en tests + nuevas reglas de Oxlint (warnings, no bloquean).
- `format:check` (Prettier) pasa a ser un paso explícito de CI, porque el
  `eslint-plugin-prettier` ya no existe.
- Se corrigieron 2 errores reales (`no-misused-spread` en `dojos.controller.ts` y
  `eventos.service.ts`) y se agregaron `key` en 6 listas del frontend.

### Docker

- **Node 26** (`node:26-slim`) con **digest pineado**: el tag `slim` cambia y
  invalidaba todas las capas en cada push. Node 26 ya no trae `corepack`, así que
  pnpm se instala con `npm install -g pnpm@11.11.0` (npm se elimina en runtime).
- Se eliminó `apt-get upgrade` (el digest ya trae parches; Trivy es la compuerta).
- **Una sola instalación** (dev + prod) compartida por los builds.
- Builds de frontend y backend **en paralelo** (etapas hermanas).
- Closure de producción en una etapa propia con `pnpm install --prod`
  (hardlinks/copias desde el store ya poblado).
- La etapa final **hereda** de la etapa de producción: se evitó copiar 400 MB de
  `node_modules` a una capa nueva (~35 s).
- Cache mounts para el **store** (`/pnpm/store`) y la **metadata**
  (`/root/.cache/pnpm`): ninguno de los dos queda en la imagen.
- Se quitaron las herramientas de compilación (`python3 make g++`): todas las
  dependencias nativas (better-sqlite3, argon2, esbuild, swc) traen prebuilds
  para Node 26. Si alguna dejara de traerlos, hay que reinstalar la toolchain.

#### `pnpm deploy` (evaluado y descartado)

Se probó `pnpm --filter kendo-manager deploy --prod --legacy /out`, como estaba
previsto. En Docker la etapa medía **~50 s** contra **~14–19 s** de
`pnpm install --prod`, porque `deploy` copia el árbol completo (no puede
hardlinkear desde el cache mount, que está en otro filesystem) y además
re-resuelve el lockfile. Con `inject-workspace-packages` (deploy no legacy) el
tiempo local fue equivalente. Por eso se usa `install --prod`.

## Resultados

| Métrica                            | Antes    | Después      |
| ---------------------------------- | -------- | ------------ |
| Build de imagen frío (`--no-cache`) | 3m26s   | **1m52s** (caches de pnpm vacíos) / **1m36s** (caches tibios) |
| `pnpm install` (dev)               | 33.2 s   | 21 s         |
| Closure de producción              | 16.3 s   | 14–19 s      |
| Backend build (emit)               | 8–11 s   | **~0.25 s** (SWC) + ~1.3 s de CLI |
| Backend typecheck                  | (en build) | **1.9 s** (TS 7) |
| Frontend build                     | 7–10 s   | **~0.6 s** (Vite) |
| Frontend typecheck                 | 7–10 s   | **~1.3 s** (TS 7) |
| Lint backend                       | 16 s     | **~1.1 s**   |
| Lint frontend                      | 8.9 s    | **~0.6 s**   |
| Imagen final                       | 752 MB   | 792 MB       |

La imagen crece ~40 MB: la base Node 26 es más grande y la etapa de tooling
(pnpm/npm) queda en una capa previa aunque se borre en runtime. El foco de esta
iteración fue el tiempo, no el tamaño.

## Validación

- `pnpm run lint` y `pnpm --filter frontend run lint`: 0 errores.
- `pnpm run typecheck` y `pnpm --filter frontend run typecheck`: OK.
- `pnpm run format:check`: OK.
- `pnpm run build` + `pnpm --filter frontend run build`: OK.
- Suite E2E completa: **251/251 tests** (17 suites).
- Smoke test de la imagen: `prisma db push`, creación del admin general,
  arranque de Nest y `GET /api/eventos` → 200.

## Notas

- **Prisma 7.10.1 avisa que Node 26 no está en su matriz soportada**
  (`20.19+, 22.12+, 24.0+`). Funciona correctamente (suite E2E + imagen), pero
  conviene revisar el aviso al actualizar Prisma.
- Para bumpear la base: `docker pull docker.io/library/node:26-slim` y actualizar
  el digest del `FROM` (el tag `slim` se mueve).
- Si una dependencia nativa deja de publicar prebuilds para Node 26, re-agregar
  `python3 make g++` en la etapa de tooling.
- Los cache mounts (`/pnpm/store`, `/root/.cache/pnpm`) no se exportan al cache
  de CI: en un runner limpio se descargan igual. Sí aceleran builds repetidos
  locales y evitan que la metadata quede en la imagen.

## Archivos

- `Containerfile`, `.dockerignore`
- `nest-cli.json`
- `package.json`, `frontend/package.json`, `pnpm-workspace.yaml`
- `.oxlintrc.json`, `frontend/.oxlintrc.json` (nuevos)
- `eslint.config.mjs`, `frontend/eslint.config.js` (eliminados)
- `.github/workflows/ci.yml`
- `.opencode/plugins/lint-on-edit.ts`
- `src/dojos/dojos.controller.ts`, `src/eventos/eventos.service.ts`
- `frontend/src/routes/EventosDashboard.tsx`, `frontend/src/routes/EventoDetalle.tsx`
