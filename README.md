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
2. Configurar el archivo `.env` en la raíz (ver `.env.example`).

### Ejecución con Podman

```bash
# Construir imagen
podman build --build-arg VITE_MERCADO_PAGO_PUBLIC_KEY="test-xxxx" -t kendo-manager .

# Ejecutar contenedor (primera vez)
podman run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 64)" \
  -e MERCADO_PAGO_ACCESS_TOKEN="test" \
  -e ADMIN_PASSWORD="Admin123!" \
  -v kendo-db:/app/data \
  -v kendo-uploads:/app/uploads \
  kendo-manager

# Healthcheck (podman no soporta HEALTHCHECK en OCI)
# Agregar al ejecutar:
#   --health-cmd="node -e \"require('http').get('http://localhost:3000/',()=>process.exit(0)).on('error',()=>process.exit(1))\"" \
#   --health-interval=30s \
#   --health-start-period=15s
```

### Ejecución en Desarrollo

#### 1. Base de Datos

SQLite no necesita servidor. El archivo `dev.db` se crea automáticamente al
ejecutar `npx prisma db push`.

#### 2. Backend

```bash
pnpm run start:dev
```

#### 3. Frontend

```bash
cd frontend
pnpm run dev
```

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

- ✅ Completado — Iteraciones 1–9
- 🔜 Pendiente — Planificado, no iniciado
