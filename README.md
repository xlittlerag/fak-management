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
   Al menos reemplazar `JWT_SECRET` por un valor aleatorio, p.ej.
   `openssl rand -hex 64`. Para activar el 2FA del admin general, definir
   también `TOTP_ENCRYPTION_KEY` (p.ej. `openssl rand -hex 32`).

### Ejecución con Podman

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
> sin ella el contenedor no arranca) y **no** carga datos de
> prueba. Para entornos de prueba iniciales, definir `SEED_DATABASE="true"`
> en `deploy.env` solo en el primer arranque (default `false`).

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

| Rol                             | Login                        | Password    |
| ------------------------------- | ---------------------------- | ----------- |
| Admin General                   | `POST /api/auth/admin-login` | `Admin123`  |
| Admin de Asociación (Yoshinkan) | `dni: 11111111`              | `Test1234!` |
| Usuario básico                  | `dni: 55555555`              | `Test1234!` |

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
`http://localhost:3000/api` (CORS habilitado en el backend solo para
`http://localhost:5173`; si usa otro puerto, agregue `CORS_ORIGIN` en `.env`).

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
