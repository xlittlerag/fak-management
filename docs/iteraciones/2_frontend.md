# Especificación Técnica - Iteración 2: Frontend Base (Preact)

## 🛠️ Stack del Frontend

- **Bundler:** Vite con el plugin `@preact/preset-vite` (configuración SPA
  estándar).
- **Lenguaje:** TypeScript.
- **Enrutador:** `preact-iso` (el enrutador oficial y minimalista de Preact) o
  `wouter` (ultra ligero y compatible).
- **Estilos:** Tailwind CSS (diseño sobrio, sin librerías de componentes
  pesadas).

---

## 1. Estructura de Archivos Recomendada

Al usar Preact, mantenemos la estructura limpia y directa:

```text
src/
├── assets/          # Logo FAK, etc.
├── components/      # Botones, Tablas, Inputs reutilizables (puros funcionales)
├── context/         # AuthContext (guarda el estado del JWT)
├── routes/          # Pantallas (Login, Register, Dashboard, etc.)
├── services/        # Cliente HTTP (Fetch o Axios) e integración con la API
├── app.tsx          # Enrutador principal y layouts
└── index.css        # Directivas de Tailwind
```

---

## 2. Gestión de Autenticación y Estado Centralizado

### AuthContext (Preact Context)

El estado de la sesión se manejará en un contexto global que proveerá:

- `user`: Objeto decodificado del JWT (contiene `id`, `rol`, `asociacion_id`).
- `token`: El string del JWT (guardado en `localStorage` o Cookies).
- `login(token)`: Función para guardar el token, decodificarlo y redirigir al
  `/dashboard`.
- `logout()`: Función para limpiar el almacenamiento y redirigir al `/login`.

### Interceptor de API (`src/services/api.ts`)

Un cliente HTTP unificado que haga lo siguiente de manera transparente:

1. **Request:** Antes de salir, si hay un token en el estado, inyecta el header
   `Authorization: Bearer <token>`.
2. **Response Error:** Si la API responde con un `401 Unauthorized`, gatilla
   automáticamente la función `logout()` del contexto para evitar estados
   inconsistentes en la UI.

---

## 3. Especificación de Pantallas y Flujos

### A. Pantalla de Registro (`/register`)

- **Layout:** Caja centrada en pantalla con fondo gris claro (`bg-slate-50`).
- **Lógica:** * Al montar el componente (`useEffect`), realiza un
  `GET /asociaciones`.
- Si la API falla, muestra un mensaje de error crítico. Si tiene éxito,
  renderiza un elemento `<select>` con las opciones.

- **Campos del Formulario:** Nombre, Apellido, Email, Contraseña, DNI, Fecha de
  Nacimiento, Género (Select) y Asociación (Select).
- **Feedback:** Al recibir un `201 Created`, redirige a
  `/login?registered=true`.

### B. Pantalla de Login (`/login`)

- **Lógica:**
- Si en la URL viene el parámetro `?registered=true`, muestra un banner verde
  estático: _"Registro exitoso. Tu cuenta aguarda la aprobación del
  administrador de tu asociación."_
- Si la API devuelve un `403 Forbidden` al intentar loguearse, muestra un banner
  rojo estático: _"Acceso denegado: tu cuenta sigue pendiente de aprobación."_
- Si devuelve `200`, ejecuta `login(token)`.

### C. Layout de Dashboard Protegido (`/dashboard/*`)

Una vez logueado, la interfaz cambia a un layout administrativo clásico: una
barra lateral izquierda (`sidebar`) de navegación oscura (`bg-slate-900`) y un
panel central de contenido blanco con scroll independiente.

La barra lateral mostrará opciones dinámicamente según el rol inyectado en el
contexto:

- **Todos:** Datos Personales / Inicio.
- **ADMIN_ASOCIACION o ADMIN_GENERAL:** "Usuarios Pendientes" y "Listado de Miembros".
- **ADMIN_GENERAL:** "Gestionar Usuarios" y "Gestionar Asociaciones".

#### 📑 Vista: Listado de Miembros (`/dashboard/usuarios`)
- Visible para `ADMIN_ASOCIACION` (solo sus miembros) y `ADMIN_GENERAL` (todos).
- Lista usuarios aprobados.
- Para `ADMIN_GENERAL`, permite:
  - Botón **"Hacer Admin de Asociación"**.
  - Botón **"Asignar Graduación"**: Abre un modal o formulario para setear graduación de Kendo/Iaido y fecha de obtención.

#### 📑 Vista: Mi Perfil (`/dashboard/perfil`)
- Muestra datos personales y **graduaciones actuales** (solo lectura para graduaciones).

#### 📑 Vista: Usuarios Pendientes (`/dashboard/pendientes`)

- Al cargar, dispara `GET /usuarios/pendientes`.
- **Diseño de Tabla:** Estilo administrativo rígido. Columnas: `Usuario`
  (Nombre + Apellido), `DNI`, `Email`.
- **Acciones:**
- Botón **"Aprobar"** (`bg-green-600 hover:bg-green-700 text-white`): Envía el
  `PATCH` a la API. Al recibir el éxito, filtra el estado local de la lista para
  remover esa fila inmediatamente sin recargar la página.
- Botón **"Rechazar"** (`bg-red-600 hover:bg-red-700 text-white`).

#### 🏢 Vista: Gestión de Asociaciones (`/dashboard/asociaciones`)

- **Sección Superior:** Un input de texto simple al lado de un botón "Añadir
  Asociación". Al hacer click, envía `POST /asociaciones` y recarga la lista
  local.
- **Tabla Principal:** Listado de asociaciones. Cada fila cuenta con:
- Botón **"Editar"**: Transforma el texto de la fila en un input inline para
  modificar el nombre y confirmar el cambio con un botón "Guardar" (`PATCH`).
- Botón **"Eliminar"** (`DELETE`).

---

## 4. Guía de Estilos y UX Administrativa (Tailwind)

Para mantener la premisa de **simpleza absoluta y rendimiento extremo**:

- **Fuentes:** Usa la fuente del sistema (`font-sans`). Para tablas de datos,
  DNI y fechas, usa `font-mono` para asegurar que los números queden
  perfectamente alineados verticalmente.
- **Estados de Carga:** Mientras se espera la respuesta de la API (`loading`),
  simplemente deshabilita los botones (`disabled:opacity-50`) y cambia el cursor
  a `cursor-not-allowed`. Evitamos meter animaciones de spinners complejas si no
  son necesarias.
- **Estructura de Tablas:** Usa las clases de Tailwind de manera limpia:

```html
<table class="w-full text-left border-collapse">
  <thead class="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm">...
```
