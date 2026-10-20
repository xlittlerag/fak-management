# Especificación Técnica - Iteración 8: Notificaciones por Email

> **Estado:** Completado

## Objetivo

Implementar un sistema de notificaciones por email usando nodemailer con SMTP (Gmail). El sistema debe enviar emails automáticos en eventos clave del ciclo de vida del usuario: registro, reseteo de contraseña, cambios de estado de inscripciones y certificaciones.

## Arquitectura

```
AuthService → MailService.sendWelcomeEmail()
AuthService → MailService.sendPasswordResetEmail()
EventosService → MailService.sendInscripcionStatusEmail()
CertificadosService → MailService.sendCertificacionStatusEmail()
                        ↓
              nodemailer (SMTP)
                        ↓
                    Gmail SMTP
```

El `MailService` es un servicio injectable que encapsula un `Transporter` de nodemailer. No expone el transporter directamente; expone métodos de alto nivel tipados (`sendWelcomeEmail`, `sendPasswordResetEmail`, etc.). Cada método construye el contenido HTML y lo envía.

## Variables de Entorno

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password de Google
SMTP_FROM="Kendo Manager <noreply@kendo-manager.com.ar>"
```

## Estructura de Archivos

```
src/notificaciones/
├── notificaciones.module.ts
├── notificaciones.service.ts
└── templates/
    ├── welcome.html
    ├── password-reset.html
    ├── inscripcion-status.html
    └── certificacion-status.html
```

### `notificaciones.service.ts`

```typescript
@Injectable()
export class NotificacionesService {
  constructor(
    @Inject('MAIL_TRANSPORT') private transporter: Transporter,
    private config: ConfigService,
  ) {}

  async sendWelcomeEmail(to: string, nombre: string): Promise<void>;
  async sendPasswordResetEmail(
    to: string,
    nombre: string,
    codigo: string,
  ): Promise<void>;
  async sendInscripcionStatusEmail(
    to: string,
    nombre: string,
    evento: string,
    estado: string,
  ): Promise<void>;
  async sendCertificacionStatusEmail(
    to: string,
    nombre: string,
    disciplina: string,
    estado: string,
  ): Promise<void>;
}
```

### `transporter` — Factory Provider

El transporter se crea mediante un `useFactory` en el módulo. En los tests se mockea con un transporte de prueba (stream).

## Puntos de Integración

### 1. Registro (`auth.service.ts` - `register()`)

Luego de crear el usuario exitosamente, enviar email de bienvenida a `dto.email`.

### 2. Reset de contraseña (`auth.service.ts` - `requestReset()`)

Cuando se solicita un reseteo, enviar email al usuario con instrucciones. El flujo actual es manual (admin aprueba DNI), se mantiene igual pero se agrega notificación al usuario cuando el admin aprueba el reseteo.

### 3. Aprobación/rechazo de inscripción (`eventos.service.ts` - `aprobarInscripcion()`)

Cuando un admin aprueba o rechaza una inscripción, notificar al usuario inscripto.

### 4. Cambio de estado de certificación externa (`certificados.service.ts` - `aprobar()`)

Cuando una certificación cambia de estado, notificar al usuario.

## Manejo de Errores

- Si el envío falla, se loguea el error con `Logger.warn` pero **no se propaga la excepción** al caller (el email no debe bloquear el flujo principal).
- Si no hay configuración SMTP (`SMTP_HOST` vacío), el servicio se crea pero no envía emails (modo silencioso/dev).
- Los templates se leen de disco al iniciar y se cachean en memoria.

## Templates

Los templates son HTML plano con interpolación de variables. Se usa `replace()` simple (sin handlebars) para mantener cero dependencias adicionales.

```html
<!-- templates/welcome.html -->
<h1>Bienvenido a la FAK</h1>
<p>Hola {{nombre}},</p>
<p>
  Su registro en el sistema de la Federación Argentina de Kendo ha sido recibido
  y está pendiente de aprobación por su asociación.
</p>
```

## Casos de Uso (Pruebas E2E)

1. **Registro de usuario** → se invoca `sendWelcomeEmail` con el email y nombre del usuario
2. **Solicitud de reseteo de contraseña** → se invoca `sendPasswordResetEmail`
3. **Aprobación de inscripción** → se invoca `sendInscripcionStatusEmail` con estado APROBADO
4. **Rechazo de inscripción** → se invoca `sendInscripcionStatusEmail` con estado RECHAZADO
5. **Sin configuración SMTP** → el servicio no falla, no envía email, loguea warn
6. **Error de envío (SMTP caído)** → el servicio loguea el error, el flujo principal continúa

## Criterios de Aceptación (DoD)

- [x] `NotificacionesService` se inyecta correctamente y envía emails via nodemailer
- [x] Los métodos `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendInscripcionStatusEmail` y `sendCertificacionStatusEmail` envían HTML bien formado
- [x] Al registrarse un usuario, se invoca `sendWelcomeEmail`
- [x] Al aprobar/rechazar una inscripción, se invoca `sendInscripcionStatusEmail`
- [x] Al cambiar estado de certificación, se invoca `sendCertificacionStatusEmail`
- [x] Si SMTP no está configurado, el servicio funciona en modo silencioso
- [x] Si el envío falla, el error se loguea pero no se propaga al usuario
- [x] Variables SMTP documentadas en `.env.example`
- [x] Tests E2E con nodemailer mockeado

## Verificación con Gmail (cuenta personal)

> **Estado:** Verificado el 2026-10-20 contra `smtp.gmail.com:587` con App Password.

### Requisitos

1. Activar la verificación en 2 pasos en la cuenta de Google.
2. Generar una **App Password** en <https://myaccount.google.com/apppasswords> (tipo "Correo" + "Otro").
3. Copiar el código de 16 caracteres **sin espacios** en `SMTP_PASSWORD`.

### Configuración

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cuenta@gmail.com
SMTP_PASSWORD=xxxxxxxxxxxxxxxx
SMTP_FROM="Kendo Argentina <cuenta@gmail.com>"
```

Durante las pruebas, `SMTP_FROM` debe coincidir con `SMTP_USER`: Gmail rechaza o reescribe un remitente de otro dominio que no esté verificado. El transporte usa `secure: false` en el puerto 587, que es correcto porque nodemailer negocia STARTTLS.

### Script de verificación

`scripts/send-test-email.ts` levanta un contexto Nest mínimo (`ConfigModule` + `NotificacionesModule`), valida credenciales con `transporter.verify()` y envía el template real `welcome.html`. No requiere base de datos ni servidor HTTP.

```bash
pnpm test:email                                  # destinatario = SMTP_USER
TEST_EMAIL=otra@example.com pnpm test:email      # otro destinatario
```

Salida esperada:

```
Conexión SMTP OK.
Email enviado a cuenta@gmail.com. messageId=<...@gmail.com>
```

### Diagnóstico

| Error                       | Causa probable                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| `535` / `Invalid login`     | App Password mal copiado o 2FA sin activar                       |
| `Connection timeout` en 587 | Red/ISP bloqueando SMTP saliente (probar 465 con `secure: true`) |
| `From` address rejected     | `SMTP_FROM` distinto de `SMTP_USER`                              |

### Límites de Gmail

- ~500 destinatarios/día en cuentas personales (~2000 en Workspace).
- Credencial estática (App Password) sin rotación automática.
- Sin webhooks de rebote ni métricas de entrega.
- Deliverability dependiente de la reputación de la cuenta.

### ¿Aplica la política de Google Workspace?

El artículo de Google "Send email from a printer, scanner, or app" está dirigido a **administradores de Google Workspace**. No aplica tal cual a una cuenta personal `@gmail.com`, porque no existe Admin console, SMTP relay ni allowlist de IPs.

Matices:

- El cambio de mayo de 2025 elimina las **"less secure apps"** (usuario + contraseña) en Workspace; **no elimina las App Passwords**, que siguen vigentes y requieren 2FA. Para Gmail personal también siguen funcionando.
- La **Opción 2** del artículo (`smtp.gmail.com`, puerto 587 con TLS y App Password) es exactamente la implementación actual y funciona igual en Gmail personal.
- La **Opción 1** (SMTP relay, `smtp-relay.gmail.com`) y la **Opción 3** (restricted, `aspmx.l.google.com`) son exclusivas de Google Workspace.

## Producción con dominio propio y cuenta dedicada

Escenario previsto: dominio propio y una cuenta específica para la aplicación (por ejemplo, `notificaciones@kendoargentina.org.ar`).

### Recomendaciones

1. Usar una **cuenta dedicada**, no la personal de un directivo: facilita la rotación de credenciales y la auditoría.
2. `SMTP_FROM` debe usar esa cuenta y el dominio propio, y coincidir con la identidad autorizada en SPF/DKIM.
3. Configurar **SPF, DKIM y DMARC** del dominio (los registros que indique Google Workspace o el proveedor elegido).
4. No mezclar remitentes: si la app envía como `notificaciones@...`, ese buzón debe existir y estar autorizado.

### Vías de envío

| Vía                             | Host / puerto                          | Auth                         | Límite                               | Cuándo usarla                                            |
| ------------------------------- | -------------------------------------- | ---------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Google Workspace + App Password | `smtp.gmail.com` / 587                 | usuario + App Password (2FA) | 2.000/día                            | Puesta en marcha simple, sin cambios de código           |
| Google Workspace SMTP relay     | `smtp-relay.gmail.com` / 25, 465 o 587 | por IP o SMTP AUTH           | 10.000 destinatarios/día por usuario | Recomendada por Google para apps; requiere Admin console |
| Proveedor transaccional         | host del proveedor / 465 o 587         | API key / SMTP AUTH          | Según plan                           | Producción con alto volumen, rebotes y métricas          |

La implementación actual soporta las tres sin cambios de código: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (si se omite se infiere de 465), `SMTP_REQUIRE_TLS`, y `SMTP_USER`/`SMTP_PASSWORD` opcionales (para relays que autentican por IP). Si no se define `SMTP_FROM`, se usa `SMTP_USER` como remitente.

> **Nota:** una App Password sobre una cuenta de Workspace requiere que el administrador permita su uso y que la cuenta tenga 2FA. Si la organización exige OAuth, la alternativa es la Gmail API con XOAUTH2 o un proveedor transaccional.

## ¿Es la opción más moderna?

No. El SMTP de Gmail con App Password es la vía de compatibilidad que Google mantiene para aplicaciones que no implementan OAuth 2.0. Funciona y es adecuada para pruebas, pero no es la recomendación para producción.

| Opción                                                           | Uso recomendado     | Ventajas                                                              | Limitaciones                                     |
| ---------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------ |
| Gmail SMTP + App Password                                        | Pruebas / staging   | Simple, sin costo, ya implementado                                    | Límite diario, credencial estática, sin métricas |
| Gmail API + OAuth2 (XOAUTH2)                                     | Enviar "como" Gmail | Estándar moderno de Google, sin App Password                          | Flujo OAuth, refresh tokens, consentimiento      |
| Proveedor transaccional (Resend, Brevo, Postmark, SES, SendGrid) | Producción          | Dominio verificado (SPF/DKIM/DMARC), webhooks de rebote, logs, escala | Costo por volumen, requiere verificar dominio    |

**Recomendación:** mantener Gmail SMTP para desarrollo y pruebas, y migrar a un proveedor transaccional en producción. La migración no toca el dominio de la aplicación: `NotificacionesService` y los templates quedan igual; solo cambian las variables de entorno o se agrega un transporte por API en `notificaciones.module.ts`.

> **Seguridad:** una App Password es una credencial sensible. No debe commitearse (`.env` está gitignoreado) y conviene revocarla/regenerarla si se compartió por un canal inseguro.
