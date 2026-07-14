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

| Prioridad | Feature | Estado |
|---|---|---|---|
| 1 | **Dashboard / Reportes** — Estadísticas de miembros, eventos, ingresos; gráficos | Pendiente |
| 2 | **Notificaciones** — Emails automáticos vía SMTP (bienvenida, reseteo contraseña, estado inscripción, estado certificación) | ✅ Completado |
| 3 | **Frontend completo** — Refinamiento UX, carga de archivos | Pendiente |
| 4 | **Infraestructura** — Scripts de backup/restore | Pendiente |

### Leyenda
- ✅ Completado — Iteraciones 1–8
- 🔜 Pendiente — Planificado, no iniciado

