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

  async sendWelcomeEmail(to: string, nombre: string): Promise<void>
  async sendPasswordResetEmail(to: string, nombre: string, codigo: string): Promise<void>
  async sendInscripcionStatusEmail(to: string, nombre: string, evento: string, estado: string): Promise<void>
  async sendCertificacionStatusEmail(to: string, nombre: string, disciplina: string, estado: string): Promise<void>
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
<p>Su registro en el sistema de la Federación Argentina de Kendo ha sido recibido y está pendiente de aprobación por su asociación.</p>
```

## Casos de Uso (Pruebas E2E)

1. **Registro de usuario** → se invoca `sendWelcomeEmail` con el email y nombre del usuario
2. **Solicitud de reseteo de contraseña** → se invoca `sendPasswordResetEmail`
3. **Aprobación de inscripción** → se invoca `sendInscripcionStatusEmail` con estado APROBADO
4. **Rechazo de inscripción** → se invoca `sendInscripcionStatusEmail` con estado RECHAZADO
5. **Sin configuración SMTP** → el servicio no falla, no envía email, loguea warn
6. **Error de envío (SMTP caído)** → el servicio loguea el error, el flujo principal continúa

## Criterios de Aceptación (DoD)

- [ ] `NotificacionesService` se inyecta correctamente y envía emails via nodemailer
- [ ] Los métodos `sendWelcomeEmail`, `sendPasswordResetEmail`, `sendInscripcionStatusEmail` y `sendCertificacionStatusEmail` envían HTML bien formado
- [ ] Al registrarse un usuario, se invoca `sendWelcomeEmail`
- [ ] Al aprobar/rechazar una inscripción, se invoca `sendInscripcionStatusEmail`
- [ ] Al cambiar estado de certificación, se invoca `sendCertificacionStatusEmail`
- [ ] Si SMTP no está configurado, el servicio funciona en modo silencioso
- [ ] Si el envío falla, el error se loguea pero no se propaga al usuario
- [ ] Variables SMTP documentadas en `.env.example`
- [ ] Tests E2E con nodemailer mockeado
