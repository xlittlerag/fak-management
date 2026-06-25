# Plan de Pruebas - Iteración 1: API Estática Base

## 1. Pruebas de Asociaciones (`/asociaciones`)

### 1.1 Listado público
```typescript
// Test: GET /asociaciones retorna lista sin requerir token
GET /asociaciones
Response: 200 OK
```
- No requiere autenticación.
- Retorna array de asociaciones.

### 1.2 Creación (solo Admin General)
```typescript
// Test: POST /asociaciones con rol ADMIN_GENERAL
POST /asociaciones
Authorization: Bearer <token_admin_general>
Body: { nombre: "Asociación de Prueba" }
Response: 201 Created

// Test: POST /asociaciones sin rol ADMIN_GENERAL
POST /asociaciones
Authorization: Bearer <token_basico>
Response: 403 Forbidden
```

### 1.3 Actualización
```typescript
// Test: PATCH /asociaciones/:id solo ADMIN_GENERAL
PATCH /asociaciones/1
Authorization: Bearer <token_admin_general>
Body: { nombre: "Nuevo Nombre" }
Response: 200 OK
```

### 1.4 Eliminación (soft-delete)
```typescript
// Test: DELETE /asociaciones/:id solo ADMIN_GENERAL
DELETE /asociaciones/1
Authorization: Bearer <token_admin_general>
Response: 200 OK
// Verificar en DB que el registro tiene deleted_at != null
```

## 2. Pruebas de Autenticación y Registro (`/auth`)

### 2.1 Registro de usuario
```typescript
// Test: POST /auth/register con datos válidos
POST /auth/register
Body: { dni, email, password, nombre, apellido, ... }
Response: 201 Created
// Verificar en DB: rol BASICO, estado PENDIENTE_APROBACION, graduaciones SIN_GRADUACION

// Test: POST /auth/register con DNI duplicado
Response: 409 Conflict

// Test: POST /auth/register con email duplicado
Response: 409 Conflict
```

### 2.2 Inicio de sesión
```typescript
// Test: POST /auth/login con credenciales inválidas
Response: 401 Unauthorized

// Test: POST /auth/login con usuario PENDIENTE_APROBACION
Response: 403 Forbidden + mensaje explicativo

// Test: POST /auth/login con credenciales válidas y usuario APROBADO
Response: 200 OK + JWT token
```

## 3. Pruebas de Aprobación de Usuarios (`/usuarios`)

### 3.1 Listado de pendientes
```typescript
// Test: GET /usuarios/pendientes como ADMIN_ASOCIACION
// Solo debe retornar usuarios de su misma asociación con estado PENDIENTE_APROBACION
Response: 200 OK

// Test: GET /usuarios/pendientes como ADMIN_GENERAL
// Debe retornar todos los usuarios pendientes del sistema
Response: 200 OK
```

### 3.2 Aprobación/Rechazo
```typescript
// Test: PATCH /usuarios/:id/aprobacion cruzando asociaciones
// ADMIN_ASOCIACION de A intenta aprobar usuario de B
Response: 403 Forbidden

// Test: PATCH /usuarios/:id/aprobacion exitoso
Response: 200 OK
// Verificar en DB: estado cambiado a APROBADO
```

## 4. Pruebas de Roles y Guardias

- Rutas protegidas con JwtAuthGuard retornan 401 sin token.
- RolesGuard implementado (no-op actual) no interfiere con JwtAuthGuard.
- Rutas públicas (`@Public()`) accesibles sin autenticación.

## Estructura de Tests

- `test/auth.e2e-spec.ts` — Suite de autenticación y registro.
- `test/asociaciones.e2e-spec.ts` — CRUD de asociaciones.
- `test/usuarios.e2e-spec.ts` — Aprobación y gestión de usuarios.

## Notas de Implementación

- Usar `createTestApp()` para bootstrap del módulo de pruebas.
- `beforeEach(cleanupDb)` para limpiar tablas en orden FK inverso.
- Insertar datos de prueba reales mediante el ORM (Prisma).
- Usar `jest.spyOn` solo para mocks de servicios externos si es necesario.
