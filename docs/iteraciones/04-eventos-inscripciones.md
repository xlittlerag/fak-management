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
| `POST`   | `/eventos`                      | Crea un nuevo evento.                              | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |
| `GET`    | `/eventos`                      | Lista solo eventos publicados.                     | `@Public()`           |
| `GET`    | `/eventos/admin`                | Lista con filtro según rol y creador.              | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |
| `GET`    | `/eventos/:id`                  | Obtiene detalle de un evento.                      | `@Public()`           |
| `PATCH`  | `/eventos/:id`                  | Actualiza un evento.                               | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |
| `DELETE` | `/eventos/:id`                  | Elimina un evento.                                 | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |
| `PATCH`  | `/eventos/:id/publicar`         | Cambia estado de borrador a publicado.             | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |

**Reglas de Negocio:**
- Los eventos en estado `borrador` no se retornan en `GET /eventos` (lista pública).
- `GET /eventos/admin` retorna:
  - `ADMIN_GENERAL`: todos los eventos (publicados y borradores).
  - `ADMIN_ASOCIACION`: eventos publicados + borradores donde `creador_id === user.id`.
- Las fechas se almacenan como `DateTime` pero solo se utiliza la parte de fecha (sin hora).
- `datos_lugar` es un campo JSON con `direccion` y `provincia` (provincia usa el mismo `PROVINCIAS` dropdown que registro/perfil).
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
  - `graduaciones_a_rendir`: json (Array de `{ disciplina, grad_min, grad_max }`, define rangos por disciplina)
  - `info_adicional`: string? (opcional)
  - No tiene `costo_inscripcion` (el costo se calcula desde la tabla global `PrecioExamen`)
  - No tiene `categorias`
  - No tiene `grad_min`/`grad_max`
  - No tiene `inscripcion_multiple`
  - Los exámenes son siempre de ámbito `NACIONAL` (se fuerza en backend)
  - No permiten `pago_fuera_sistema`

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
| `PATCH`| `/inscripciones/:id`                 | Edita categorías, disciplinas y necesidades especiales.     | Autenticado                    |
| `DELETE`| `/inscripciones/:id`                | Cancela (baja) la inscripción.                              | Autenticado                    |
| `POST` | `/inscripciones/:id/pago-manual`     | Admin marca pago recibido fuera de Mercado Pago.            | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `POST` | `/eventos/:id/cerrar-inscripciones`  | Cierra inscripciones del torneo manualmente.                | `ADMIN_GENERAL`, `ADMIN_ASOCIACION` |

**Reglas de Negocio:**
- El usuario debe estar activo (`estado_reg = APROBADO` y `estado_pago = true`). Si no existe `CuotaGlobal` configurada, se salta el chequeo de `estado_pago`.
- No se permite inscripción duplicada al mismo evento.
- La categoría seleccionada debe ser compatible con la graduación del usuario.
- Usuarios con sexo registral `X` solo pueden inscribirse en categorías cuyo género sea `MASCULINO` o `MIXTO`.
- La inscripción se crea en estado `PENDIENTE`.
- Luego de aprobada, el usuario debe pagar para confirmar.
- Si `costo_inscripcion = 0`, el pago es automático (gratuito).
- **Editar inscripción** (`PATCH /inscripciones/:id`): permite cambiar categorías, disciplinas y necesidades especiales mientras esté dentro de la fecha límite real y las inscripciones sigan abiertas.
- **Baja de inscripción** (`DELETE /inscripciones/:id`): permite cancelar la inscripción mientras esté dentro de la fecha límite real.
- **Pago manual** (`POST /inscripciones/:id/pago-manual`): el admin marca el pago como recibido fuera del sistema. Solo disponible si el evento tiene `pago_fuera_sistema = true`. No requiere interacción con Mercado Pago.
- **Cerrar inscripciones** (`POST /eventos/:id/cerrar-inscripciones`): setea `inscripciones_abiertas = false` en el torneo. Impide nuevas inscripciones y modificaciones.

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
| `costo_inscripcion` | Float | Precio de inscripción online   |
| `costo_registro`    | Float | Precio de registro presencial  |
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
| `archivos_info`| Json?   | Archivos adjuntos de información (reglamentos, instructivos) |

### `Torneo` (1:1 con Evento, solo si `tipo = TORNEO`)

| Campo                     | Tipo      | Descripción                          |
| ------------------------- | --------- | ------------------------------------ |
| `id`                      | Int (PK)  | Autoincremental                      |
| `evento_id`               | Int (FK)  | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplina`              | String    | KENDO, IAIDO o JODO                  |
| `costo_inscripcion`       | Float     | Precio fijo (0 = gratuito)           |
| `categorias`              | Json      | Array de objetos de categoría        |
| `inscripcion_multiple`    | Boolean   | Default false                        |
| `grad_min`                | String?   | Graduación mínima para inscripción   |
| `grad_max`                | String?   | Graduación máxima para inscripción   |
| `info_adicional`          | String?   | Texto libre opcional                 |
| `fecha_limite_informativa`| DateTime? | Fecha límite informativa             |
| `fecha_limite_real`       | DateTime? | Fecha límite real (corta inscripciones y modificaciones) |
| `inscripciones_abiertas`  | Boolean   | Permite abrir/cerrar inscripciones manualmente. Default true |

### `Examen` (1:1 con Evento, solo si `tipo = EXAMEN`)

| Campo                   | Tipo     | Descripción                          |
| ----------------------- | -------- | ------------------------------------ |
| `id`                    | Int (PK) | Autoincremental                      |
| `evento_id`             | Int (FK) | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplinas`           | Json     | Array de strings (KENDO, IAIDO, JODO)|
| `graduaciones_a_rendir` | Json     | Array de `{ disciplina, grad_min, grad_max }` (rangos por disciplina) |
| `info_adicional`        | String?  | Texto libre opcional                 |

### Reglas de negocio para exámenes

- El ámbito siempre es NACIONAL (se fuerza en backend y frontend bloquea el selector).
- Los eventos nacionales no permiten `pago_fuera_sistema`.
- Al inscribirse, el alumno selecciona una o más disciplinas. El sistema **auto-computa** la graduación siguiente a la actual del usuario en cada disciplina y verifica que esté dentro del rango definido por el admin.
- El frontend informa al usuario qué graduación va a rendir (no permite seleccionar graduación manualmente).
- Se validan requisitos de edad, graduación previa y tiempo de espera mínimo según `REQUISITOS_EXAMEN`.

### `Seminario` (1:1 con Evento, solo si `tipo = SEMINARIO`)

| Campo               | Tipo     | Descripción                          |
| ------------------- | -------- | ------------------------------------ |
| `id`                | Int (PK) | Autoincremental                      |
| `evento_id`         | Int (FK) | Relación 1:1 con Evento (onDelete: Cascade) |
| `disciplina`        | String   | KENDO, IAIDO o JODO                  |
| `costo_inscripcion` | Float    | Precio fijo (0 = gratuito)           |
| `info_adicional`    | String?  | Texto libre opcional                 |

### `InscripcionEvento`

| Campo                     | Tipo            | Descripción                             |
| ------------------------- | --------------- | --------------------------------------- |
| `id`                      | Int (PK)        | Autoincremental                         |
| `usuario_id`              | Int (FK)        | Referencia al usuario                   |
| `evento_id`               | Int (FK)        | Referencia al evento                    |
| `categoria_grad`          | Json            | Array de categorías/graduaciones        |
| `disciplinas`             | Json?           | Array de disciplinas (solo exámenes)    |
| `estado_aprob`            | Enum            | PENDIENTE / APROBADO / RECHAZADO        |
| `pagado`                  | Boolean         | Indica si el pago fue realizado         |
| `archivo_medico_url`      | String?         | URL del certificado médico subido       |
| `necesidades_especiales`  | Boolean         | Indica si el usuario tiene necesidades especiales |
| `descripcion_necesidades` | String?         | Descripción de las necesidades especiales |
| `pagado_fuera_sistema`    | Boolean         | Pago registrado manualmente fuera de MP |

## 5. DTOs

### CreateEventoDto

```typescript
class RangoExamenDto {
  disciplina: string;     // KENDO | IAIDO | JODO
  grad_min: string;       // Desde (ej: KYU_3)
  grad_max: string;       // Hasta (ej: DAN_8)
}

class CreateEventoDto {
  tipo: string;                          // TORNEO | EXAMEN | SEMINARIO
  fecha_inicio: string;                  // "YYYY-MM-DD"
  fecha_fin: string;                     // "YYYY-MM-DD"
  datos_lugar: Record<string, any>;      // { direccion, provincia }
  // Campos comunes
  ambito?: string;                       // REGIONAL | NACIONAL (EXAMEN fuerza NACIONAL)
  pago_fuera_sistema?: boolean;          // Rechazado si ambito = NACIONAL
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
  graduaciones_a_rendir?: RangoExamenDto[];  // [{ disciplina, grad_min, grad_max }]
}
```

### UpdateEventoDto (mismos campos opcionales que CreateEventoDto)

### InscribirEventoDto

```typescript
class InscribirEventoDto {
  categorias?: string[];         // Array de nombres de categorías (TORNEO/SEMINARIO)
  disciplinas?: string[];        // Solo para exámenes — el backend auto-computa categorias
  archivo_medico_url?: string;   // URL del certificado médico (opcional)
  necesidades_especiales?: boolean;  // Flag de necesidades especiales
  descripcion_necesidades?: string;  // Descripción (requerido si necesidades_especiales es true)
}
```

**Nota para exámenes:** El frontend envía solo `disciplinas`. El backend llama a `computeCategoriasExamen()` que:
1. Obtiene la graduación actual del usuario en cada disciplina.
2. Calcula la graduación siguiente (`computeSiguienteGraduacion`).
3. Verifica que esté dentro del rango definido por el admin (`graduaciones_a_rendir`).
4. Retorna el array de graduaciones computadas que se almacena en `categoria_grad`.

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

## 7. Criterios de Aceptación (DoD)

- [x] Admin General puede crear, editar y eliminar eventos.
- [x] Admin de Asociación puede crear/editar/eliminar eventos propios (no exámenes).
- [x] Los eventos en borrador solo son visibles para Admin General o el creador (Admin Asociación).
- [x] Los usuarios pueden ver eventos publicados sin autenticación.
- [x] Usuarios activos pueden inscribirse en eventos.
- [x] Se validan requisitos (cuota al día si hay CuotaGlobal configurada, no duplicado, categoría compatible, sexo registral).
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
- [x] 108 tests E2E cubren los flujos principales.
- [x] Precios globales de exámenes (PrecioExamen) con CRUD exclusivo para ADMIN_GENERAL.
- [x] Validación tipo-dependiente al crear/editar eventos (TORNEO ≠ EXAMEN ≠ SEMINARIO).
- [x] Exámenes: disciplinas múltiples, rangos de graduaciones por disciplina, costo variable por graduación.
- [x] Seminarios: disciplina única, costo fijo, sin categorías.
- [x] Inscripción múltiple solo disponible para Torneos.
- [x] UI de creación de Examen usa rangos por disciplina (Desde / Hasta) en lugar de checkboxes planos.
- [x] Exámenes son siempre ámbito NACIONAL (backend force + frontend bloqueado).
- [x] Eventos nacionales no permiten `pago_fuera_sistema`.
- [x] Al inscribirse en Examen, el usuario selecciona disciplinas y el backend auto-computa la graduación siguiente.
- [x] El frontend informa al usuario qué graduación va a rendir antes de inscribir.
- [x] Se validan requisitos de edad, graduación previa y tiempo de espera por disciplina.
- [x] Mensajes de error en español formal (Usted).

## 8. Cambios posteriores (sesión junio 2026)

### 8.1 Permisos de creación de eventos
- Se agregó `ADMIN_ASOCIACION` como rol permitido para crear/editar eventos (antes solo `ADMIN_GENERAL`).
- `ADMIN_ASOCIACION` no puede crear exámenes (opción oculta en frontend).
- `ADMIN_ASOCIACION` no puede crear eventos con ámbito NACIONAL.
- `checkEventOwnership()` verifica que `ADMIN_ASOCIACION` solo modifique eventos propios.

### 8.2 Visibilidad de borradores
- Se creó endpoint `GET /eventos/admin` (autenticado, roles ADMIN).
- `ADMIN_GENERAL`: ve todos los eventos.
- `ADMIN_ASOCIACION`: ve publicados + borradores propios.
- `GET /eventos` público solo retorna publicados.

### 8.3 Botones de acción según permisos
- `EventosAdmin.tsx`: botones Editar/Publicar/Cerrar/Eliminar solo visibles si `canEditEvent()` retorna true.

### 8.4 Chequeo de cuota condicional
- Si no existe `CuotaGlobal` configurada, se salta la validación de `estado_pago` al inscribir.

### 8.5 Teléfono obligatorio
- `telefono` pasó de opcional a obligatorio en registro y perfil (frontend + backend DTOs).

### 8.6 Mensajes de error
- `getErrorMessage()` ahora prioriza `response.data.message` sobre el genérico de Axios.
- Mensaje de error por falta de `f_grad` no incluye códigos internos (ej: "Contacte a su administrador").

### 8.7 Selector de provincia
- `EventosAdmin.tsx` reemplazó input texto por `<select>` con `PROVINCIAS`.

### 8.8 Formato de fecha
- Se mantiene `<input type="date">` nativo (el formato depende de la configuración regional del navegador).
