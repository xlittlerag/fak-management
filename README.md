# Kendo Manager

## 🏗️ Arquitectura

El proyecto es una aplicación Monorepo dividida en:

- **Backend:** NestJS (Node.js) + Prisma ORM + SQLite.
- **Frontend:** Preact + Vite + Tailwind CSS.

## 🚀 Inicio Rápido

### Requisitos

- Node.js (LTS)
- pnpm

### Configuración del Entorno

1. Instalar dependencias en la raíz:
   ```bash
   pnpm install
   ```
2. Configurar el archivo `.env` en la raíz:
   ```bash
   cp .env.example .env
   ```
   Al menos reemplazar `JWT_SECRET` por un valor aleatorio, p.ej. `openssl rand -hex 64`.

### Ejecución con Podman

```bash
# Construir imagen
podman build --build-arg VITE_MERCADO_PAGO_PUBLIC_KEY="test-xxxx" -t kendo-manager .

# Ejecutar contenedor (primera vez)
podman run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 64)" \
  -e MERCADO_PAGO_ACCESS_TOKEN="test" \
  -e MERCADO_PAGO_SIMULATED="true" \
  -e ADMIN_PASSWORD="Admin123" \
  -v kendo-db:/app/data \
  -v kendo-uploads:/app/uploads \
  kendo-manager

# Healthcheck (podman no soporta HEALTHCHECK en OCI)
# Agregar al ejecutar:
#   --health-cmd="node -e \"require('http').get('http://localhost:3000/',()=>process.exit(0)).on('error',()=>process.exit(1))\"" \
#   --health-interval=30s \
#   --health-start-period=15s
```

> **Nota:** en producción el arranque crea únicamente el admin general bootstrap
> (password = `ADMIN_PASSWORD`, default `Admin123`) y **no** carga datos de prueba.
> Para entornos de prueba iniciales, agregar `-e SEED_DATABASE="true"` en el primer
> `run` (default `false`).
```

### Ejecución en Desarrollo

#### 1. Base de Datos (SQLite)

SQLite no necesita servidor. Crear el esquema y cargar los registros iniciales:

```bash
npx prisma db push   # crea el archivo dev.db en la raíz con el esquema actual
pnpm run seed        # carga los datos de prueba (asociaciones, dojos, usuarios, eventos...)
```

- `npx prisma db push` crea `dev.db` automáticamente; `npx prisma generate` ya
  se ejecuta vía `postinstall` al instalar dependencias.
- `pnpm run seed` es idempotente: limpia y recrea los datos de prueba. Solo debe
  usarse en desarrollo/test.

#### Usuarios de prueba (seed)

| Rol                                  | Login                        | Password    |
| ------------------------------------ | ---------------------------- | ----------- |
| Admin General                        | `POST /api/auth/admin-login` | `Admin123`  |
| Admin de Asociación (Yoshinkan)      | `dni: 11111111`              | `Test1234!` |
| Usuario básico                       | `dni: 55555555`              | `Test1234!` |

Todos los usuarios del seed comparten la contraseña `Test1234!`.

#### 2. Backend

```bash
pnpm run start:dev
```

Se sirve en `http://localhost:3000` (API bajo `/api`).

#### 3. Frontend

```bash
cd frontend
pnpm run dev
```

Se sirve en `http://localhost:5173`. En modo desarrollo el frontend apunta a
`http://localhost:3000/api` (CORS habilitado en el backend).

> **Nota (Mercado Pago):** para probar pagos sin checkout real, setear
> `MERCADO_PAGO_SIMULATED=true` en `.env` antes de iniciar el backend (modo
> simulado, iteración 10).

## 🧪 Pruebas

- **E2E (Backend):** `pnpm run test:e2e`

## 🛠️ Tecnologías

- **Backend:** NestJS, Prisma, JWT, Bcrypt.
- **Frontend:** Preact, Tailwind CSS v4, Axios, Preact-ISO.

## 📋 TODO / Próximos Pasos

| Prioridad | Feature                                                                                                                     | Estado        |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1         | **Dashboard / Reportes** — Estadísticas de miembros, eventos, ingresos; gráficos                                            | Pendiente     |
| 2         | **Notificaciones** — Emails automáticos vía SMTP (bienvenida, reseteo contraseña, estado inscripción, estado certificación) | ✅ Completado |
| 3         | **Frontend completo** — Refinamiento UX, carga de archivos                                                                  | ✅ Completado |
| 4         | **Infraestructura** — Containerfile, CI, backup/restore con rclone                                                          | ✅ Completado |

### Leyenda

- ✅ Completado — Iteraciones 1–10
- 🔜 Pendiente — Planificado, no iniciado
