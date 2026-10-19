# Iteración 22 — CHANGELOG automatizado y release v1.1.0

## Objetivo

Eliminar el drift del `CHANGELOG.md` (que quedó desactualizado respecto de las
iteraciones 19–21 y las migraciones de dependencias) generándolo desde los
commits convencionales, y automatizar la publicación del GitHub Release.

## Decisión

`docs/iteraciones/NN-*.md` y `CHANGELOG.md` tienen audiencias distintas: el
primero es un log interno de diseño (cronológico, por tarea); el segundo es
orientado a release/usuario (agrupado por tipo, estable por versión) y lo
consumen `README.md`, `docs/despliegue.md` y el flujo de release. Mantener la
copia a mano derivaba en olvidos, así que se generó con `git-cliff` a partir de
los commits convencionales que ya se venían usando.

## Implementación

- **`cliff.toml`**: `header` fijo (Keep a Changelog), `body` con grupos en
  español (`Agregado`, `Corregido`, `Rendimiento`, `Dependencias`, `CI/CD`, …) y
  `commit_parsers` que mapea `feat`/`fix`/`perf`/`chore(deps)`/`ci`/… Sólo se
  consideran commits convencionales (`filter_unconventional`); `chore(release)` se
  omite.
- **Historial previo**: el texto curado de `1.0.0` (iteraciones 1–18) vive en el
  `footer` de `cliff.toml`, con `skip_tags = "^v1\\.0\\.0$"` para que el tag base
  sirva de límite sin renderizar una sección propia.
- **`scripts/changelog.sh`** (`pnpm changelog [X.Y.Z]`): crea el tag base local
  `v1.0.0` (apuntando a `1846cd9`, no se publica) si falta y corre
  `git-cliff -o CHANGELOG.md`. Sin argumento refleja lo pendiente como
  `[Unreleased]`; con `X.Y.Z` cierra el pendiente como esa versión. La
  regeneración es idempotente (no duplica secciones ni el header).
- **CI (`release`)**: en tags `v*`, tras el `scan`, extrae del `CHANGELOG.md`
  commiteado la sección de la versión y crea el GitHub Release con `gh`. El scan
  actúa de compuerta: si falla, no hay release.

## Release v1.1.0

- Bump sincronizado `1.0.0 → 1.1.0` en `package.json` y `frontend/package.json`.
- `pnpm changelog 1.1.0` generó la sección `[1.1.0]` (iteraciones 19–21 + deps +
  fix de CI) conservando `[1.0.0]`.
- Tag `v1.1.0` → CI publica la imagen, corre el scan y crea el GitHub Release.

## Verificación

- `pnpm changelog 1.1.0` es idempotente (`diff` sin cambios al re-ejecutar).
- Commits no convencionales y `chore(release)` quedan fuera del CHANGELOG.
- Falta el run real en el tag para confirmar la creación del Release.
