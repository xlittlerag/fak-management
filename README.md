# Kendo Manager

Plataforma de gestión de socios de la Federación Argentina de Kendo:
asociaciones, dojos, eventos, pagos, diplomas, certificaciones y auditoría.

## Stack

- **Backend:** NestJS + Prisma + SQLite, autenticación JWT (login por DNI) con
  `argon2id`.
- **Frontend:** Preact + Vite + Tailwind CSS v4.

## Inicio rápido (desarrollo)

Requisitos: Node.js (LTS) y pnpm.

```bash
pnpm install
cp .env.example .env        # completar JWT_SECRET (y TOTP_ENCRYPTION_KEY para 2FA)
npx prisma db push          # crea dev.db con el esquema
pnpm run seed               # datos de prueba (solo dev/test)
pnpm run start:dev          # backend en http://localhost:3000
cd frontend && pnpm run dev # frontend en http://localhost:5173
```

Usuarios de prueba, variables de entorno y comandos de prueba en
[`docs/desarrollo.md`](docs/desarrollo.md).

## Despliegue

Guía con contenedores (Podman/Docker) en
[`docs/despliegue.md`](docs/despliegue.md).

## Documentación

| Documento                                        | Contenido                                          |
| ------------------------------------------------ | -------------------------------------------------- |
| [`docs/desarrollo.md`](docs/desarrollo.md)       | Setup de desarrollo, usuarios de prueba, pruebas   |
| [`docs/despliegue.md`](docs/despliegue.md)       | Despliegue con contenedores                        |
| [`docs/hosting.md`](docs/hosting.md)             | Requerimientos de hosting, nginx, backups y costos |
| [`docs/core-global.md`](docs/core-global.md)     | Modelo de datos y enums                            |
| [`docs/requerimiento.md`](docs/requerimiento.md) | Requerimiento funcional                            |
| [`docs/iteraciones/`](docs/iteraciones/)         | Historial de iteraciones                           |
| [`CHANGELOG.md`](CHANGELOG.md)                   | Cambios por versión                                |
| [`AGENTS.md`](AGENTS.md)                         | Convenciones del repositorio para agentes          |
