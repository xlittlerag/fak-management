# Iteración 17 — Endurecimiento de seguridad (P0→P3)

## Objetivo
Cerrar los hallazgos de la auditoría de seguridad (auth, uploads, pagos, secretos, deploy, backups) con un commit por ítem. Suite final: 17 archivos, 243 tests en verde; backend, frontend y scripts verificados.

## P0 — Auth crítico
- **Código de blanqueo con `randomInt`** (`auth.service.ts`): 8 caracteres de alfabeto sin ambiguos (~41 bits). Antes `Math.random()` (~31 bits, predecible).
- **Throttle + bloqueo por intentos**: `@Throttle(5/min)` en `login`, `reset/request`, `reset/complete`; `codigo_blanqueo_intentos` (nueva columna) invalida el código al 5.º fallo.
- **Política de contraseñas 12–128** (`complete-reset.dto.ts` nuevo, `register-user.dto.ts`, `update-perfil.dto.ts`): el máximo acota el costo de argon2id. Frontend alineado (Registro, Reset, Perfil).
- **Redacción de secretos**: `logging.interceptor.ts` redacta passwords, códigos, `token_pendiente`, QR/secreto/respaldos 2FA en body/query/respuesta; `prisma.service.ts` redacta `password`, `codigo_blanqueo`, `totp_*` en `AuditLog`.
- **Anti-enumeración**: `requestReset` responde genérico exista o no el DNI (era 404 diferencial).
- **Cambio de password exige la actual** (`updatePerfil` + `password_actual` con `@ValidateIf`; Perfil la pide solo si hay nueva).
- **`AdminLoginDto`**: `admin-login` sin DTO devolvía 500 ante body inválido; ahora 400.

## P1 — Uploads, headers, emails, validación
- **Magic-bytes** (`files.service.ts`): el tipo real (JPG/PNG/PDF) manda; la extensión guardada sale del contenido, no del cliente. Cae SVG/HTML con mime falsificado (test incluido).
- **Serve como adjunto** (`uploads.controller.ts`): `Content-Disposition: attachment` + `nosniff` + allowlist `uuid.(jpg|jpeg|png|pdf)` con `basename()` (cierra XSS almacenado y path traversal).
- **Helmet** (`main.ts`): HSTS, nosniff, frameguard + CSP que permite el SDK de Mercado Pago. Sin CORP (rompería el frontend dev en otro origen). Verificado con curl contra prod local.
- **Disk storage + pre-filtro** (`files/multer-options.ts`): fin del buffer de 500 MB en RAM; `fileFilter` por extensión, tope de lote 50→20, temporales siempre eliminados.
- **Escape HTML en emails** (`notificaciones.service.ts`): `escapeHtml()` en valores; `mensaje_adicional` (HTML estático del servicio) vía `rawKeys`.
- **DTOs faltantes**: `CreateLoteDto` (multipart string→int), `AprobarInscripcionDto` (enum), `WebhookDto` + `SimulateDto`; `createLote` valida JSON y forma de metas (era 500).

## P2 — Pagos
- **Firma `x-signature`** (`mercado-pago.service.ts`): HMAC-SHA256 sobre `id;request-id;ts` con `MERCADO_PAGO_WEBHOOK_SECRET` (nueva var, ver hosting.md); 401 ante firma inválida/ausente con secreto configurado; throttle propio 60/min. Sin secreto: acepta con warning (compatibilidad, obligatorio en prod).
- **`simulate` bloqueado en prod** aunque el flag quede en `true` (doble gate por `NODE_ENV`).
- **Idempotencia persistente** (`PagoProcesado`, `mp_payment_id` único): reemplaza el `Set` en memoria (se perdía al reiniciar); carreras resueltas por constraint único; `simulate` también registra.

## P3 — Secretos, deploy, operaciones
- **JWT fail-closed** (`auth.module.ts`): `getOrThrow` + mínimo 32 caracteres; la app no arranca sin secreto válido. CI, playwright y `.env` local actualizados a secretos largos.
- **`ADMIN_PASSWORD` obligatoria ≥15** (`docker-entrypoint.sh`): sin default, el contenedor no arranca. Docs sin el default viejo.
- **`.dockerignore`**: `*.db`, `uploads/`, `data/` fuera de las capas (llevaban PII de dev).
- **Seed bloqueado en prod** (entrypoint + `seed.ts` abortan con `NODE_ENV=production`).
- **CI**: `permissions: contents: read`, 6 actions pineadas por SHA, `persist-credentials: false`.
- **CORS fail-closed** (`cors-origins.ts`): rechaza `*`, exige URL válida, https en prod, lista vacía en prod sin variable.
- **Backups**: `BACKUP_PASSPHRASE` obligatoria, cifrado AES-256-CBC/PBKDF2, snapshot vía `sqlite3 .backup` (con fallback), `umask 077`/`chmod 600`, resguardo previo en restore, retención sin `|| true` silencioso. `sqlite3` agregado a la imagen. Round-trip probado localmente. Docs de hosting actualizadas (comandos, cron, checklist).

## Pendiente manual (fuera del repo)
- Rotar `JWT_SECRET` débil y el token MP real del `.env` local; `chmod 600 .env`.
- Definir `MERCADO_PAGO_WEBHOOK_SECRET` (dashboard de MP) y `BACKUP_PASSPHRASE` en producción.
- Probar restore cifrado contra el remoto real.
