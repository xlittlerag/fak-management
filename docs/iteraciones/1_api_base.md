# Especificación Técnica - Iteración 1: API Estática Base

## 🎯 Objetivo

Construir los cimientos de la API REST que soporten la gestión de asociaciones,
el registro de usuarios, la autenticación mediante DNI y el flujo inicial de
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

## 2. Endpoints de Autenticación y Registro

Manejo de credenciales y creación inicial de la cuenta. Las contraseñas se
hashean usando `bcrypt` antes de persistirse.

| Método | Endpoint                       | Descripción                                        | Acceso (Guards) |
| ------ | ------------------------------ | -------------------------------------------------- | --------------- |
| `POST` | `/auth/register`               | Crea un usuario en estado `PENDIENTE_APROBACION`.  | `@Public()`     |
| `POST` | `/auth/login`                  | Valida DNI y contraseña, devuelve el JWT.          | `@Public()`     |
| `POST` | `/auth/reset-password/request` | Crea una solicitud de blanqueo de contraseña.      | `@Public()`     |

**Reglas de Negocio - Autenticación:**
- **Login:** Se realiza mediante DNI y Contraseña. El Administrador General utiliza el DNI `00000000`.
- **Blanqueo:** Si un usuario tiene un blanqueo aprobado, el primer login posterior aceptará cualquier contraseña y la guardará como nueva.

## 3. Endpoints de Usuarios y Perfil

| Método  | Endpoint                   | Descripción                                 | Acceso (Guards)                     |
| ------- | -------------------------- | ------------------------------------------- | ----------------------------------- |
| `GET`   | `/usuarios`                | Lista usuarios aprobados (filtrado por asoc)| `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `GET`   | `/usuarios/pendientes`     | Lista registros y blanqueos pendientes.     | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `GET`   | `/usuarios/perfil`         | Obtiene los datos del usuario autenticado.  | Autenticado                         |
| `PATCH` | `/usuarios/perfil`         | Actualiza datos personales (incluye Email). | Autenticado                         |
| `PATCH` | `/usuarios/:id/aprobacion` | Aprueba o rechaza registro/blanqueo.        | `ADMIN_ASOCIACION`, `ADMIN_GENERAL` |
| `PATCH` | `/usuarios/:id/rol`        | Cambia el rol de un usuario.                | `ADMIN_GENERAL`                     |
| `PATCH` | `/usuarios/:id/graduacion` | Asigna graduaciones a un usuario.           | `ADMIN_GENERAL`                     |

**Reglas de Negocio - Listado:**
- Los administradores de asociación solo ven usuarios pertenecientes a su asociación. El Administrador General tiene visibilidad global.

## 4. Criterios de Aceptación (DoD)

- Base de datos sincronizada y sembrada con administradores iniciales.
- El login por DNI funciona correctamente y bloquea usuarios pendientes.
- El blanqueo de contraseña sigue el flujo de solicitud -> aprobación -> reset.
- Los mensajes de error del sistema están en español formal (Usted).
