# Especificación Técnica - Iteración 3: Módulo de Pago de Cuota Federativa

## 🎯 Objetivo

Implementar el módulo de control de cuota federativa anual con integración a Mercado Pago Checkout Pro, incluyendo configuración por administrador general, visualización por usuarios, y desactivación automática cuando no se paga la cuota antes de la fecha de vencimiento.

## 1. Endpoints de Gestión de Cuota (Admin General)

| Método   | Endpoint                        | Descripción                                        | Acceso (Guards)    |
| -------- | --------------------------------| -------------------------------------------------- | ------------------ |
| `GET`    | `/admin/fee`                    | Obtiene configuración actual de cuota federativa.  | `ADMIN_GENERAL`    |
| `PATCH`  | `/admin/fee`                    | Actualiza monto y fecha de vencimiento de cuota.  | `ADMIN_GENERAL`    |

**Reglas de Negocio:**
- `estado_pago` se usa para rastrear el estado de pago del año en curso
- `fecha_vencimiento` define la fecha límite para que el usuario mantenga estado activo
- Si un usuario no paga antes de la fecha de vencimiento, su `estado_reg` se actualiza a `PENDIENTE_APROBACION` automáticamente al hacer login

**Implementación:**
- `FeeConfigService` (`src/pagos/fee-config.service.ts`) encapsula las consultas SQL a `cuotaglobal`
- `AdminFeeController` (`src/pagos/admin-fee.controller.ts`) delega en `FeeConfigService`

## 2. Endpoints de Consulta de Cuota (Usuarios)

| Método | Endpoint                       | Descripción                                    | Acceso (Guards) |
| ------ | ------------------------------ | ---------------------------------------------- | --------------- |
| `GET`  | `/usuarios/cuota`              | Obtiene estado actual de la cuota federativa.  | Autenticado     |

**Reglas de Negocio:**
- Todos los usuarios ven el mismo monto configurado por el administrador general
- Los usuarios pueden ver si tienen `estado_pago = true` o `false`
- El endpoint debe verificar si la fecha actual ha superado la fecha de vencimiento
- El endpoint retorna 4 campos: `monto_actual`, `fecha_vencimiento`, `usuario_tiene_pago`, `esta_vencida`

## 3. Integración con Mercado Pago (Checkout Pro)

### 3.1 Endpoints de Pago

| Método | Endpoint                       | Descripción                                                 | Acceso (Guards) |
| ------ | ------------------------------ | ----------------------------------------------------------- | --------------- |
| `POST` | `/pagos/checkout-fee`          | Genera preferencia de checkout para pagar cuota federativa. | Autenticado     |
| `POST` | `/pagos/webhook`               | Recibe notificaciones de pagos desde Mercado Pago.          | `@Public()`     |

### 3.2 Flujo de Pago (Checkout Pro)

1. **Generación de preferencia:** El usuario solicita el checkout con `POST /pagos/checkout-fee` → Backend llama a `Preference.create()` de la SDK de Mercado Pago → Retorna `preferenceId` e `initPoint`
2. **Redirección:** El frontend usa el `preferenceId` con el botón de checkout.js o redirige al usuario a `initPoint` (sitio de Mercado Pago)
3. **Pago:** Usuario completa el pago en el sitio de Mercado Pago
4. **Webhook:** Mercado Pago envía `action: payment.created` o `payment.updated` al endpoint `/pagos/webhook`
5. **Procesamiento:** Backend verifica si el `external_reference` corresponde a un usuario y si el estado es `approved`
6. **Actualización:** Si se aprueba, se actualiza `estado_pago = true` y `estado_reg = APROBADO`

### 3.3 Referencia Externa

Formato: `fee_user_<userId>_ts_<timestamp>`

- **userId:** ID del usuario en la base de datos
- **timestamp:** Hora actual para evitar referencias duplicadas

### 3.4 Mapeo de Estados

| Estado Mercado Pago | Acción en Backend |
| ------------------- | ----------------- |
| `approved`          | `estado_pago = true`, `estado_reg = APROBADO` |
| `pending`           | Mantener estado actual |
| `rejected`          | Mantener estado actual |

### 3.5 Métodos de Pago Excluidos

Se excluyen tarjetas de crédito (`credit_card`) para limitar los métodos a efectivo y alternativos según lo definido en la preferencia de checkout.

## 4. Desactivación Automática de Usuarios

### 4.1 Regla de Desactivación Automática

Cada vez que un usuario inicia sesión:
1. Si la fecha actual > `fecha_vencimiento`:
   - Si `estado_pago = false`: Desactivar (`estado_reg = PENDIENTE_APROBACION`), login bloqueado con 403
   - Si `estado_pago = true`: Mantener activo

**Implementación:** La lógica está en `AuthService.login()` (`src/auth/auth.service.ts`), no en un proceso batch.

### 4.2 Regla de Activación

Cuando el usuario aprueba el pago (a través del webhook):
- `estado_pago = true`
- `estado_reg = APROBADO`

## 5. Criterios de Aceptación (DoD)

- [x] Admin General puede establecer monto y fecha de vencimiento de la cuota federativa
- [x] Todos los usuarios pueden consultar el estado de su cuota
- [x] Los usuarios obtienen una preferencia de checkout de Mercado Pago para pagar
- [x] El webhook de Mercado Pago procesa correctamente pagos aprobados
- [x] Los usuarios sin pago (por encima de la fecha de vencimiento) se desactivan automáticamente al iniciar sesión
- [x] Los usuarios que pagan se reactivan correctamente
- [x] Los mensajes de error están en español formal (Usted)
- [x] Las pruebas E2E cubren todos los flujos principales (9 tests en `pagos.e2e-spec.ts`, 5 en `admin-features.e2e-spec.ts`, 1 en `auth.e2e-spec.ts`, 1 en `perfil.e2e-spec.ts`)
- [x] El módulo de pago está encapsulado en `PagosModule` y `PagosAdminModule`

## 6. Modelos de Base de Datos Modificados

### `CuotaGlobal` (ya existe, mapeada con `@@map("cuotaglobal")`)
- `monto_actual`: Float (monto de la cuota federativa)
- `fecha_vencimiento`: DateTime (fecha límite para pago)

### `Usuario` (ya existe, se usa campo existente)
- `estado_pago`: Boolean (indica si el usuario pagó la cuota del año en curso)

---

## Notas Técnicas

- **Checkout Pro vs QR:** Se eligió Checkout Pro (preferenceId + initPoint) sobre QR porque es el flujo estándar de Mercado Pago para pagos en línea; el frontend redirige al usuario al sitio de Mercado Pago.
- **Integración Local:** El webhook debe funcionar en desarrollo con túnel (ngrok).
- **Testing:** Usar Mercado Pago access token de test (`TEST-xxxx`).
- **Variables de entorno:** `MERCADO_PAGO_ACCESS_TOKEN` y `APP_URL` se inyectan vía `ConfigService` de NestJS.
- **Seguridad:** Webhook es `@Public()` pero debe verificar `external_reference` antes de actualizar datos.
- **SDK:** `mercadopago` v3.1.0, `Preference.create({ body: { ... } })` para checkout.
