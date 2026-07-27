# Iteración 10 — Modo Simulado para Mercado Pago (Test)

## Objetivo
Permitir probar el flujo de pagos en entorno de desarrollo/test sin depender de la API real de Mercado Pago, salteando el checkout modal que falla en sandbox por falta de URL pública para webhooks y por inconsistencia entre claves públicas/privadas de test.

## Cambios

### Backend

#### 1. Variable de entorno (`.env.example`)
```env
MERCADO_PAGO_SIMULATED=false
```
Al poner `true`, se activa el modo simulado.

#### 2. `src/pagos/mercado-pago.service.ts`
- **Getter `isSimulated`**: lee `MERCADO_PAGO_SIMULATED` del `ConfigService`.
- **Métodos de creación de preferencias** (`createFederativeFeePreference`, `createInscriptionPreference`, `createReimpresionPreference`):
  - Si `isSimulated === true`, **no llaman a la API de Mercado Pago**.
  - Devuelven un objeto mock con:
    ```ts
    {
      preferenceId: `sim_${externalReference}`,
      initPoint: 'https://simulacion.mercadopago.com/checkout/v1/preferences/sim',
      externalReference: '...',
      simulated: true,
      // paymentMethods solo en cuota federativa
    }
    ```
- **Nuevo método `simulatePayment(externalReference, status?)`**:
  - Valida que el modo simulado esté activo.
  - Solo procesa `status === 'approved'`.
  - Determina el tipo de pago por el prefijo de `externalReference`:
    - `fee_user_` → llama a `processFeePayment()`
    - `inscripcion_user_` → llama a `processInscriptionPayment()`
    - `reimpresion_user_` → llama a `processReimpresionPayment()`
  - Reusa la misma lógica de idempotencia y actualización de BD que el webhook real.

#### 3. `src/pagos/mercado-pago.controller.ts`
- **Nuevo endpoint `POST /api/pagos/simulate`** (decorado con `@Public()`):
  - Solo funciona si `MERCADO_PAGO_SIMULATED=true`.
  - Recibe `{ externalReference: string, status?: 'approved' | 'rejected' }`.
  - Llama a `mpService.simulatePayment()`.
  - Devuelve `{ success, processed, message }`.

### Frontend

En los **5 componentes** que renderizan el checkout de Mercado Pago:
- `Dashboard.tsx` (cuota federativa)
- `EventoDetalle.tsx` (inscripción desde detalle de evento)
- `EventosDashboard.tsx` (inscripción desde listado de eventos)
- `MisInscripciones.tsx` (inscripción desde mis inscripciones)
- `Perfil.tsx` (reimpresión de diploma)

**Cambio común en cada uno**:
1. Al recibir la respuesta de la preferencia, chequean `response.data.simulated`.
2. Si es `true`:
   - Guardan el `externalReference` en estado local (`simulatedPayment`).
   - **No inicializan `window.MercadoPago`**.
   - Renderizan un botón verde: **"Pagar en modo prueba (simulado)"**.
3. Al clickear ese botón:
   - Llaman a `POST /api/pagos/simulate` con el `externalReference`.
   - En éxito, actualizan el estado local (marcan `pagado: true`) y/o redirigen a `/pagos/exito`.

### Tests E2E

`test/pagos.e2e-spec.ts` — nueva suite `POST /pagos/simulate — modo simulado`:
- Simula pago de cuota federativa (`fee_user_`) → usuario queda `estado_pago: true`, `estado_reg: 'APROBADO'`.
- Simula pago de inscripción (`inscripcion_user_`) → inscripción queda `pagado: true`, `estado_aprob: 'APROBADO'`.
- Simula pago de reimpresión (`reimpresion_user_`) → reimpresión queda `pagado: true`, `mp_payment_id` con prefijo `sim_`.
- Rechaza `externalReference` inválido → `{ success: false, processed: false, message: 'Referencia externa inválida' }`.
- Rechaza request sin `externalReference` → 403.
- (El test de "modo simulado desactivado" se omite porque la variable se lee al bootstrap de la app).

## Cómo usar en desarrollo

1. En `.env` (raíz del repo):
   ```env
   MERCADO_PAGO_SIMULATED=true
   MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxx  # cualquier token de test
   ```
2. Reiniciar backend (`pnpm run start:dev`).
3. En el frontend, al ir a pagar cuota / inscripción / reimpresión:
   - Aparece botón **"Pagar en modo prueba (simulado)"** en vez del botón de Mercado Pago.
   - Click → pago aprobado instantáneo → redirige a éxito.

## Notas
- No requiere claves públicas de test (`TEST-...`) en el frontend; la public key de prod (`APP_USR-...`) puede quedarse en `VITE_MERCADO_PAGO_PUBLIC_KEY` porque **no se usa** cuando `simulated: true`.
- El endpoint `/api/pagos/simulate` es `@Public()` pero **solo responde 200 si la env var está en true**; si está en false devuelve 403.
- Idempotencia: el `simulatePayment` genera un `paymentId` falso tipo `sim_${Date.now()}` y pasa por el mismo `processedPayments Set` que el webhook real.