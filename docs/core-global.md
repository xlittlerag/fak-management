# Core Global: Kendo Manager

## 🛠️ Stack Tecnológico

- **Backend:** NestJS (v10+), TypeScript, Prisma ORM o TypeORM (Relacional).
- **Frontend:** React/Next.js/Vite (a definir en la iteración 2), TypeScript,
  Tailwind CSS.
- **Base de Datos:** PostgreSQL (Recomendado por su soporte nativo de tipos ENUM
  y consistencia relacional para auditoría).

---

## 🗄️ Esquema de Base de Datos Unificado

Este diseño lógico contempla campos que no usarás en la Iteración 1 (como los
flags de pago o las tablas de eventos), pero que **deben existir desde el día
uno** para evitar refactorizaciones costosas.

```
+-------------------+             +-------------------+
|    Asociacion     |             |   CuotaGlobal     |
+-------------------+             +-------------------+
| id (PK)           |             | id (PK)           |
| nombre            |             | monto_actual      |
+-------------------+             | fecha_vencimiento |
          |                       +-------------------+
          | 1
          |
          | N
+-------------------+             +-------------------+
|      Usuario      |             | CertificadoExter. |
+-------------------+             +-------------------+
| id (PK)           |             | id (PK)           |
| email (Unique)    | 1         N | usuario_id (FK)   |
| password          |-------------| url_archivo       |
| nombre            |             | disciplina (ENUM) |
| apellido          |             | grad_solicitada   |
| dni (Unique)      |             | estado (ENUM)     |
| fecha_nacimiento  |             +-------------------+
| genero (ENUM)     |
| rol (ENUM)        |             +-------------------+
| estado_pago (BOOL)|             | InscripcionEvento |
| asociacion_id(FK) |             +-------------------+
| estado_reg (ENUM) |             | id (PK)           |
| grad_kendo (ENUM) | 1         N | usuario_id (FK)   |
| f_grad_kendo      |-------------| evento_id (FK)    |
| grad_iaido (ENUM) |             | tipo_evento (ENUM)|
| f_grad_iaido      |             | categoria/grad    |
+-------------------+             | estado_aprob(ENUM)|
          |                       +-------------------+
          | 1                               | N
          |                                 |
          | N                               | 1
+-------------------+                       |
|  HistorialGraduc. |                       |
+-------------------+                       |
| id (PK)           |                       |
| usuario_id (FK)   |                       |
| disciplina (ENUM) |                       |
| graduacion (ENUM) |                       |
| fecha_obtencion   |                       |
| otorgado_por      |                       |
+-------------------+                       |
                                            |
                                  +-------------------+
                                  |      Evento       |
                                  +-------------------+
                                  | id (PK)           |
                                  | tipo (ENUM)       |
                                  | fecha_inicio      |
                                  | fecha_fin         |
                                  | datos_lugar (JSON)|
                                  | config (JSON)     |
                                  +-------------------+
```

---

## 📋 Diccionario de Tipos y Enums (TypeScript / DB)

Para garantizar la consistencia en el backend (NestJS) y el frontend, se definen
los siguientes enums globales:

```typescript
export enum Rol {
  ADMIN_GENERAL = "ADMIN_GENERAL",
  ADMIN_ASOCIACION = "ADMIN_ASOCIACION",
  BASICO = "BASICO",
}

export enum EstadoRegistro {
  PENDIENTE_APROBACION = "PENDIENTE_APROBACION",
  APROBADO = "APROBADO",
  RECHAZADO = "RECHAZADO",
}

export enum Disciplina {
  KENDO = "KENDO",
  IAIDO = "IAIDO",
}

export enum Genero {
  MASCULINO = "MASCULINO",
  FEMENINO = "FEMENINO",
}

export enum Graduacion {
  SIN_GRADUACION = "SIN_GRADUACION",
  KYU_3 = "3_KYU",
  KYU_2 = "2_KYU",
  KYU_1 = "1_KYU",
  DAN_1 = "1_DAN",
  DAN_2 = "2_DAN",
  DAN_3 = "3_DAN",
  DAN_4 = "4_DAN",
  DAN_5 = "5_DAN",
  DAN_6 = "6_DAN",
  DAN_7 = "7_DAN",
  DAN_8 = "8_DAN",
}

export enum EstadoSolicitud {
  PENDIENTE = "PENDIENTE",
  APROBADO = "APROBADO",
  RECHAZADO = "RECHAZADO",
}
```

---

## 🔒 Estrategia de Autenticación y Autorización Global

- **Autenticación:** Se utilizará **JWT (JSON Web Tokens)** transportados
  preferentemente en cookies HTTP-only (para mitigar ataques XSS) o en el header
  `Authorization: Bearer`.
- **Estrategia en NestJS:**
- Un `JwtAuthGuard` global para proteger las rutas por defecto.
- Un decorador personalizado `@Public()` para liberar endpoints específicos
  (como login y registro).
- Un `RolesGuard` combinado con un decorador `@Roles(Rol.ADMIN_GENERAL)` para el
  control de acceso basado en roles (RBAC).
