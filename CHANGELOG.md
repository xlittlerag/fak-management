# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Cada iteración se documenta en `docs/iteraciones/NN-nombre.md` y cada release se
genera desde los commits con `git-cliff` (ver `docs/iteraciones/18-cicd-empaquetado.md`).

## [1.1.1] - 2026-10-19

### Corregido

- Remediar CVEs del scan de la imagen (`security`)

## [1.1.0] - 2026-10-19

### Agregado

- Rediseño ai-zome & shiaijo y marca Kendo Argentina (iteración 20) (`ui`)

### CI/CD

- Etiquetar imagen con sha completo para el scan de Trivy
- Generar CHANGELOG con git-cliff y publicar release en CI

### Corregido

- Correcciones de la planilla Test C Kendo (iteración 19) (`qa`)
- Declarar multer como dependencia directa (`backend`)

### Dependencias

- Actualizar dependencias patch/minor (back y front) (`deps`)
- Migrar NestJS a la v12 (`deps`)
- Actualizar dotenv, nodemailer y TypeScript 6 (`deps`)
- Migrar Preact a la v11 (`deps`)
- Actualizar eslint y globals del frontend (`deps`)

### Documentación

- CHANGELOG Keep-a-Changelog con 1.0.0 retroactivo
- Iteración 18 (CI/CD y empaquetado) + sección Workflow en AGENTS.md
- Migrar instrucciones de deploy de podman run a compose
- Fijar owner xlittlerag/fak-management en rutas GHCR
- Documentar iteración 21 de rendimiento (`performance`)
- Simplificar README y mover detalle a docs/

### Rendimiento

- Harness de Core Web Vitals y presupuesto de rendimiento (`perf`)
- Índices, selects acotados, take y PRAGMAs SQLite (`backend`)
- Lazy loading de rutas y chunk vendor (`frontend`)
- Cache de GETs, dedupe y compresión gzip (`frontend`)
- Estabilizar el valor de AuthContext (`frontend`)
- Fuentes self-hosted y SDK de Mercado Pago on-demand (`frontend`)

### Varios

- Ignorar artefactos de compilación tsbuildinfo

## [1.0.0] - 2026-09-29

Primera versión estable: plataforma de gestión de socios de la Federación Argentina de Kendo
(asociaciones, dojos, eventos, pagos, diplomas, auditoría) con 2FA de admin,
endurecimiento P0–P3 y pipeline de CI/CD con imagen publicada en GHCR.

### Agregado

- Autenticación JWT en cookie httpOnly con login por DNI (1).
- Frontend Preact + Tailwind: dashboard, perfil, registro (2).
- Pago de cuota federativa con Mercado Pago + admin de cuota (3).
- Eventos (torneo/examen/seminario), inscripciones y permisos (4).
- Diplomas nacionales, certificaciones externas, reimpresiones (5).
- Auditoría automática de cambios (6).
- Borrado de eventos con validación de inscripciones (7).
- Notificaciones por email vía SMTP (8).
- Infraestructura: Containerfile, entrypoint con admin automático, CI, backups con rclone (9).
- Modo simulado de Mercado Pago para tests (10).
- Desafiliación/afiliación con aprobaciones (11).
- Mesas examinadoras con carga de resultados (12).
- Secuencialidad de resultados y graduación por diploma (13).
- E2E de navegador con Playwright en CI (14).
- Hashing argon2id vía `PasswordService` (15).
- 2FA TOTP opt-in del admin con códigos de respaldo (16).
- Endurecimiento P0–P3: throttle, política 12–128, redacción en logs, uploads validados, helmet, firma de webhook, secretos fail-closed, backups cifrados (17).
- CI/CD: lint, imagen GHCR, scan Trivy, `compose.yml`, releases versionadas (18).

### Seguridad

- Ver iteración 17 (`docs/iteraciones/17-endurecimiento.md`). Acciones manuales
pendientes documentadas ahí (rotación de secretos, passphrase de backup).
