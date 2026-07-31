# Especificación Técnica — Iteración 11: Desafiliación y Afiliación (Transferencia de Asociación)

> **Estado:** Implementado
> **Commit:** `07b20fb`
> **Fuente:** `docs/requerimiento.md` §4 (rol Admin de Asociación) — "También debe poder solicitar la desafiliación de socios. Si el socio la solicita debe ser automático en informar a la asociación y a federación. Si la asociación solicita la baja debe aprobar la federación antes. Si otra asociación solicita el alta, o admite alta solicitada por el usuario debe informar a federación y dar alta automática".

## 0. Decisiones de diseño (confirmadas)

1. **Estado `DESAFILIADO`:** nuevo valor en `EstadoRegistro`. El usuario conserva `asociacion_id`/`dojo_id` de su última asociación (no se vuelven nullable); no aparece en los listados de miembros (filtran `estado_reg = APROBADO`) ni en pendientes.
2. **Login restringido:** `DESAFILIADO` **puede iniciar sesión** pero con dashboard reducido: solo "Mi Perfil" + "Solicitar Afiliación" (necesario para poder reafiliarse). No puede inscribirse a eventos ni pagar cuota.
3. **Baja iniciada por la asociación:** no requiere consentimiento del socio; requiere aprobación de la federación.
4. **Transferencia en dos pasos:** el usuario queda `DESAFILIADO` (por pedido propio o por la asociación) y luego solicita alta en otra asociación, que lo admite. La federación es notificada en cada paso.
5. **Federación informada:** se agrega `ConfigSistema.fak_email` con valor por defecto `presidente@kendoargentina.org`, editable desde la UI (AdminConfig → "Email de la federación"). Si está configurado, se le envían emails a ese destinatario. En la app, la federación ve los flujos en sus listados (`pendientes-baja`, `desafiliados`) y en el módulo de auditoría existente.
6. **Al desafiliar, el rol se fuerza a `BASICO`:** el usuario conserva `asociacion_id` apuntando a su ex-asociación (decisión 1). Si era `ADMIN_ASOCIACION` de esa asociación, sin este cambio seguiría accediendo a los endpoints administrativos de la misma aun sin ser socio. Se setea `rol = BASICO` como quita de privilegios, no como castigo: si ya era `BASICO` es un no-op, y la federación puede restaurarle `ADMIN_ASOCIACION` luego del alta con el endpoint existente `PATCH /usuarios/:id/rol`. Los `ADMIN_GENERAL` no participan de este flujo (viven en `AdminGeneral`, no en `Usuario`).
7. **`estado_pago` se conserva** en alta/baja: la cuota es federativa anual, no de la asociación. La reactivación a `APROBADO` en el alta no exige nuevo pago.

## 1. Modelos de Base de Datos

```prisma
enum EstadoRegistro {
  PENDIENTE_APROBACION
  APROBADO
  RECHAZADO
  DESAFILIADO
}

model SolicitudAfiliacion {
  id             Int      @id @default(autoincrement())
  tipo           String   // BAJA_SOCIO | BAJA_ASOCIACION | ALTA_SOCIO | ALTA_ASOCIACION
  usuario_id     Int
  estado         String   @default("PENDIENTE") // PENDIENTE | APROBADO | RECHAZADO
  asociacion_id  Int?     // destino en altas; null en bajas
  dojo_id        Int?     // destino en altas; null en bajas
  motivo         String?
  resuelto_por   Int?     // Usuario.id que resolvió; 0 = federación (sin FK, igual que AuditLog)
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt
  usuario        Usuario  @relation(fields: [usuario_id], references: [id])

  @@index([usuario_id])
  @@index([tipo, estado])
  @@map("solicitudafiliacion")
}
```

En `Usuario`:
```prisma
solicitudes_afiliacion SolicitudAfiliacion[]
```

En `ConfigSistema`:
```prisma
fak_email String?   // default "presidente@kendoargentina.org"
```

> `resuelto_por` no usa FK porque la federación (`AdminGeneral`) es tabla aparte; el `0` sigue la convención existente del ID 0 de la federación. Aplicar con `npx prisma db push`.

## 2. Endpoints (nuevo módulo `AfiliacionesModule`)

| Método | Endpoint | Guard | Descripción |
|---|---|---|---|
| `POST` | `/afiliaciones/baja` | Autenticado (estado APROBADO) | Socio solicita su propia baja. **Automática e inmediata** → `DESAFILIADO`. Body `{ motivo? }` |
| `POST` | `/afiliaciones/baja/:usuarioId` | `ADMIN_ASOCIACION` (misma asoc.) | Asociación solicita baja de un socio → solicitud `PENDIENTE` |
| `GET` | `/afiliaciones/pendientes-baja` | `ADMIN_GENERAL` | Bajas solicitadas por asociaciones aguardando aprobación |
| `PATCH` | `/afiliaciones/baja/:id/aprobar` | `ADMIN_GENERAL` | Aprueba → usuario `DESAFILIADO`, rol `BASICO` |
| `PATCH` | `/afiliaciones/baja/:id/rechazar` | `ADMIN_GENERAL` | Rechaza → socio permanece `APROBADO`. Body `{ motivo? }` |
| `GET` | `/afiliaciones/desafiliados` | `ADMIN_ASOCIACION` | Lista usuarios `DESAFILIADO` (para alta directa) |
| `POST` | `/afiliaciones/alta/:usuarioId` | `ADMIN_ASOCIACION` | Alta directa de un desafiliado. **Automática**. Body `{ dojo_id, motivo? }` |
| `POST` | `/afiliaciones/alta` | Autenticado (estado DESAFILIADO) | Socio solicita alta. Body `{ asociacion_id, dojo_id, motivo? }` → `PENDIENTE` |
| `GET` | `/afiliaciones/pendientes-alta` | `ADMIN_ASOCIACION` | Altas solicitadas por usuarios hacia su asociación |
| `PATCH` | `/afiliaciones/alta/:id/aprobar` | `ADMIN_ASOCIACION` | Acepta → usuario pasa a esa asoc./dojo, `APROBADO` |
| `PATCH` | `/afiliaciones/alta/:id/rechazar` | `ADMIN_ASOCIACION` | Rechaza → usuario sigue `DESAFILIADO` |
| `GET` | `/afiliaciones/mis-solicitudes` | Autenticado | Historial de solicitudes propias (bajas y altas) |

**Validaciones clave:**
- Baja propia: requiere `estado_reg = APROBADO`.
- Baja por asociación: el admin debe pertenecer a la misma asociación que el usuario (patrón `updateAprobacion`, `usuarios.service.ts:145`); el usuario debe estar `APROBADO`.
- Alta por socio: requiere `DESAFILIADO`; validar que el `dojo_id` pertenezca a la `asociacion_id` destino.
- Alta directa: el admin solo puede admitir dentro de su propia asociación y con un dojo de esa asociación.
- Cruce de asociaciones → `403`.

**Efecto de una baja efectiva (cualquier origen):** `estado_reg = DESAFILIADO`, `rol = BASICO`, se conservan `asociacion_id`, `dojo_id`, `estado_pago`, graduaciones e historial. El login sigue funcionando (no se bloquea).

**Efecto de un alta efectiva:** `asociacion_id = destino`, `dojo_id = destino`, `estado_reg = APROBADO`. Se conserva `estado_pago`.

## 3. Cambios en lógica existente

- **`src/pagos/mercado-pago.controller.ts` (~:36):** `checkout-fee` debe rechazar `DESAFILIADO` con `403` (hoy solo bloquea `PENDIENTE_APROBACION`; `DESAFILIADO` pasaría). El chequeo de inscripción (`eventos.service.ts:253`, `estado_reg !== APROBADO`) ya excluye a los desafiliados — sin cambios.
- **`src/auth/auth.service.ts` (`login` y `adminLogin`):** agregar `estado_reg` al payload del JWT para que el frontend pueda restringir el dashboard. `DESAFILIADO` no se bloquea en login (a diferencia de `PENDIENTE`/`RECHAZADO`).
- **Auditoría:** no requiere cambios — el middleware `$extends` ya registra los `update` de `Usuario` y `create/update` de `SolicitudAfiliacion`.

## 4. Notificaciones

Nuevos métodos en `NotificacionesService` + templates `src/notificaciones/templates/*.html`:
- `baja-solicitada.html` → a federación (`fak_email`) cuando la asociación solicita una baja.
- `baja-confirmada.html` → al socio cuando su baja es efectiva (propia o aprobada).
- `baja-rechazada.html` → al/los admin(s) de la asociación cuando la federación rechaza.
- `baja-informada-asociacion.html` → a la asociación cuando un socio se auto-desafilia.
- `baja-informada-federacion.html` → a federación (`fak_email`) cuando un socio se auto-desafilia.
- `alta-solicitada.html` → a la asociación destino cuando un usuario pide alta.
- `alta-confirmada.html` → al socio cuando su alta es efectiva.
- `alta-informada-federacion.html` → a federación (`fak_email`) en cada alta efectiva.

Helper `getAdminsAsociacion(asociacionId)` para resolver emails de los `ADMIN_ASOCIACION` (los emails de `Usuario`). Mantener el patrón actual: el fallo de envío se loguea y no propaga; sin SMTP, modo silencioso.

## 5. Frontend

- **`context/AuthContext.tsx` + interfaz `User`:** agregar `estado_reg`.
- **`routes/Dashboard.tsx`:** si `user.estado_reg === 'DESAFILIADO'`, el sidebar muestra solo "Mi Perfil" y "Solicitar Afiliación", y cualquier otra ruta redirige a `/dashboard/perfil`. Nuevos ítems: "Solicitar Afiliación" `/dashboard/afiliacion` (DESAFILIADO), "Afiliaciones" `/dashboard/afiliaciones` (`ADMIN_ASOCIACION`), "Bajas Pendientes" `/dashboard/bajas` (`ADMIN_GENERAL`).
- **`routes/Perfil.tsx`:** botón "Solicitar desafiliación" (solo si `APROBADO`) con `ConfirmModal`; banner de estado si está desafiliado.
- **`routes/Afiliacion.tsx` (nuevo, DESAFILIADO):** estado actual + form asociación/dojo (con selectores) → `POST /afiliaciones/alta`; historial de `mis-solicitudes`.
- **`routes/AfiliacionesAdmin.tsx` (nuevo, `ADMIN_ASOCIACION`):** tabs "Altas pendientes" (aprobar/rechazar), "Admitir desafiliado" (lista + dojo + admitir), "Solicitudes de baja" (estado).
- **`routes/BajasAdmin.tsx` (nuevo, `ADMIN_GENERAL`):** bajas pendientes con aprobar/rechazar; lista de desafiliados (opcional).
- **`routes/Usuarios.tsx`:** acción por fila "Solicitar baja" (admin de asociación).
- **`routes/AdminConfig.tsx`:** campo "Email de la federación" (`fak_email`) en la sección de configuración.

## 6. Archivos del módulo

**Backend:** `prisma/schema.prisma`, `src/afiliaciones/{afiliaciones.module,afiliaciones.controller,afiliaciones.service}.ts`, `src/afiliaciones/dto/*.ts`, `src/auth/auth.service.ts`, `src/pagos/mercado-pago.controller.ts`, `src/notificaciones/notificaciones.service.ts` + `templates/*.html`, `src/app.module.ts`.

**Frontend:** `context/AuthContext.tsx`, `routes/Dashboard.tsx`, `routes/Perfil.tsx`, `routes/Afiliacion.tsx` (nuevo), `routes/AfiliacionesAdmin.tsx` (nuevo), `routes/BajasAdmin.tsx` (nuevo), `routes/Usuarios.tsx`, `routes/AdminConfig.tsx`.

**Tests:** `test/afiliaciones.e2e-spec.ts` (nuevo).

## 7. Criterios de Aceptación (DoD)

- [ ] El socio puede solicitar su propia baja; queda `DESAFILIADO` automáticamente y se informa a asociación y federación.
- [ ] Un `DESAFILIADO` puede iniciar sesión con dashboard reducido (solo perfil + solicitar afiliación).
- [ ] Un `DESAFILIADO` no puede inscribirse a eventos ni generar checkout de cuota (403).
- [ ] La asociación puede solicitar la baja de un socio sin su consentimiento; queda pendiente de aprobación de la federación.
- [ ] La federación aprueba/rechaza la baja; al aprobar, el socio queda `DESAFILIADO` (rol forzado a `BASICO`).
- [ ] Un `DESAFILIADO` puede solicitar alta en otra asociación; la asociación destino la aprueba/rechaza.
- [ ] La asociación puede admitir directamente a un `DESAFILIADO` (alta automática, con dojo válido de su asociación).
- [ ] Al aprobarse un alta, el usuario queda `APROBADO` con la nueva asociación/dojo, conservando `estado_pago`, graduaciones e historial.
- [ ] Validaciones de cruce de asociaciones (403) y de dojo perteneciente a la asociación destino.
- [ ] Notificaciones por email en cada evento (baja solicitada/aprobada/rechazada, alta solicitada/aprobada), con fallo de envío no bloqueante.
- [ ] Mensajes de error en español formal (Usted).
- [ ] Tests E2E cubren los flujos principales.

## 8. Tests E2E (`test/afiliaciones.e2e-spec.ts`)

1. Socio solicita su baja → `DESAFILIADO`, solicitud `BAJA_SOCIO` registrada, rol `BASICO`.
2. Login de un `DESAFILIADO` → 200 con `estado_reg` en el token.
3. `DESAFILIADO` intenta inscribirse → 403/400.
4. `DESAFILIADO` intenta `checkout-fee` → 403.
5. Asociación solicita baja → `PENDIENTE`; federación aprueba → `DESAFILIADO`; se notifica al socio (spyOn).
6. Federación rechaza → socio sigue `APROBADO`, solicitud `RECHAZADO`.
7. Admin de otra asociación intenta baja de socio ajeno → 403.
8. `DESAFILIADO` solicita alta → `PENDIENTE`; asociación aprueba → `APROBADO` con nueva asoc/dojo, se informa a federación.
9. Asociación rechaza alta → sigue `DESAFILIADO`.
10. Alta directa por asociación → inmediata.
11. Usuario `APROBADO` intenta alta → 400 (solo `DESAFILIADO`).
12. Alta con dojo de otra asociación → 400.
