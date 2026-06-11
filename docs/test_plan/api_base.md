**Contexto del Proyecto:** Actúa como un Senior Backend Engineer experto en
NestJS, TypeScript y Testing E2E con Jest y Supertest. Estamos desarrollando una
API REST llamada "Kendo Manager". Necesito implementar la suite de pruebas E2E
(End-to-End) para la "Iteración 1" del proyecto.

**Stack Técnico:**

- NestJS (v10+)
- TypeScript
- Jest + Supertest (para e2e)
- Base de datos relacional (PostgreSQL) usando el ORM configurado en el
  proyecto.

**Instrucciones Generales:**

1. Genera los archivos de prueba E2E (ej. `auth.e2e-spec.ts`,
   `asociaciones.e2e-spec.ts`, `aprobaciones.e2e-spec.ts`).
2. Cada archivo debe configurar un `INestApplication` en el `beforeAll`.
3. Es crítico incluir una lógica de _teardown_ o limpieza de la base de datos
   (limpiar tablas afectadas) en el `beforeAll` o `beforeEach` para garantizar
   que los tests sean idempotentes e independientes.
4. Usa _mocks_ solo si es estrictamente necesario para servicios externos; para
   la base de datos, inserta datos reales de prueba mediante el ORM del
   proyecto.

**Especificación de los Casos de Prueba (Test Cases) a generar:**

**Suite 1: Asociaciones (`/asociaciones`)**

- `GET /asociaciones`: Debe retornar 200 OK y una lista de asociaciones sin
  requerir token (ruta pública).
- `POST /asociaciones`: Debe retornar 401/403 si el usuario no tiene rol
  `ADMIN_GENERAL`. Debe retornar 201 Created si el JWT pertenece a un
  `ADMIN_GENERAL`.
- `PATCH /asociaciones/:id`: Valida la actualización del nombre y restricción de
  roles (`ADMIN_GENERAL`).
- `DELETE /asociaciones/:id`: Valida el soft-delete y restricción de roles
  (`ADMIN_GENERAL`).

**Suite 2: Autenticación y Registro (`/auth`)**

- `POST /auth/register`:
- Retorna 201 Created si los datos son válidos. Verifica en la DB que el usuario
  se creó con rol `BASICO`, estado `PENDIENTE_APROBACION` y graduaciones en
  `SIN_GRADUACION`.
- Retorna 409 Conflict si se intenta registrar un DNI o Email ya existente.

- `POST /auth/login`:
- Retorna 401 Unauthorized para credenciales inválidas.
- Retorna 403 Forbidden si las credenciales son válidas pero el usuario tiene
  estado `PENDIENTE_APROBACION`. El body debe contener un mensaje explicativo.
- Retorna 200/201 con un token JWT si las credenciales son válidas y el usuario
  está `APROBADO`.

**Suite 3: Aprobación de Usuarios (`/usuarios`)** Para esta suite, asume que
existen usuarios creados en la DB con diferentes roles y estados.

- `GET /usuarios/pendientes`:
- Si el token es de un `ADMIN_ASOCIACION` (ej. de la Asociación A), debe
  retornar 200 OK y el JSON solo debe contener usuarios de la Asociación A que
  estén en estado `PENDIENTE_APROBACION`.
- Si el token es de un `ADMIN_GENERAL`, debe retornar 200 OK con todos los
  usuarios pendientes del sistema.

- `PATCH /usuarios/:id/aprobacion`:
- Retorna 403 Forbidden si un `ADMIN_ASOCIACION` (Asociación A) intenta aprobar
  a un usuario de la Asociación B.
- Retorna 200 OK al cambiar el estado de un usuario a `APROBADO`. Verifica en la
  DB que el estado cambió correctamente.

**Entregable esperado:** Escribe el código completo en TypeScript para estos 3
archivos de testing E2E, incluyendo las interfaces/tipos auxiliares si fueran
necesarios para el tipado de las respuestas de Supertest. Usa bloques `describe`
y `it` semánticos y claros.
