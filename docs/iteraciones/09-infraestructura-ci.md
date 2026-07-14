# Especificación Técnica - Iteración 9: Infraestructura y CI

> **Estado:** Completado

## Objetivo

Contenerizar la aplicación en un contenedor único (backend + frontend estáticos) y automatizar build y tests mediante CI.

## Containerfile

### Arquitectura

```
node:24-slim (base)
  ├── prod-deps  → instalar solo dependencias de producción + prisma generate
  ├── build      → instalar todas las deps + compilar frontend + backend
  └── runtime    → solo node_modules (prod), dist/, prisma/, y entrypoint
```

### Usuario no-root

Se crea el usuario `kendo` (sin shell). La aplicación corre bajo este usuario por seguridad.

```dockerfile
RUN groupadd -r kendo && useradd -r -g kendo -d /app -s /sbin/nologin kendo
USER kendo
```

### Volúmenes

| Path | Propósito |
|---|---|
| `/app/uploads` | Archivos subidos (diplomas, certificados médicos) |

La base de datos SQLite vive dentro del contenedor en `/app/` con nombre definido por `DATABASE_URL`. Para persistencia, el usuario debe montar `/app` o un directorio específico.

### Entrypoint (`docker-entrypoint.sh`)

```sh
1. npx prisma db push        → actualizar schema de la DB si hubo cambios
2. node script                → crear admin general si no existe
3. exec node dist/main.js     → iniciar app
```

### Variables de Entorno Requeridas

| Variable | Ejemplo | Descripción |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 64` | Firma de tokens JWT |
| `DATABASE_URL` | `file:devdb` | URL de conexión SQLite (sin puntos/slashes, ver nota abajo) |
| `MERCADO_PAGO_ACCESS_TOKEN` | `test-...` | Token de API de Mercado Pago |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | `test-...` | Public key de Mercado Pago para el frontend |

### Nota: Bug en Prisma 7.8 SQLite URL

Prisma 7.8 rechaza los caracteres `.` y `/` en el path de conexión SQLite cuando se usa el archivo `prisma.config.ts`. Por esto `DATABASE_URL=file:./dev.db` **no funciona** en `prisma db push`. La solución es usar un nombre simple sin puntos ni barras:

```bash
DATABASE_URL="file:devdb"       # ✅ funciona
DATABASE_URL="file:./dev.db"    # ❌ Error: parsing connection string
```

Esto afecta solo a `prisma db push`. El runtime (`PrismaBetterSqlite3` adapter) acepta ambos formatos.

### Comando de ejemplo

```bash
podman build -t kendo-manager .
podman run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 64)" \
  -e DATABASE_URL="file:devdb" \
  -e MERCADO_PAGO_ACCESS_TOKEN="..." \
  -e VITE_MERCADO_PAGO_PUBLIC_KEY="..." \
  -e ADMIN_PASSWORD="segura123" \
  -v kendo-uploads:/app/uploads \
  kendo-manager
```

## Admin automático en primer arranque

El entrypoint ejecuta un script Node.js que:

1. Cuenta registros en `adminGeneral`
2. Si hay 0, crea uno con DNI `00000000` y la contraseña de `ADMIN_PASSWORD` (default `Admin123!`)
3. Si ya existe, no hace nada

Esto permite:
- **DB nueva** → admin creado automáticamente
- **DB existente con admin** → no se duplica
- **DB importada sin admin** → se crea al arrancar

## CI (GitHub Actions)

**Archivo:** `.github/workflows/ci.yml`

### Disparadores

- `push` a `main`
- `pull_request` sobre `main`

### Jobs

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - checkout
    - pnpm/action-setup
    - setup-node v24 con cache de pnpm
    - pnpm install --frozen-lockfile
    - npx prisma db push           # crear DB de test
    - pnpm run build               # compilar backend + frontend
    - pnpm run test:e2e            # 150 tests E2E
```

### Variables de CI

```yaml
JWT_SECRET: test-ci
DATABASE_URL: "file:devdb"
MERCADO_PAGO_ACCESS_TOKEN: test
VITE_MERCADO_PAGO_PUBLIC_KEY: test
```

## Criterios de Aceptación (DoD)

- [ ] `Containerfile` construye exitosamente sin errores
- [ ] El contenedor inicia con `prisma db push` automático
- [ ] El contenedor crea admin si la DB está vacía
- [ ] El contenedor no duplica admin si ya existe
- [ ] Las variables de entorno se pasan correctamente
- [ ] El frontend se sirve desde el mismo contenedor en `/`
- [ ] El API responde en `/api/*`
- [ ] Los tests E2E pasan en CI
- [ ] `.dockerignore` excluye node_modules, dist, .git
- [ ] El usuario no-root `kendo` puede escribir en `uploads/`
- [ ] Documentado en `AGENTS.md`
