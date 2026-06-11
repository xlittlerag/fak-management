# Especificación Técnica - Iteración 1: API Estática Base

## 🎯 Objetivo

Construir los cimientos de la API REST que soporten la gestión de asociaciones,
el registro de usuarios, la autenticación mediante JWT y el flujo inicial de
autorización basado en roles.

## 1. Endpoints de Asociaciones

Gestión de los dojos o filiales. El listado debe ser público para poblar el
_dropdown_ del formulario de registro en el frontend.

| Método   | Endpoint            | Descripción                                      | Acceso (Guards) |
| -------- | ------------------- | ------------------------------------------------ | --------------- |
| `GET`    | `/asociaciones`     | Lista todas las asociaciones activas.            | `@Public()`     |
| `POST`   | `/asociaciones`     | Crea una nueva asociación.                       | `ADMIN_GENERAL` |
| `PATCH`  | `/asociaciones/:id` | Edita el nombre de una asociación.               | `ADMIN_GENERAL` |
| `DELETE` | `/asociaciones/:id` | Elimina lógicamente (soft-delete) la asociación. | `ADMIN_GENERAL` |

**Payloads esperados (DTOs):**

```typescript
// CreateAsociacionDto
{
  "nombre": "Asociación Akitsu"
}
```

## 2. Endpoints de Autenticación y Registro

Manejo de credenciales y creación inicial de la cuenta. Las contraseñas deben
ser hasheadas (ej. usando `bcrypt` o `argon2`) antes de persistirse en la base
de datos.

| Método | Endpoint         | Descripción                                       | Acceso (Guards) |
| ------ | ---------------- | ------------------------------------------------- | --------------- |
| `POST` | `/auth/register` | Crea un usuario en estado `PENDIENTE_APROBACION`. | `@Public()`     |
| `POST` | `/auth/login`    | Valida credenciales y devuelve el JWT.            | `@Public()`     |

**Reglas de Negocio - Registro:**

- El campo `email` y `dni` deben ser únicos en toda la base de datos. Si existe
  colisión, retornar `409 Conflict`.
- El usuario se crea por defecto con:
- `rol`: `BASICO`
- `estado_registro`: `PENDIENTE_APROBACION`
- `grad_kendo`: `SIN_GRADUACION`
- `grad_iaido`: `SIN_GRADUACION`
- `estado_pago`: `false` (inactivo)

**Reglas de Negocio - Login:**

- Si las credenciales son inválidas: `401 Unauthorized`.
- Si las credenciales son válidas pero el usuario tiene
  `estado_registro === 'PENDIENTE_APROBACION'`: Retornar `403 Forbidden`
  indicando explícitamente que la cuenta aguarda aprobación de su dojo. No se
  emite JWT.
- Si es exitoso, el payload del JWT debe contener al menos el `sub` (user id),
  `email`, `rol` y `asociacion_id` para evitar consultas innecesarias en los
  guards posteriores.

**Payloads esperados (DTOs):**

```typescript
// RegisterUserDto
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "password": "PasswordSegura123!",
  "dni": "12345678",
  "fecha_nacimiento": "1995-05-15",
  "genero": "MASCULINO",
  "asociacion_id": 1
}

// LoginDto
{
  "email": "juan@example.com",
  "password": "PasswordSegura123!"
}
```

## 3. Endpoints de Aprobación de Usuarios

Flujo donde los administradores gestionan a los inscriptos de sus respectivas
asociaciones.

| Método  | Endpoint                   | Descripción                          | Acceso (Guards)                     |
| ------- | -------------------------- | ------------------------------------ | ----------------------------------- |
| `GET`   | `/usuarios/pendientes`     | Lista usuarios esperando aprobación. | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `PATCH` | `/usuarios/:id/aprobacion` | Aprueba o rechaza un registro.       | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |

**Reglas de Negocio - Listado (`GET`):**

- Si el usuario que hace la petición es `ADMIN_ASOCIACION`, la consulta a la
  base de datos debe filtrar automáticamente y devolver **solo** los usuarios
  con `estado_registro === 'PENDIENTE_APROBACION'` cuyo `asociacion_id` coincida
  con la asociación del administrador.
- Si el usuario es `ADMIN_GENERAL`, puede ver los pendientes de todo el país.

**Reglas de Negocio - Aprobación (`PATCH`):**

- **Autorización de recursos:** El sistema debe verificar que el usuario a
  aprobar pertenezca a la misma asociación que el administrador que ejecuta la
  acción (retornar `403 Forbidden` si intenta aprobar a alguien de otro dojo).
- Si la acción es `APROBAR`: El `estado_registro` pasa a `APROBADO`. A partir de
  ese momento, el usuario puede hacer login exitosamente.
- Si la acción es `RECHAZAR`: El `estado_registro` pasa a `RECHAZADO` (o se
  elimina el registro, según la política de retención de datos que prefieras
  aplicar).

**Payloads esperados (DTOs):**

```typescript
// UpdateAprobacionDto
{
  "accion": "APROBAR" // o "RECHAZAR"
}
```

## 4. Criterios de Aceptación (DoD)

Para dar por finalizada la Iteración 1, se debe cumplir lo siguiente:

- La base de datos se inicializa correctamente con las migraciones
  (Prisma/TypeORM).
- Los endpoints públicos de registro y listado de asociaciones responden
  correctamente sin token.
- El intento de login de un usuario pendiente de aprobación es bloqueado por el
  sistema.
- Un usuario logueado con rol `ADMIN_ASOCIACION` no puede acceder ni alterar
  datos de usuarios de otras asociaciones.
- El endpoint de login emite un JWT firmado que puede ser decodificado y
  validado por el `JwtAuthGuard` en rutas protegidas.
