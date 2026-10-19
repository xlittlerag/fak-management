# Iteración 23 — Remediación de CVEs del scan de imagen (release v1.1.1)

## Contexto

El release `v1.1.0` quedó sin publicar: el job `scan` de CI fallaba y, como el job
`release` depende de él, no se creó el GitHub Release. En un principio se atribuyó
a un desajuste de tag (`type=sha` corto vs. `github.sha` completo, corregido a
`format=long` en la iteración anterior); al reproducir el scan con `podman` +
`trivy` contra la imagen publicada se confirmó que la causa real eran
vulnerabilidades **HIGH/CRITICAL con fix disponible**.

## Diagnóstico

Reproducción local: `podman build` → `podman save` → `trivy image --input`
(mismos flags que CI: `--severity HIGH,CRITICAL --ignore-unfixed`). Los
hallazgos provenían de tres orígenes distintos:

1. **Deps de la app** (`/app/node_modules`, transitivas): `brace-expansion`,
   `fast-uri`, `js-yaml`, `proxy-addr`, `source-map-js`, `tar`, `undici`, `pnpm`.
2. **npm empaquetado en la imagen base** (`/usr/local/lib/node_modules/npm`) y
   **pnpm cacheado por corepack** (`/root/.cache/node/corepack/.../dist`): el
   `tar`/`undici`/`brace-expansion` internos de esas herramientas. Actualizar
   `npm@latest` incluso dejaba remanentes (p. ej. `undici@6.28.0`), porque las
   herramientas bundlean sus propias deps con versiones fijas.
3. **Paquetes del SO** (debian 12.15): `perl-base`, `libpcre2-8-0` con parches de
   `bookworm-security` no aplicados por la imagen base.

## Remediación

- **Lockfile (`pnpm-workspace.yaml`)**: `overrides` que fijan las transitivas de
  la app a sus versiones parcheadas (`brace-expansion@1/2/5`, `fast-uri@3`,
  `js-yaml@3`, `proxy-addr@2`, `source-map-js@1`, `tar@7`, `undici@6`). En pnpm
  11 los settings dejaron de leerse desde `package.json` (campo `pnpm`) y pasaron
  a `pnpm-workspace.yaml`, de donde pnpm ahora los toma.
- **`packageManager: pnpm@11.11.0`**: parchea la CVE del propio pnpm.
- **`Containerfile` (etapa base)**: `apt-get upgrade -y` para tomar los parches de
  seguridad del SO.
- **`Containerfile` (etapa final)**: el runtime pierde `npm`/`npx` y
  `corepack`/pnpm (no se usan para ejecutar la app) junto con sus caches, lo que
  elimina de raíz las CVEs de sus dependencias internas y reduce la superficie.
- **`docker-entrypoint.sh`**: se invocan las herramientas por path en lugar de
  mediante `npx`/`pnpm`, que ya no existen en la imagen:
  - `node /app/node_modules/prisma/build/index.js db push`
  - `node /app/node_modules/tsx/dist/cli.mjs prisma/seed.ts` (solo con `SEED_DATABASE=true`)

## Verificación

- Build local + `trivy image --severity HIGH,CRITICAL --ignore-unfixed`: **0**
  hallazgos (antes: 38).
- Smoke test del contenedor: `prisma db push` OK, admin general creado, Nest
  arranca (sale solo sin `MERCADO_PAGO_ACCESS_TOKEN`, fail-closed esperado).
- `eslint` sin errores, `tsc -b` del frontend OK, `nest build` OK y **250/250**
  tests E2E en verde.
- Release: bump a `1.1.1` y `pnpm changelog 1.1.1`; al pasar el scan, CI publica
  la imagen y crea el GitHub Release. La imagen `v1.1.0` (con CVEs) queda en GHCR
  sin Release asociado.
