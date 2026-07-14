# Core Global: Kendo Manager

## 🛠️ Stack Tecnológico

- **Backend:** NestJS (v11+), TypeScript, Prisma ORM.
- **Frontend:** Preact, Vite, TypeScript, Tailwind CSS v4.
- **Base de Datos:** SQLite.

---

## 🗄️ Esquema de Base de Datos Unificado

El diseño contempla la gestión de practicantes, asociaciones, pagos y eventos.

### Modelo de Usuario
- **Identificación:** DNI (Único, no editable, credencial de login; no es clave primaria).
- **Contacto:** Email (Editable).
- **Personal:** Nombre, Apellido, Fecha de nacimiento, Sexo Registral (Masculino / Femenino / X).
- **Domicilio Real:** Calle/Altura, Piso/Depto, Ciudad, Código Postal, Provincia (Enum).
- **Seguridad:** Password (Bcrypt), Estado de blanqueo (Enum).
- **Estado:** Rol (Admin General, Admin Asociación, Básico), Estado de Registro (Pendiente, Aprobado, Rechazado).
- **Deportivo:** Graduaciones independientes para Kendo, Iaido y Jodo.
- **Asociación/Dojo:** Pertenece a una Asociación y a un Dojo específico.

---

## 📋 Diccionario de Tipos y Enums (TypeScript / DB)

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
  JODO = "JODO",
}

export enum Sexo {
  MASCULINO = "MASCULINO",
  FEMENINO = "FEMENINO",
  X = "X",
}
```

---

## 🔒 Estrategia de Autenticación y Autorización

- **Autenticación:** JWT (JSON Web Tokens).
- **Login:** Basado en DNI y Contraseña. El Administrador General utiliza el DNI especial `00000000`.
- **RBAC:** Control de acceso mediante decoradores `@Roles()` y un `RolesGuard` global.
- **Bypass:** Decorador `@Public()` para liberar endpoints de autenticación y registro.
- **Localización:** Mensajes de error y UI en español formal (Argentina) basado en "Usted".

### Modelo de Evento
- **Estado:** `borrador` / `publicado` (modo draft evita que sea visible para usuarios).
- **Fechas:** Solo fecha (sin hora) para inicio y fin.
- **Sub-modelos por tipo:** Cada evento tiene un sub-record según su tipo:
  - **Torneo** (1:1): disciplina, costo_inscripcion, categorias (JSON), inscripcion_multiple, grad_min, grad_max, info_adicional.
  - **Examen** (1:1): disciplinas (JSON), graduaciones_a_rendir (JSON), info_adicional.
  - **Seminario** (1:1): disciplina, costo_inscripcion, info_adicional.
- **Sin cupo máximo:** No se limita la cantidad de inscriptos.

### Auditoría
- Tabla de auditoría para registrar cambios en usuarios, eventos e inscripciones.
- Campos: usuario que realizó el cambio, fecha, tipo de cambio, valor anterior (JSON), valor nuevo (JSON).
- Acceso exclusivo para ADMIN_GENERAL.

### PrecioExamen (Tabla Global de Precios)
- Almacena el costo de cada graduación para exámenes.
- Campos: `graduacion` (string, unique), `costo` (number), `updatedAt`.
- Administrado por `ADMIN_GENERAL` vía CRUD en `/api/precios-examen`.
- Se usa para calcular el costo de inscripción a exámenes: suma de precios de las graduaciones seleccionadas.

### Nota sobre Asociaciones:
- La Federación Argentina de Kendo utiliza el ID `0` y está excluida de las vistas de gestión de asociaciones.

### Nota sobre DNI:
- El DNI se almacena como `String @unique` (no como clave primaria). Se utiliza como credencial de inicio de sesión. La clave primaria de la tabla `Usuario` es un `Int` autoincremental (`id`), lo que permite cambios de DNI en casos excepcionales.
