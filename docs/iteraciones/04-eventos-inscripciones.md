# Especificación Técnica - Iteración 4: Módulo de Eventos e Inscripciones

## 🎯 Objetivo

Implementar el módulo de gestión de eventos (torneos, exámenes, seminarios) e inscripciones, incluyendo categorías por gradación, aprobación por administrador de asociación y pago de inscripción vía Mercado Pago.

## 0. Precios de Exámenes (Tabla Global)

Modelo global con precios por graduación para exámenes, administrado por `ADMIN_GENERAL`.

| Método   | Endpoint                          | Descripción                          | Acceso          |
| -------- | --------------------------------- | ------------------------------------ | --------------- |
| `GET`    | `/precios-examen`                 | Lista todos los precios              | `@Public()`     |
| `POST`   | `/precios-examen`                 | Crea un nuevo precio por graduación  | `ADMIN_GENERAL` |
| `PATCH`  | `/precios-examen/:id`             | Actualiza un precio existente        | `ADMIN_GENERAL` |
| `DELETE` | `/precios-examen/:id`             | Elimina un precio                    | `ADMIN_GENERAL` |

## 1. Endpoints de Eventos

| Método   | Endpoint                        | Descripción                                        | Acceso (Guards)       |
| -------- | --------------------------------| -------------------------------------------------- | --------------------- |
| `POST`   | `/eventos`                      | Crea un nuevo evento.                              | `ADMIN_GENERAL`       |
| `GET`    | `/eventos`                      | Lista todos los eventos públicos.                  | `@Public()`           |
| `GET`    | `/eventos/:id`                  | Obtiene detalle de un evento.                      | `@Public()`           |
| `PATCH`  | `/eventos/:id`                  | Actualiza un evento.                               | `ADMIN_GENERAL`       |
| `DELETE` | `/eventos/:id`                  | Elimina un evento.                                 | `ADMIN_GENERAL`       |
| `PATCH`  | `/eventos/:id/publicar`         | Cambia estado de borrador a publicado.             | `ADMIN_GENERAL`       |

**Reglas de Negocio:**
- Los eventos en estado `borrador` no se retornan en `GET /eventos` (solo son visibles para `ADMIN_GENERAL` vía un filtro especial).
- Las fechas se almacenan como `DateTime` pero solo se utiliza la parte de fecha (sin hora).
- `datos_lugar` es un campo JSON con `direccion` y `provincia`.
- Los campos específicos de cada tipo de evento se almacenan en sub-modelos 1:1 (`Torneo`, `Examen`, `Seminario`):

  **TORNEO** (modelo `Torneo`):
  - `disciplina`: string (Kendo, Iaido, Jodo)
  - `grad_min`, `grad_max`: string? (rango de graduación)
  - `costo_inscripcion`: float (0 = gratuito)
  - `categorias`: json (array de objetos con `nombre`, `edad_min`, `edad_max`, `grad_min`, `grad_max`, `genero`)
  - `info_adicional`: string? (texto libre opcional)
  - `inscripcion_multiple`: boolean (default false)

  **EXAMEN** (modelo `Examen`):
  - `disciplinas`: json (string[], una o más de KENDO, IAIDO, JODO)
  - `graduaciones_a_rendir`: json (string[], graduaciones disponibles, desde KYU_3 hasta DAN_8)
  - `info_adicional`: string? (opcional)
  - No tiene `costo_inscripcion` (el costo se calcula desde la tabla global `PrecioExamen`)
  - No tiene `categorias`
  - No tiene `grad_min`/`grad_max`
  - No tiene `inscripcion_multiple`

  **SEMINARIO** (modelo `Seminario`):
  - `disciplina`: string
  - `costo_inscripcion`: float (0 = gratuito)
  - `info_adicional`: string? (opcional)
  - No tiene `categorias`
  - No tiene `inscripcion_multiple`
- No se utiliza cupo máximo.

## 2. Endpoints de Inscripciones

| Método | Endpoint                             | Descripción                                                 | Acceso (Guards)                |
| ------ | ------------------------------------ | ----------------------------------------------------------- | ------------------------------ |
| `POST` | `/eventos/:id/inscribir`             | Inscribe al usuario autenticado en un evento.               | Autenticado                    |
| `GET`  | `/eventos/:id/inscripciones`         | Lista inscripciones de un evento.                           | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `GET`  | `/mis-inscripciones`                 | Lista inscripciones del usuario autenticado.                | Autenticado                    |
| `PATCH`| `/inscripciones/:id/aprobar`         | Aprueba o rechaza una inscripción.                          | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `POST` | `/inscripciones/:id/pagar`           | Genera preferencia de pago para una inscripción aprobada.   | Autenticado                    |

**Reglas de Negocio:**
- El usuario debe estar activo (`estado_reg = APROBADO` y `estado_pago = true`).
- No se permite inscripción duplicada al mismo evento.
- La categoría seleccionada debe ser compatible con la graduación del usuario.
- Usuarios con sexo registral `X` solo pueden inscribirse en categorías cuyo género sea `MASCULINO` o `MIXTO`.
- La inscripción se crea en estado `PENDIENTE`.
- Luego de aprobada, el usuario debe pagar para confirmar.
- Si `costo_inscripcion = 0`, el pago es automático (gratuito).

## 3. Integración con Mercado Pago

Reutiliza `MercadoPagoService` existente:

### 3.1 Generación de preferencia

- Endpoint: `POST /inscripciones/:id/pagar`
- Crea una preferencia de Mercado Pago con `external_reference` en formato: `inscripcion_user_<userId>_evento_<eventoId>_insc_<inscripcionId>_ts_<timestamp>`
- Retorna `preferenceId` o `{ gratuito: true }` si el costo es 0.

### 3.2 Webhook extendido

El webhook de Mercado Pago en `POST /pagos/webhook` ahora también procesa referencias que comienzan con `inscripcion_`:
- Parsea `external_reference` para extraer `userId`, `eventoId` e `inscripcionId`.
- Si el estado del pago es `approved`, marca `pagado = true` en la inscripción.

### `PrecioExamen`

| Campo       | Tipo     | Descripción                          |
| ----------- | -------- | ------------------------------------ |
| `id`        | Int (PK) | Autoincremental                      |
| `graduacion`| String   | Graduación (unique, ej: DAN_1)      |
| `costo`     | Float    | Precio fijo para esa graduación      |
| `updatedAt` | DateTime | Última actualización                 |

## 4. Modelos de Base de Datos

### `Evento`

| Campo         | Tipo     | Descripción                           |
| ------------- | -------- | ------------------------------------- |
| `id`          | Int (PK) | Autoincremental                       |
| `tipo`        | String   | Tipo de evento (TORNEO, EXAMEN, SEMINARIO) |
| `fecha_inicio`| DateTime | Fecha de inicio (sin hora)            |
| `fecha_fin`   | DateTime | Fecha de fin (sin hora)               |
| `datos_lugar` | Json     | `{ direccion, provincia }`            |
| `publicado`   | Boolean  | Modo draft vs público                 |

### `Torneo` (1:1 con Evento, solo si `tipo = TORNEO`)

| Campo                 | Tipo     | Descripción                          |
| --------------------- | -------- | ------------------------------------ |
| `id`                  | Int (PK) | Autoincremental                      |
| `evento_id`           | Int (FK) | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplina`          | String   | KENDO, IAIDO o JODO                  |
| `costo_inscripcion`   | Float    | Precio fijo (0 = gratuito)           |
| `categorias`          | Json     | Array de objetos de categoría        |
| `inscripcion_multiple`| Boolean  | Default false                        |
| `grad_min`            | String?  | Graduación mínima para inscripción   |
| `grad_max`            | String?  | Graduación máxima para inscripción   |
| `info_adicional`      | String?  | Texto libre opcional                 |

### `Examen` (1:1 con Evento, solo si `tipo = EXAMEN`)

| Campo                   | Tipo     | Descripción                          |
| ----------------------- | -------- | ------------------------------------ |
| `id`                    | Int (PK) | Autoincremental                      |
| `evento_id`             | Int (FK) | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplinas`           | Json     | Array de strings (KENDO, IAIDO, JODO)|
| `graduaciones_a_rendir` | Json     | Array de strings (KYU_3…DAN_8)      |
| `info_adicional`        | String?  | Texto libre opcional                 |

### `Seminario` (1:1 con Evento, solo si `tipo = SEMINARIO`)

| Campo               | Tipo     | Descripción                          |
| ------------------- | -------- | ------------------------------------ |
| `id`                | Int (PK) | Autoincremental                      |
| `evento_id`         | Int (FK) | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplina`        | String   | KENDO, IAIDO o JODO                  |
| `costo_inscripcion` | Float    | Precio fijo (0 = gratuito)           |
| `info_adicional`    | String?  | Texto libre opcional                 |

### `InscripcionEvento`

| Campo           | Tipo            | Descripción                             |
| --------------- | --------------- | --------------------------------------- |
| `id`            | Int (PK)        | Autoincremental                         |
| `usuario_id`    | Int (FK)        | Referencia al usuario                   |
| `evento_id`     | Int (FK)        | Referencia al evento                    |
| `categoria_grad`| Json            | Array de categorías/graduaciones        |
| `disciplinas`   | Json?           | Array de disciplinas (solo exámenes)    |
| `estado_aprob`  | Enum            | PENDIENTE / APROBADO / RECHAZADO        |
| `pagado`        | Boolean         | Indica si el pago fue realizado         |

## 5. DTOs

### CreateEventoDto

```typescript
class CreateEventoDto {
  tipo: string;                          // TORNEO | EXAMEN | SEMINARIO
  fecha_inicio: string;                  // "YYYY-MM-DD"
  fecha_fin: string;                     // "YYYY-MM-DD"
  datos_lugar: Record<string, any>;      // { direccion, provincia }
  // Campos comunes
  info_adicional?: string;
  // Torneo / Seminario
  disciplina?: string;                   // KENDO | IAIDO | JODO
  costo_inscripcion?: number;            // 0 = gratuito
  // Torneo
  categorias?: Categoria[];
  grad_min?: string;
  grad_max?: string;
  inscripcion_multiple?: boolean;
  // Examen
  disciplinas?: string[];                // ["KENDO", "IAIDO"]
  graduaciones_a_rendir?: string[];      // ["KYU_3", "DAN_1"]
}
```

### UpdateEventoDto (mismos campos opcionales que CreateEventoDto)

### InscribirEventoDto

```typescript
class InscribirEventoDto {
  categorias?: string[];  // Array de nombres de categorías o graduaciones
  disciplinas?: string[]; // Solo para exámenes
}
```

## 6. Categorías por Defecto

El sistema incluye un archivo de configuración con categorías predefinidas para torneos. Al crear un torneo, el administrador general puede cargar estas categorías por defecto (botón "Cargar por defecto") y luego modificarlas según sea necesario.

```typescript
// src/eventos/config/categorias-torneo.ts
export const CATEGORIAS_TORNEO_DEFAULT = [
  { nombre: 'Junior', genero: 'MIXTO', edad_max: 16 },
  { nombre: 'Master', genero: 'MIXTO', edad_min: 50 },
  { nombre: 'Kyu Femenino', genero: 'FEMENINO', grad_min: 'SIN_GRADUACION', grad_max: 'KYU_1' },
  { nombre: 'Kyu Masculino', genero: 'MASCULINO', grad_min: 'SIN_GRADUACION', grad_max: 'KYU_1' },
  { nombre: 'Dan Femenino', genero: 'FEMENINO', grad_min: 'DAN_1' },
  { nombre: 'Dan Masculino 1er y 2do Dan', genero: 'MASCULINO', grad_min: 'DAN_1', grad_max: 'DAN_2' },
  { nombre: 'Dan Masculino 3er Dan en adelante', genero: 'MASCULINO', grad_min: 'DAN_3' },
  { nombre: 'Equipos Junior', genero: 'MIXTO' },
  { nombre: 'Equipos Femenino', genero: 'FEMENINO' },
  { nombre: 'Equipos Masculino', genero: 'MASCULINO' },
];
```

## 7. Inscripción Múltiple

- Configurable por evento mediante `Torneo.inscripcion_multiple: boolean` (default `false`).
- Cuando está deshabilitado, el usuario selecciona una sola categoría.
- Cuando está habilitado, el usuario puede seleccionar varias categorías mediante checkboxes.
- Se crea una sola inscripción con un array de categorías en `categoria_grad`.
- El pago se realiza una vez por inscripción (cubre todas las categorías seleccionadas).

### Nota: Categorías de equipo

Las categorías "Equipos Junior", "Equipos Femenino" y "Equipos Masculino" se incluyen como opciones en el formulario de categorías del torneo. La lógica de registro por equipo/asociación (alta por admin de asociación vs. inscripción individual) está pendiente de definir en una iteración futura.

## 8. Criterios de Aceptación (DoD)

- [x] Admin General puede crear, editar y eliminar eventos.
- [x] Los eventos en borrador solo son visibles para Admin General.
- [x] Los usuarios pueden ver eventos publicados sin autenticación.
- [x] Usuarios activos pueden inscribirse en eventos.
- [x] Se validan requisitos (cuota al día, no duplicado, categoría compatible, sexo registral).
- [x] Admin de asociación puede aprobar/rechazar inscripciones de su asociación.
- [x] Usuario puede pagar inscripción aprobada vía Mercado Pago.
- [x] Inscripciones gratuitas se confirman automáticamente.
- [x] El webhook de Mercado Pago procesa pagos de inscripción.
- [x] Sexo Registral con opción X; la opción X solo permite inscripción en categorías masculinas/mixtas.
- [x] Fechas sin hora, campo info adicional, categorías sin cupo máximo.
- [x] Categorías con edad mínima en la configuración.
- [x] 10 categorías default para torneo con botón "Cargar por defecto".
- [x] Inscripción múltiple configurable por evento (checkboxes en lugar de dropdown).
- [x] Cada inscripción puede tener 1 o N categorías almacenadas como JSON array.
- [x] 29 tests E2E de eventos cubren los flujos principales.
- [x] 106 tests E2E totales en el proyecto.
- [x] Precios globales de exámenes (PrecioExamen) con CRUD exclusivo para ADMIN_GENERAL.
- [x] Validación tipo-dependiente al crear/editar eventos (TORNEO ≠ EXAMEN ≠ SEMINARIO).
- [x] Exámenes: disciplinas múltiples, graduaciones a rendir, costo variable por graduación.
- [x] Seminarios: disciplina única, costo fijo, sin categorías.
- [x] Inscripción múltiple solo disponible para Torneos.
- [x] UI de inscripción en Examen muestra checkboxes de graduaciones con costo unitario + total.
- [x] Mensajes de error en español formal (Usted).
