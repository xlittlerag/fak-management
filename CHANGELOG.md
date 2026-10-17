# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Cada iteración se documenta en `docs/iteraciones/NN-nombre.md`.

## [Unreleased]

### Cambiado

- Rediseño completo del frontend con identidad "Kendo Argentina" (ai-zome & shiaijo): tokens de diseño, tipografías Zen, monograma propio, primitivas de UI y shells de autenticación/estado; rutas migradas a tokens (20).
- Se elimina "FAK"/"Kendo Manager" de la interfaz, los emails y las docs vivas.

### Corregido

- Autenticación: el throttle lee `THROTTLE_LIMIT`/`THROTTLE_TTL`, evitando falsos 429 en la suite E2E.
- Registro y perfil: se rechazan fechas de nacimiento imposibles (futuras o hace más de 120 años) y teléfonos con letras (TC-04, TC-06).
- Certificados externos: se puede informar la fecha real de obtención del grado y se usa al aprobar (TC-07; requiere `npx prisma db push`).
- Formulario de evento: las fechas ya no muestran +1 día al editar (conversión a fecha local) (TC-11, TC-12).
- Torneos: el rango de graduación a nivel evento se exige además del de cada categoría (TC-13).
- Login: el mensaje de blanqueo se limpia al iniciar una nueva acción y se muestra el mensaje del servidor (TC-02, TC-03).

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
