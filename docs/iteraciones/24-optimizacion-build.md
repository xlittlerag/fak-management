# Iteración 24 — Optimización del build de imagen

## Contexto

El build de la imagen de producción tardaba demasiado y el resultado pesaba
**2.09 GB** (`kendo-manager:local`). Se buscó reducir tiempo de build, tamaño de
imagen y uso de caché en CI sin cambiar el comportamiento en runtime.

## Diagnóstico

Medición de capas con `podman history` sobre la imagen anterior:

| Capa                                  | Tamaño | Origen                                                  |
| ------------------------------------- | -----: | ------------------------------------------------------- |
| `COPY --from=build /app/node_modules` | 648 MB | `node_modules` de desarrollo (1.0 GB)                   |
| `RUN pnpm install --prod`             | 478 MB | **no podaba**: agregaba la closure de producción encima |
| `RUN chown -R kendo:kendo /app`       | 650 MB | duplicaba `node_modules` en una capa nueva              |

Es decir, ~1.8 GB eran el mismo `node_modules` triplicado. Además:

- `COPY . .` arrastraba `.opencode/node_modules` (**63 MB** de ~89 MB de contexto).
- `corepack enable` se ejecutaba en `base`, por lo que `corepack`/pnpm viajaban a
  la etapa final para luego ser borrados.
- El job `imagen` de CI no configuraba `cache-from`/`cache-to`.

## Cambios

- **Nueva etapa `tooling`**: instala `corepack`; solo la usan `build` y `prod-deps`.
  La etapa `base` (y por lo tanto el runtime) ya no incluye pnpm.
- **Nueva etapa `prod-deps`**: instala la closure de producción desde cero
  (`pnpm install --prod --frozen-lockfile`) con cache de store, sin heredar el
  `node_modules` de desarrollo. Ejecuta `prisma generate` explícito.
  - El `prepare` de husky es dev-only y rompía la instalación de producción, por
    eso se elimina del `package.json` copiado en esa etapa.
  - Los build scripts siguen restringidos por `allowBuilds` y son necesarios para
    `better-sqlite3`, `esbuild`, `@prisma/engines` y `prisma`.
- **Etapa final**:
  - Un único `COPY --from=prod-deps /app/node_modules` (sin poda posterior).
  - Se elimina solo `npm` (no hay corepack/pnpm que borrar).
  - `chown` únicamente de `/app/data` y `/app/uploads`; el resto queda de lectura
    para `kendo`, sin duplicar `node_modules`.
- **`.dockerignore`**: se excluyen `.opencode`, `.github`, `docs`, `frontend/e2e`,
  `flake.nix`, `flake.lock`, `opencode.json` y `*.log`.
- **CI**: `cache-from: type=gha` y `cache-to: type=gha,mode=max` en
  `docker/build-push-action` para reutilizar capas entre ejecuciones.

## Verificación

- Build local con `podman build`: **718 MB** (antes 2.09 GB, **−66 %**).
- Capas de runtime: `node_modules` de producción = 426 MB, una sola vez; sin
  capa de `chown` sobre todo `/app`.
- Smoke test del contenedor: `prisma db push` OK, admin general creado, Nest
  arranca, `GET /api` → 200 y `GET /api/eventos` → 200.
- `rclone`, `sqlite3` y `openssl` disponibles para `scripts/backup.sh` /
  `scripts/restore.sh`; `better-sqlite3` y `@prisma/client` cargan correctamente.
- `pnpm run build` OK.

## Tradeoffs

- No se migró a Alpine: `@node-rs/argon2`, `better-sqlite3` y las herramientas
  del SO (`rclone`, `sqlite3`) complican los binarios nativos.
- Se mantiene `apt-get upgrade -y` en `base` como barrera anti-CVE del scan de
  Trivy (ver iteración 23).
