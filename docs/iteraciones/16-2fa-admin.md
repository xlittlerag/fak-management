# Iteración 16 — 2FA TOTP opt-in para el admin general

## Objetivo
Proteger el acceso de administrador general con un segundo factor TOTP (aplicación autenticadora: Google Authenticator, Authy, 1Password). Opt-in con flag: hasta habilitarlo, `admin-login` sigue siendo de un solo paso.

## Cambios

### Schema (`prisma/schema.prisma`, `AdminGeneral`)
- `totp_secreto String?` — secreto TOTP cifrado AES-256-GCM (null = nunca configurado).
- `totp_habilitado Boolean @default(false)` — opt-in.
- `totp_codigos_respaldo String?` — JSON array de hashes argon2 (10 códigos de 8 dígitos, un solo uso).

### Nuevo `TwoFactorService` (`src/auth/two-factor.service.ts`)
- TOTP RFC 6238 (SHA-1, 6 dígitos, paso 30s, ventana ±1) implementado sobre `node:crypto` — verificado contra el vector oficial (secreto `12345678901234567890`, T=59 → `287082`). Se descartó `otplib` v13: su ESM rompe el runner jest.
- `generarSecreto()` → secreto base32 + `otpauth://` estándar (compatible con cualquier app); `generarQR()` con `qrcode` (dataURL).
- `cifrar()` / `descifrar()` AES-256-GCM con clave de `TOTP_ENCRYPTION_KEY` (hex 64 chars o string derivado con scrypt). Sin la variable, `disponible === false` y los endpoints responden 503.
- Comparación de códigos con `timingSafeEqual`.

### Auth (`src/auth/auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`)
- `POST /api/auth/admin-login`: si `totp_habilitado`, devuelve `{ requiere_2fa: true, token_pendiente }` (JWT 5 min con claim `pendiente_2fa`, sin cookie). Si no, sesión directa como antes.
- `POST /api/auth/admin-2fa/verificar { token_pendiente, codigo }`: acepta TOTP vigente o código de respaldo (lo quema). Crea la sesión en cookie httpOnly.
- `JwtStrategy.validate()` rechaza tokens con `pendiente_2fa` (401 en cualquier ruta protegida).
- Gestión (requieren sesión `ADMIN_GENERAL`):
  - `GET /admin-2fa/estado` → `{ habilitado, activacion_en_curso, respaldos_restantes }`.
  - `POST /admin-2fa/setup` → `{ otpauth_url, qr, secreto_manual }` (guarda secreto cifrado sin habilitar).
  - `POST /admin-2fa/confirmar { codigo }` → habilita + devuelve 10 respaldos (única vez).
  - `POST /admin-2fa/deshabilitar { password }` → re-verifica password y limpia todo.
  - `POST /admin-2fa/respaldo/regenerar` → 10 nuevos, invalida anteriores.
- Throttle estricto (5 req/min) en `admin-login` y `verificar`.

### Frontend (`frontend/src/routes/`)
- `AdminLogin.tsx`: dos pasos — password, luego código (acepta TOTP o respaldo).
- Nueva `Admin2FA.tsx` en `/dashboard/seguridad` (sección Auditoría del sidebar, solo `ADMIN_GENERAL`): activar (QR + secreto manual + confirmación), ver respaldos una sola vez, regenerar, deshabilitar con password.

### Tests (`test/auth-2fa.e2e-spec.ts`, 6 tests)
Compatibilidad sin 2FA, flujo completo, código/token inválidos, respaldo de un solo uso, setup duplicado → 409 + deshabilitar, regeneración invalida anteriores. Suite total: 17 archivos, 232 tests en verde.

## Recuperación ante lockout (pérdida de app + respaldos)
No hay endpoint de reset a propósito. Con acceso al servidor:
```bash
sqlite3 /app/data/devdb "UPDATE AdminGeneral SET totp_habilitado=0, totp_secreto=NULL, totp_codigos_respaldo=NULL;"
```
(En dev, el archivo es `./dev.db`.) No requiere reinicio: el flag se lee en cada login. Asentar la operación en nota operativa: el reset manual no pasa por Auditoría.

## Pendiente / notas
- `TOTP_ENCRYPTION_KEY` debe existir en producción (generar con `openssl rand -hex 32`). Si se pierde/rota, los secretos guardados quedan ilegibles → tratar como lockout (reset SQL + reactivar).
- El 2FA protege contra robo de contraseña, no contra compromiso del servidor (quien lee el `.db` ya tiene todo).
