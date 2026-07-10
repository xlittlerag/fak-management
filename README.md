# Kendo Manager

Plataforma de gestión integral para la Federación Argentina de Kendo (FAK) y sus dojos asociados.

## 🏗️ Arquitectura
El proyecto es una aplicación Monorepo dividida en:
- **Backend:** NestJS (Node.js) + Prisma ORM + PostgreSQL.
- **Frontend:** Preact + Vite + Tailwind CSS.

## 🚀 Inicio Rápido

### Requisitos
- Node.js (LTS)
- pnpm
- PostgreSQL (o usar el cluster local en `.db/`)

### Configuración del Entorno
1. Instalar dependencias en la raíz:
   ```bash
   pnpm install
   ```
2. Configurar el archivo `.env` en la raíz (ver `.env.example`).

### Ejecución en Desarrollo

#### 1. Base de Datos
Si no tienes una instancia de Postgres, puedes iniciar la local:
```bash
pg_ctl -D .db -l .db/log start
```

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

---
## 🏠 Despliegue en Producción (Home Server)

La aplicación puede ser desplegada de forma unificada utilizando Podman y contenedores.

### 1. Despliegue con Podman
Utilice el archivo `podman-compose.yml` incluido para orquestar la base de datos y la aplicación:

```bash
# Construir y levantar servicios en segundo plano
podman-compose up -d --build
```

### 2. Gestión
- **Verificar logs:** `podman-compose logs -f kendo-app`
- **Detener servicios:** `podman-compose down`

> **Nota:** Recuerde actualizar las variables de entorno en el archivo `podman-compose.yml` (`JWT_SECRET` y contraseñas de base de datos) antes del despliegue final.

---

## 📋 TODO / Próximos Pasos

| Prioridad | Feature | Estado |
|---|---|---|---|
| 1 | **Módulo de Auditoría** — Registro automático de cambios (quién, qué, cuándo) en todas las entidades críticas | En progreso |
| 2 | **Dashboard / Reportes** — Estadísticas de miembros, eventos, ingresos; gráficos | Pendiente |
| 3 | **Notificaciones** — Sistema de emails automáticos (recordatorios de cuota, inscripciones, resultados de exámenes) | Pendiente |
| 4 | **Frontend completo** — Rutas/páginas pendientes, refinamiento UX, carga de archivos | Pendiente |
| 5 | **Infraestructura** — `podman-compose.yml`, scripts de backup/restore | Pendiente |

### Leyenda
- ✅ Completado — Iteraciones 1–6
- 🔜 Pendiente — Planificado, no iniciado

