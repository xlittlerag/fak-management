# Plan de Pruebas - Módulo de Eventos e Inscripciones

## 1. Pruebas de Gestión de Eventos (Admin General)

### 1.1 Creación de Evento

```typescript
// Test: Crear torneo con categorías
POST /eventos
Headers: Authorization: Bearer <admin_general_token>
Body: {
  tipo: "TORNEO",
  fecha_inicio: "2026-08-15",
  fecha_fin: "2026-08-16",
  datos_lugar: { direccion: "Polideportivo Almirante Brown", provincia: "BUENOS_AIRES" },
  disciplina: "KENDO",
  costo_inscripcion: 5000,
  categorias: [
    { nombre: "Infantil", grad_min: "KYU_3", grad_max: "KYU_1", genero: "MIXTO", edad_max: 11 }
  ]
}
Response: 201 Created

// Test: Rechazar creación sin rol ADMIN_GENERAL
POST /eventos
Headers: Authorization: Bearer <basico_token>
Response: 403 Forbidden
```

### 1.2 Lectura de Eventos

```typescript
// Test: Usuario no autenticado ve eventos públicos
GET /eventos
Response: 200 OK
// Solo retorna eventos con publicado = true

// Test: Admin General ve todos los eventos (incluyendo borradores)
GET /eventos?all=true
Headers: Authorization: Bearer <admin_general_token>
Response: 200 OK
// Retorna todos los eventos
```

### 1.3 Actualización y Eliminación

```typescript
// Test: Actualizar evento
PATCH /eventos/:id
Headers: Authorization: Bearer <admin_general_token>
Response: 200 OK

// Test: Eliminar evento
DELETE /eventos/:id
Headers: Authorization: Bearer <admin_general_token>
Response: 200 OK
```

## 2. Pruebas de Inscripción

### 2.1 Inscripción Exitosa

```typescript
// Test: Usuario activo se inscribe en evento (1 categoría)
POST /eventos/:id/inscribir
Headers: Authorization: Bearer <activo_token>
Body: { categorias: ["Junior"] }
Response: 200 OK
// estado_aprob = PENDIENTE, categorias = ["Junior"]

// Test: Usuario activo se inscribe en múltiples categorías
POST /eventos/:id/inscribir
Headers: Authorization: Bearer <activo_token>
Body: { categorias: ["Kyu Masculino", "Equipos Masculino"] }
Response: 200 OK
// estado_aprob = PENDIENTE, categorias = ["Kyu Masculino", "Equipos Masculino"]
```

### 2.2 Validaciones de Inscripción

```typescript
// Test: Usuario sin cuota al día no puede inscribirse
POST /eventos/:id/inscribir
Headers: Authorization: Bearer <inactivo_token>
Response: 403 Forbidden

// Test: Inscripción duplicada
POST /eventos/:id/inscribir
Headers: Authorization: Bearer <ya_inscripto_token>
Response: 409 Conflict

// Test: Categoría inválida (no existe en el evento)
POST /eventos/:id/inscribir
Body: { categorias: ["Inexistente"] }
Response: 400 Bad Request

// Test: Una categoría no corresponde a la graduación del usuario
POST /eventos/:id/inscribir
Body: { categorias: ["Dan Masculino 1er y 2do Dan"] } // usuario es KYU_1
Response: 400 Bad Request
```

### 2.3 Sexo Registral X

```typescript
// Test: Usuario con sexo X se inscribe en categoría masculina
POST /eventos/:id/inscribir
Body: { categorias: ["Kyu Masculino"] }
Response: 200 OK

// Test: Usuario con sexo X intenta inscribirse en categoría femenina
POST /eventos/:id/inscribir
Body: { categorias: ["Kyu Femenino"] }
Response: 400 Bad Request
```

## 3. Pruebas de Aprobación de Inscripción

```typescript
// Test: Admin de asociación aprueba inscripción de su asociación
PATCH /inscripciones/:id/aprobar
Body: { accion: "APROBAR" }
Headers: Authorization: Bearer <admin_asoc_token>
Response: 200 OK

// Test: Admin de asociación rechaza inscripción
PATCH /inscripciones/:id/aprobar
Body: { accion: "RECHAZAR" }
Headers: Authorization: Bearer <admin_asoc_token>
Response: 200 OK

// Test: Admin de asociación no puede aprobar inscripción de otra asociación
PATCH /inscripciones/:id/aprobar
Headers: Authorization: Bearer <admin_otra_asoc_token>
Response: 403 Forbidden
```

## 4. Pruebas de Pago de Inscripción

```typescript
// Test: Generar preferencia de pago para inscripción aprobada
POST /inscripciones/:id/pagar
Headers: Authorization: Bearer <usuario_token>
Response: 200 OK
// Retorna { preferenceId: "mp_..." } o { gratuito: true }

// Test: Rechazar pago si la inscripción no está aprobada
POST /inscripciones/:id/pagar
Headers: Authorization: Bearer <usuario_token>
// Inscripción en estado PENDIENTE
Response: 400 Bad Request
```

## 5. Pruebas de Consulta de Inscripciones

```typescript
// Test: Usuario lista sus inscripciones
GET /mis-inscripciones
Headers: Authorization: Bearer <usuario_token>
Response: 200 OK
// Lista de inscripciones del usuario

// Test: Admin lista inscripciones de un evento
GET /eventos/:id/inscripciones
Headers: Authorization: Bearer <admin_token>
Response: 200 OK
```

## 6. Pruebas de Validación Tipo-Dependiente

```typescript
// Test: Crear examen con disciplinas múltiples y graduaciones a rendir
POST /eventos
Body: { tipo: "EXAMEN", config: { disciplinas: ["KENDO", "IAIDO"], graduaciones_a_rendir: ["KYU_1", "DAN_1"] } }
Response: 201 Created

// Test: Rechazar examen sin disciplinas
POST /eventos
Body: { tipo: "EXAMEN", graduaciones_a_rendir: ["KYU_1"] }
Response: 400 Bad Request

// Test: Rechazar examen con costo_inscripcion (debe usar tabla PrecioExamen)
POST /eventos
Body: { tipo: "EXAMEN", disciplinas: ["KENDO"], graduaciones_a_rendir: ["KYU_1"], costo_inscripcion: 5000 }
Response: 400 Bad Request

// Test: Rechazar seminario con categorías
POST /eventos
Body: { tipo: "SEMINARIO", disciplina: "KENDO", costo_inscripcion: 0, categorias: [{ nombre: "Test" }] }
Response: 400 Bad Request

// Test: Rechazar inscripción múltiple en examen
POST /eventos
Body: { tipo: "EXAMEN", disciplinas: ["KENDO"], graduaciones_a_rendir: ["KYU_1"], inscripcion_multiple: true }
Response: 400 Bad Request
```

## 7. Pruebas de Precios de Exámenes

```typescript
// Test: Admin general crea precio de examen
POST /precios-examen
Headers: Authorization: Bearer <admin_general_token>
Body: { graduacion: "DAN_1", costo: 5000 }
Response: 201 Created

// Test: Rechazar precio duplicado
POST /precios-examen
Headers: Authorization: Bearer <admin_general_token>
Body: { graduacion: "DAN_1", costo: 6000 }
Response: 409 Conflict

// Test: Rechazar creación sin rol ADMIN_GENERAL
POST /precios-examen
Headers: Authorization: Bearer <basico_token>
Response: 403 Forbidden

// Test: Actualizar precio existente
PATCH /precios-examen/:id
Headers: Authorization: Bearer <admin_general_token>
Body: { costo: 5500 }
Response: 200 OK

// Test: Eliminar precio
DELETE /precios-examen/:id
Headers: Authorization: Bearer <admin_general_token>
Response: 200 OK
```

## 8. Pruebas de Requisitos de Examen

```typescript
// Test: Inscribir en KYU_3 sin requisito previo
POST /eventos/:id/inscribir
Body: { categorias: ["KYU_3"], disciplinas: ["KENDO"] }
// usuario: SIN_GRADUACION
Response: 200 OK

// Test: Rechazar inscripción si el usuario no tiene la graduación previa requerida
POST /eventos/:id/inscribir
Body: { categorias: ["KYU_2"], disciplinas: ["KENDO"] }
// usuario: SIN_GRADUACION (KYU_2 requires KYU_3 previa)
Response: 403 Forbidden

// Test: Rechazar inscripción si no se alcanzó el tiempo de espera mínimo
POST /eventos/:id/inscribir
Body: { categorias: ["DAN_1"], disciplinas: ["KENDO"] }
// usuario: KYU_1 con f_grad_kendo hace 1 mes (DAN_1 requiere 6 meses)
Response: 403 Forbidden

// Test: Rechazar inscripción si el usuario no cumple la edad mínima
POST /eventos/:id/inscribir
Body: { categorias: ["DAN_1"], disciplinas: ["KENDO"] }
// usuario: KYU_1, 12 años (DAN_1 requiere 13+)
Response: 403 Forbidden

// Test: Rechazar inscripción en examen sin disciplinas en el body
POST /eventos/:id/inscribir
Body: { categorias: ["KYU_3"] }
Response: 400 Bad Request
```

## 9. Pruebas de Seguridad

```typescript
// Test: Inscripción sin autenticación
POST /eventos/:id/inscribir
Response: 401 Unauthorized

// Test: Listar eventos sin autenticación (público)
GET /eventos
Response: 200 OK
```

## Estructura de Tests

| Archivo | Contenido |
| ------- | --------- |
| `test/eventos.e2e-spec.ts` | CRUD de eventos, inscripciones, aprobación, pago, validación tipo-dependiente, requisitos de examen, seguridad (29 tests) |
| `test/precios-examen.e2e-spec.ts` | CRUD de precios globales de examen, permisos (7 tests) |

## Notas de Implementación

- Usar `supertest` para E2E tests.
- Mock externo de Mercado Pago SDK con `jest.spyOn` para `createInscriptionPreference`.
- Webhook usa DB real, no mock.
- Cada test limpia su estado via `beforeEach(cleanupDb)`.
- `createTestUser` acepta overrides para estado de pago, graduación y sexo.
