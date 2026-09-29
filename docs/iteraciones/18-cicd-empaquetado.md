# Iteración 18 — CI/CD y empaquetado

## Objetivo
Pipeline completo: lint, tests, imagen publicada en GHCR con scan, deploy
por compose y releases versionadas (`1.0.0`).

## CI (`.github/workflows/ci.yml`)
- **`lint`**: `eslint` backend sin `--fix` (en CI verifica, no modifica) + `tsc -b` del frontend. Corre en paralelo con `test`.
- **`test`** y **`browser-e2e`**: sin cambios de lógica; el segundo sube `playwright-report/` + `test-results/` como artefacto ante fallos (retención 7 días).
- **`imagen`** (`needs: [lint, test]`): build del `Containerfile`, push a `ghcr.io/<owner>/kendo-manager` con `GITHUB_TOKEN` (`packages: write` solo en este job). Tags: `latest` (solo main), `sha-<sha>`, `v*` (en tags). En PRs construye sin publicar. `GITHUB_TOKEN` lo provee GitHub: nada que configurar.
- **`scan`** (`needs: [imagen]`, no PRs): Trivy sobre `:sha-<sha>`, `HIGH,CRITICAL` con `ignore-unfixed` y `exit-code: 1`.
- **`concurrency`**: cancela runs anteriores de la misma rama (no de tags).
- **Triggers**: `push` a main, `tags: v*`, PRs a main. Todas las actions pineadas por SHA con comentario de versión.
- Límite conocido: el scan no corre en PRs (no hay imagen publicada); el build sí valida que la imagen compila.

## Empaquetado
- **`compose.yml`**: servicio `app` (build local por defecto), `env_file: deploy.env` (requerido), `restart: unless-stopped`, puertos solo en loopback, volúmenes nombrados, healthcheck con `node` contra `GET /api/eventos` (público). Flujo GHCR: `APP_IMAGE=ghcr.io/<owner>/kendo-manager IMAGE_TAG=vX.Y.Z pull + up -d`.
- **`Containerfile`**: labels OCI (`title/version/revision/source`) vía `ARG VERSION/GIT_SHA` (los inyecta CI).
- **`deploy.env.example`**: todas las variables con comandos de generación; `deploy.env` ignorado en git.

## Releases y versionado
- Versión sincronizada `1.0.0` en `package.json` y `frontend/package.json`.
- `CHANGELOG.md` (Keep a Changelog) retroactivo 1–17 + `Unreleased`.
- Flow de release:
  1. Bump de versión en ambos `package.json` + entrada en `CHANGELOG.md` (commit `chore(release)`).
  2. `git tag vX.Y.Z && git push origin vX.Y.Z` → CI publica `vX.Y.Z`, mueve `latest` y corre el scan.
  3. Release de GitHub manual con las notas del changelog.

## Verificación
- `tsc`/eslint locales en verde; suite E2E 243 tests en verde antes de esta iteración (sin cambios de código de app).
- Pendiente en CI real: primer run en main/tags para confirmar push a GHCR y scan (requiere que el repo tenga packages habilitados; sin acción manual: hereda visibilidad del repo).
