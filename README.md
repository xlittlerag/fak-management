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
