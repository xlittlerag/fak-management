# Guía de despliegue — Kendo Manager

Despliegue con contenedores (Podman o Docker). Para los requerimientos de
servidor, nginx, SSL, backups y costos, ver
[`hosting.md`](./hosting.md).

## Con compose (recomendado)

```bash
# 1. Completar secretos (ver deploy.env.example para la lista completa)
cp deploy.env.example deploy.env

# 2. Levantar (construye la imagen local; ver compose.yml)
podman-compose up -d --build   # o: docker compose up -d --build

# 3. Ver estado y salud
podman ps
```

Equivalente con imagen publicada (sin build local):

```bash
APP_IMAGE=ghcr.io/<owner>/kendo-manager IMAGE_TAG=v1.0.0 \
  podman-compose pull app && IMAGE_TAG=v1.0.0 podman-compose up -d
```

> **Nota:** en producción el arranque crea únicamente el admin general bootstrap
> (password = `ADMIN_PASSWORD`, mínimo 15 caracteres, sin valor por defecto:
> sin ella el contenedor no arranca) y **no** carga datos de prueba. Para
> entornos de prueba iniciales, definir `SEED_DATABASE="true"` en `deploy.env`
> solo en el primer arranque (default `false`).

## Guía paso a paso

La instalación completa (VPS, Podman, nginx, SSL con Certbot, backups con
rclone y checklist) está en
[`hosting.md` § Guía rápida de implementación](./hosting.md#guía-rápida-de-implementación-digitalocean--podman).

## Releases

Las imágenes se publican en `ghcr.io` con tags `latest`, `sha-<sha completo>` y
`vX.Y.Z` al empujar un tag; CI corre el scan de Trivy y crea el GitHub Release
con las notas del CHANGELOG. El CHANGELOG se genera desde los commits
convencionales (`pnpm changelog`). Ver [`../CHANGELOG.md`](../CHANGELOG.md),
[`iteraciones/18-cicd-empaquetado.md`](./iteraciones/18-cicd-empaquetado.md) y
[`iteraciones/22-changelog-automatizado.md`](./iteraciones/22-changelog-automatizado.md).
