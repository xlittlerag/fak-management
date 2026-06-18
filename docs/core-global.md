# Core Global: Kendo Manager

## 🛠️ Stack Tecnológico

- **Backend:** NestJS (v11+), TypeScript, Prisma ORM.
- **Frontend:** Preact, Vite, TypeScript, Tailwind CSS v4.
- **Base de Datos:** PostgreSQL.

---

## 🗄️ Esquema de Base de Datos Unificado

El diseño contempla la gestión de practicantes, asociaciones, pagos y eventos.

### Modelo de Usuario
- **Identificación:** DNI (Único, no editable, credencial de login).
- **Contacto:** Email (Editable).
- **Personal:** Nombre, Apellido, Fecha de nacimiento, Género.
- **Dirección:** Calle/Altura, Piso/Depto, Ciudad, Código Postal, Provincia (Enum).
- **Seguridad:** Password (Bcrypt), Estado de blanqueo (Enum).
- **Estado:** Rol (Admin General, Admin Asociación, Básico), Estado de Registro (Pendiente, Aprobado, Rechazado).
- **Deportivo:** Graduaciones independientes para Kendo e Iaido.

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

export enum Provincia {
  BUENOS_AIRES, CABA, CATAMARCA, CHACO, CHUBUT, CORDOBA, CORRIENTES, 
  ENTRE_RIOS, FORMOSA, JUJUY, LA_PAMPA, LA_RIOJA, MENDOZA, MISIONES, 
  NEUQUEN, RIO_NEGRO, SALTA, SAN_JUAN, SAN_LUIS, SANTA_CRUZ, SANTA_FE, 
  SANTIAGO_DEL_ESTERO, TIERRA_DEL_FUEGO, TUCUMAN
}

export enum Graduacion {
  SIN_GRADUACION, 3_KYU, 2_KYU, 1_KYU, 1_DAN, 2_DAN, 3_DAN, 4_DAN, 5_DAN, 6_DAN, 7_DAN, 8_DAN
}
```

---

## 🔒 Estrategia de Autenticación y Autorización

- **Autenticación:** JWT (JSON Web Tokens).
- **Login:** Basado en DNI y Contraseña. El Administrador General utiliza el DNI especial `00000000`.
- **RBAC:** Control de acceso mediante decoradores `@Roles()` y un `RolesGuard` global.
- **Bypass:** Decorador `@Public()` para liberar endpoints de autenticación y registro.
- **Localización:** Mensajes de error y UI en español formal (Argentina) basado en "Usted".
