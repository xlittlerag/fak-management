# Plan de Pruebas - Iteración 3: Módulo de Pago de Cuota Federativa

## 1. Pruebas de Gestión de Cuota (Admin)

### 1.1 Configuración Inicial
```typescript
// Test: Admin General crea configuración de cuota por primera vez
POST /admin/fee
{
  monto_actual: 15000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z"
}
Response: 200 OK
{
  monto_actual: 15000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z",
  creado_en: "2026-06-19T10:00:00Z"
}
```

### 1.2 Actualización de Cuota
```typescript
// Test: Admin Actualiza la cuota
PATCH /admin/fee
{
  monto_actual: 16000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z"
}
Response: 200 OK
{
  monto_actual: 16000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z",
  actualizado_en: "2026-06-19T11:00:00Z"
}

// Test: Admin intenta actualizar sin fecha (debe fallar)
PATCH /admin/fee
{
  monto_actual: 16000.00
}
Response: 400 Bad Request
{
  statusCode: 400,
  message: "La fecha de vencimiento es obligatoria",
  error: "Bad Request"
}
```

### 1.3 Consulta de Configuración
```typescript
// Test: Usuario autenticado consulta estado de cuota
GET /usuarios/cuota
Headers: Authorization: Bearer <token>
Response: 200 OK
{
  monto_actual: 16000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z",
  usuario_tiene_pago: false,
  esta_vencida: true
}

// Test: Usuario con pago verificado
GET /usuarios/cuota
Response: 200 OK
{
  monto_actual: 16000.00,
  fecha_vencimiento: "2026-12-31T23:59:59Z",
  usuario_tiene_pago: true,
  esta_vencida: true
}
```

## 2. Pruebas de Generación de Checkout Preference

### 2.1 Checkout Preference para Usuario Activo
```typescript
// Test: Usuario genera preferencia de checkout para pagar
POST /pagos/checkout-fee
Headers: Authorization: Bearer <token>
Response: 200 OK
{
  preferenceId: "mp_test_1_1710000000",
  initPoint: "https://mercadopago.com/checkout/v1/preferences/mp_test_1",
  externalReference: "fee_user_1_ts_1710000000",
  paymentMethods: {
    excludedPaymentTypes: [{ id: "credit_card" }]
  }
}

// Validar: preferenceId existe
// Validar: initPoint es URL de Mercado Pago
// Validar: externalReference sigue el formato fee_user_<id>_ts_<timestamp>
// Validar: credit_card está excluida de paymentMethods
```

### 2.2 Checkout Preference Error Handling
```typescript
// Test: Usuario inactivo (PENDIENTE_APROBACION) intenta generar checkout
// Expected: 403 Forbidden con mensaje apropiado

// Test: Usuario sin sesión intenta generar checkout
// Expected: 401 Unauthorized
```

## 3. Pruebas de Webhook

### 3.1 Webhook Processing - Payment Approved
```typescript
// Test: Mercado Pago envía webhook de pago aprobado
POST /pagos/webhook
Body:
{
  action: "payment.updated",
  data: {
    id: 1234567890,
    status: "approved",
    external_reference: "fee_user_1_ts_1710000000",
    date_approved: "2026-06-19T12:00:00Z"
  }
}
Response: 200 OK
{
  received: true,
  processed: true,
  userId: 1,
  statusUpdated: true
}

// Validar: usuario.estado_pago ahora es true
// Validar: usuario.estado_reg es "APROBADO" (si estaba pendiente)
// Validar: se registra log de "Payment approved for reference: fee_user_1_ts_..."
```

### 3.2 Webhook Processing - Pending Payment
```typescript
// Test: Webhook con estado pendiente (no debe actualizar nada)
POST /pagos/webhook
Body:
{
  action: "payment.updated",
  data: {
    id: 1234567891,
    status: "pending",
    external_reference: "fee_user_2_ts_1710000000"
  }
}
Response: 200 OK

// Validar: usuario.estado_pago permanece igual
```

### 3.3 Webhook Processing - Rejected Payment
```typescript
// Test: Webhook con estado rechazado
POST /pagos/webhook
Body:
{
  action: "payment.updated",
  data: {
    id: 1234567892,
    status: "rejected",
    external_reference: "fee_user_3_ts_1710000000"
  }
}
Response: 200 OK

// Validar: usuario.estado_pago permanece igual
```

### 3.4 Webhook Processing - Error Handling
```typescript
// Test: Webhook con usuario inexistente
POST /pagos/webhook
Body:
{
  action: "payment.updated",
  data: {
    id: 9999999999,
    status: "approved",
    external_reference: "fee_user_999_ts_1710000000"
  }
}
Response: 200 OK

// Validar: No lanza error
// Validar: se registra log de error
// Validar: responde 200 OK (Mercado Pago debe retry si hay error)
```

### 3.5 Webhook Processing - Invalid Signature
```typescript
// Test: Webhook sin signature válida
POST /pagos/webhook
Headers:
  X-Mercado-Pago-Request-Id: "test-123"
Body:
{
  action: "payment.created",
  data: { id: 1234567890 }
}
Response: 401 Unauthorized

// Validar: 401 si signature no coincide
```

## 4. Pruebas de Desactivación Automática

### 4.1 Usuario Inactivo por No Pagar
```typescript
// Setup:
// - Configurar fecha de vencimiento en pasado (ej: "2025-01-01")
// - Usuario con estado_pago = false
// - Usuario con estado_reg = "APROBADO"

// Test: Usuario accede al sistema después de la fecha de vencimiento
GET /usuarios/perfil
Headers: Authorization: Bearer <token>

// Validar:
// - usuario.estado_pago = false
// - usuario.estado_reg = "PENDIENTE_APROBACION"
// - No puede realizar operaciones que requieran estar activo
```

### 4.2 Usuario Activo Con Pago
```typescript
// Setup:
// - Configurar fecha de vencimiento en futuro (ej: "2026-12-31")
// - Usuario con estado_pago = true
// - Usuario con estado_reg = "APROBADO"

// Test: Usuario accede al sistema antes de la fecha de vencimiento
GET /usuarios/perfil
Headers: Authorization: Bearer <token>

// Validar:
// - usuario.estado_pago = true
// - usuario.estado_reg = "APROBADO"
// - Tiene todas las funcionalidades disponibles
```

## 5. Pruebas E2E Completas

### 5.1 Flujo Completo: Registro, Vencimiento, Pago, Reactivación
```typescript
1. Admin General configura cuota federativa
2. Nuevo usuario se registra (estado: PENDIENTE_APROBACION)
3. Usuario crea cuenta (estado: PENDIENTE_APROBACION)
4. Admin aprueba usuario (estado: APROBADO)
5. Se pasa la fecha de vencimiento sin pago (estado: PENDIENTE_APROBACION)
6. Usuario genera checkout preference y paga (a través de webhook)
7. Usuario se reactiva (estado: APROBADO, estado_pago: true)
```

### 5.2 Flujo: Múltiples Usuarios, Un Pago
```typescript
// Setup: 5 usuarios registrados y aprobados
// Configurar fecha de vencimiento hoy

// Test: Un usuario paga, los otros no
1. Usuario A genera checkout y paga (webhook approval)
2. Usuario A queda activo
3. Usuario B, C, D, E no pagan
4. Usuarios B, C, D, E quedan inactivos

// Test: Todos pagan
1. Todos generan checkout
2. Todos pagan (webhooks)
3. Todos quedan activos
```

## 6. Pruebas de Integración con Mercado Pago

### 6.1 SDK Integration Test
```typescript
// Test: Cliente de Mercado Pago se inicializa correctamente con ConfigService
// Test: Se puede crear preferencia con Preference.create({ body: { ... } })
// Test: Se genera initPoint con formato de URL de Mercado Pago
// Test: Se excluye credit_card de paymentMethods
```

### 6.2 Mock Testing
```typescript
// Test: Mock de Mercado Pago para no hacer llamadas reales
// - createFederativeFeePreference mock (jest.spyOn)
// - Webhook usa DB real, no mock
```

## 7. Pruebas de Seguridad

### 7.1 Acceso Controlado
```typescript
// Test: Usuario básico NO puede acceder a /admin/fee
GET /admin/fee
Headers: Authorization: Bearer <user_token>
Response: 403 Forbidden

// Test: Usuario inactivo NO puede acceder a /pagos/checkout-fee
POST /pagos/checkout-fee
Headers: Authorization: Bearer <inactive_user_token>
Response: 403 Forbidden
```

### 7.2 Webhook es @Public (sin JWT)
```typescript
// Test: Webhook funciona sin token de autenticación
POST /pagos/webhook
Body: { action: "payment.created", data: { id: 123 } }
Response: 200 OK

// Test: Webhook funciona incluso con token inválido
POST /pagos/webhook
Headers: Authorization: Bearer <fake-token>
Body: { action: "payment.created", data: { id: 123 } }
Response: 200 OK
```

## 8. Pruebas de Performance

### 8.1 Generación de QR
```typescript
// Test: QR generation debe completarse en < 2 segundos
// Test: Webhook processing debe completarse en < 500ms
```

## 9. Pruebas de Mensajes de Error

### 9.1 Mensajes en Español Formal
```typescript
// Test: Todos los mensajes de error están en "usted" (ej: "Debe configurar la fecha de vencimiento")
// Test: No hay mensajes en primera persona
```

## 10. Pruebas de Logs

### 10.1 Logging Adequado
```typescript
// Test: Webhook registra evento de payment.created
// Test: Webhook registra evento de payment.approved
// Test: QR generation registra referencia externa generada
```

## Estructura de Tests

Los tests se organizan por módulo, no por sprint:

| Archivo | Contenido |
| ------- | --------- |
| `test/pagos.e2e-spec.ts` | Checkout preference, webhook, seguridad, formato (9 tests) |
| `test/admin-features.e2e-spec.ts` | Configuración de cuota por admin (5 tests) |
| `test/auth.e2e-spec.ts` | Desactivación automática por falta de pago (1 test) |
| `test/perfil.e2e-spec.ts` | Consulta de estado de cuota (1 test) |

## Notas de Implementación

- Usar `supertest` para E2E tests
- Mock externo de Mercado Pago SDK con `jest.spyOn` (solo `createFederativeFeePreference`)
- Webhook usa DB real, no mock
- Usar `jest` con `ts-jest`
- Cada test limpia su estado via `beforeEach(cleanupDb)`
- Los tests deben verificar que no se haga logging de datos sensibles (password, tokens)
