#!/usr/bin/env sh
# Regenera CHANGELOG.md desde los commits convencionales con git-cliff.
#
# Uso:
#   pnpm changelog            # refleja los commits pendientes como [Unreleased]
#   pnpm changelog 1.2.0      # cierra el pendiente como la versión v1.2.0
#
# El tag base v1.0.0 es LOCAL (no se publica): marca dónde termina el historial
# previo a la automatización, cuyo texto curado vive en `footer` de cliff.toml.
set -eu

BASELINE_TAG=v1.0.0
BASELINE_COMMIT=1846cd9

if ! git rev-parse -q --verify "refs/tags/$BASELINE_TAG" >/dev/null; then
  git tag "$BASELINE_TAG" "$BASELINE_COMMIT"
  echo "creado tag base local $BASELINE_TAG -> $BASELINE_COMMIT"
fi

TAG_ARG=""
if [ "$#" -gt 0 ]; then
  TAG_ARG="--tag v$1"
fi

# shellcheck disable=SC2086
exec npx --yes git-cliff --config cliff.toml $TAG_ARG -o CHANGELOG.md
