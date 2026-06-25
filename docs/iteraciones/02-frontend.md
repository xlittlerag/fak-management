# Especificación Técnica - Iteración 2: Frontend Base (Preact)

## 🎯 Objetivo

Construir la interfaz de usuario base con Preact + Vite + Tailwind CSS v4, incluyendo autenticación (login, registro, blanqueo de contraseña), layout administrativo con sidebar dinámico según rol, y vistas básicas (perfil, usuarios pendientes, listado de miembros).

## 🛠️ Stack del Frontend

- **Bundler:** Vite con el plugin `@preact/preset-vite`.
- **Lenguaje:** TypeScript.
- **Enrutador:** `preact-iso`.
- **Estilos:** Tailwind CSS v4.

## 1. Estructura de Archivos

```text
src/
├── assets/          # Recursos estáticos
├── components/      # Componentes UI reutilizables
├── context/         # AuthContext (Estado de sesión y JWT)
├── routes/          # Vistas (Login, Register, Dashboard, etc.)
├── services/        # Cliente API (Axios) con interceptores
├── app.tsx          # Enrutador y redirecciones inteligentes
└── index.css        # Tailwind e importaciones globales
```

---

## 2. Gestión de Autenticación y Estado

### AuthContext
El estado de la sesión se maneja globalmente y provee:
- `user`: Datos del usuario (DNI, Email, Rol, Asociación).
- `login(token)`: Guarda el token y navega al dashboard sin recarga.
- `logout()`: Limpia el almacenamiento y vuelve al login.
- `checkAuth()`: Verifica la existencia de una sesión activa.

### Interceptor de API (`src/services/api.ts`)
- Inyecta el header `Authorization: Bearer <token>`.
- Detecta errores `401 Unauthorized` y redirige al login **solo si** el usuario no se encuentra ya en esa página, evitando bucles de recarga.
- En producción, utiliza rutas relativas (`/`) para facilitar el despliegue unificado.

---

## 3. Especificación de Pantallas y Flujos

### A. Pantalla de Login (`/login`)
- **Acceso:** Ruta por defecto si no hay sesión. Si hay sesión activa, redirige automáticamente al `/dashboard`.
- **Credenciales:** DNI y Contraseña.
- **Funciones:**
  - Botón **"Olvidé mi contraseña"**: Dispara la solicitud de blanqueo de contraseña basada en el DNI ingresado.
  - El sistema muestra mensajes de error descriptivos en español formal (Usted) sin recargar la página.

### B. Pantalla de Registro (`/register`)
- **Campos:** Nombre, Apellido, Email (editable a futuro), DNI (identificador único), Dirección completa (con selector de provincias de Argentina) y Asociación.
- **Feedback:** Redirige al login con mensaje de éxito tras completar el registro.

### C. Dashboard y Vistas Administrativas
Layout unificado con Sidebar dinámico según rol.

#### 📑 Vista: Mi Perfil (`/dashboard/perfil`)
- Permite editar: Nombre, Apellido, Email, Fecha de Nacimiento, Género y Dirección.
- El DNI es de solo lectura.
- Muestra las graduaciones actuales de Kendo e Iaido.

#### 📑 Vista: Usuarios Pendientes (`/dashboard/pendientes`)
- Lista registros y solicitudes de blanqueo que aguardan aprobación.
- Los Administradores de Asociación solo ven sus solicitudes; el Administrador General ve todas.

#### 📑 Vista: Listado de Miembros (`/dashboard/usuarios`)
- Muestra únicamente usuarios con estado **Aprobado**.
- Permite la gestión de graduaciones y promoción de roles (solo para Admin General).

---

## 4. Guía de Estilos (Tailwind)
- Diseño sobrio y administrativo.
- Tipografía: `font-sans` para legibilidad general y `font-mono` para DNI y códigos.
- Interactividad: Botones con estados `hover` y `disabled` claros para mejorar la experiencia de usuario.

## 5. Criterios de Aceptación (DoD)

- [x] Login con DNI y contraseña, manejo de errores en español formal.
- [x] Registro con todos los campos requeridos y selector de provincias.
- [x] AuthContext global con login, logout, checkAuth.
- [x] Interceptor HTTP que inyecta JWT y redirige al login en 401.
- [x] Layout con sidebar dinámico según rol (Admin General vs Admin Asociación vs Usuario).
- [x] Vista de perfil con edición de datos personales (DNI de solo lectura).
- [x] Vista de usuarios pendientes con filtro por asociación.
- [x] Vista de listado de miembros (solo aprobados).
- [x] Rutas protegidas, redirección inteligente según sesión.
- [x] Diseño responsive con Tailwind CSS v4.
