# Especificación Técnica - Iteración 6: Módulo de Auditoría

> **Estado:** En progreso (sprint activo)

## Objetivo

Implementar un módulo de auditoría que registre automáticamente toda operación de creación, modificación y eliminación sobre las entidades del sistema, capturando quién realizó el cambio, qué cambió (valores previos y nuevos), cuándo ocurrió, y desde qué IP/dispositivo.

## Arquitectura

El sistema usa tres componentes que trabajan en conjunto:

```
HTTP Request → AuditoriaInterceptor → AsyncLocalStorage (contexto)
                                            ↓
DB Query → PrismaClient.$extends (middleware) → lee contexto → escribe AuditLog
```

1. **AuditoriaInterceptor** — NestJS interceptor global. Captura `req.user`, `req.ip`, `req.headers['user-agent']` y los almacena en un `AsyncLocalStorage`.
2. **RequestContextService** — Wrapper tipado sobre `AsyncLocalStorage` para setear/obtener el contexto de la request actual.
3. **PrismaClient.$extends** — Middleware a nivel de cliente Prisma. Intercepta todas las operaciones `create`, `update`, `delete`, `upsert` de todos los modelos. Lee el contexto desde el ALS y escribe una entrada en `AuditLog`.

## Modelo de Datos

### `AuditLog`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | Int (PK) | Autoincremental |
| `accion` | String | CREATE, UPDATE o DELETE |
| `entidad` | String | Nombre del modelo: "Usuario", "Evento", "InscripcionEvento", etc. |
| `entidad_id` | Int | ID del registro afectado |
| `usuario_id` | Int? | ID del usuario que realizó la acción (null para acciones del sistema/seeders) |
| `datos_previos` | Json? | Snapshot del registro antes del cambio (null en CREATE) |
| `datos_nuevos` | Json? | Snapshot del registro después del cambio (null en DELETE) |
| `ip` | String? | Dirección IP del solicitante |
| `user_agent` | String? | User-Agent del navegador/cliente |
| `created_at` | DateTime | Marca de tiempo del cambio |

**Índices:**
- `(entidad, entidad_id)` — búsqueda rápida de cambios sobre un registro
- `(usuario_id)` — búsqueda de acciones de un usuario
- `(created_at)` — ordenamiento temporal

> No se definen claves foráneas explícitas porque `entidad` + `entidad_id` es una referencia polimórfica.

## Endpoints

| Método | Endpoint | Guard | Descripción |
|---|---|---|---|
| `GET` | `/admin/auditoria` | `ADMIN_GENERAL` | Lista paginada con filtros opcionales: `entidad`, `usuario_id?`, `accion?`, `desde?`, `hasta?`, `pagina?` |
| `GET` | `/admin/auditoria/:id` | `ADMIN_GENERAL` | Detalle completo de una entrada |

### Filtros de `GET /admin/auditoria`

| Query Param | Tipo | Descripción |
|---|---|---|
| `entidad` | string | Filtrar por nombre de modelo (Ej: "Usuario") |
| `usuario_id` | int? | Filtrar por usuario que realizó la acción |
| `accion` | string? | Filtrar por tipo: CREATE, UPDATE, DELETE |
| `desde` | string? | ISO date. Filtrar desde esta fecha |
| `hasta` | string? | ISO date. Filtrar hasta esta fecha |
| `pagina` | int? | Número de página (default 1) |
| `limite` | int? | Resultados por página (default 50, max 100) |

## Captura de Datos

### CREATE
- `datos_previos` = null
- `datos_nuevos` = los datos creados (resultado de la query)

### UPDATE
- `datos_previos` = snapshot del registro antes del cambio (se hace una lectura previa)
- `datos_nuevos` = el registro actualizado (resultado de la query)

### DELETE
- `datos_previos` = snapshot del registro antes de eliminar (se hace una lectura previa)
- `datos_nuevos` = null

### UPSERT
- Si se creó un nuevo registro: funciona como CREATE (datos_previos = null)
- Si se actualizó uno existente: funciona como UPDATE (datos_previos = snapshot previo)

### Excepciones
- Las operaciones realizadas desde el propio `AuditoriaService` (para evitar bucles infinitos al escribir logs)
- Las queries de lectura (`findFirst`, `findMany`, etc.) no se interceptan

## Implementación

### Backend

| Archivo | Descripción |
|---|---|
| `prisma/schema.prisma` | Agregar modelo `AuditLog` |
| `src/auditoria/request-context.service.ts` | ALS wrapper para contexto de request |
| `src/auditoria/auditoria.interceptor.ts` | Interceptor global que captura y almacena contexto |
| `src/auditoria/auditoria.service.ts` | Servicio de consulta de logs de auditoría |
| `src/auditoria/auditoria.controller.ts` | Endpoints REST para administración |
| `src/auditoria/auditoria.module.ts` | Módulo NestJS |
| `src/prisma/prisma.service.ts` | Modificar: agregar `$extends` con query logging |
| `src/app.module.ts` | Registrar `AuditoriaModule` y `APP_INTERCEPTOR` |

### Frontend

| Archivo | Descripción |
|---|---|
| `frontend/src/routes/AuditoriaAdmin.tsx` | Página de consulta de logs de auditoría |
| `frontend/src/routes/Dashboard.tsx` | Agregar enlace "Auditoría" en sidebar |

### Tests

| Archivo | Descripción |
|---|---|
| `test/auditoria.e2e-spec.ts` | Tests E2E del módulo de auditoría |

## Casos de Uso (Pruebas E2E)

1. **Crear un usuario** → se genera un AuditLog con accion=CREATE, entidad="usuario" (o Usuario), entidad_id = id del usuario
2. **Actualizar un usuario** → se genera un AuditLog con accion=UPDATE, datos_previos = valores anteriores, datos_nuevos = valores actualizados
3. **Eliminar un usuario** → se genera un AuditLog con accion=DELETE, datos_previos = valores eliminados, datos_nuevos = null
4. **Crear un evento** como ADMIN_ASOCIACION → AuditLog captura usuario_id del creador
5. **Filtros de búsqueda**: entidad, accion, rango de fechas
6. **Sin autenticación** → GET /admin/auditoria retorna 401
7. **Rol BASICO** → GET /admin/auditoria retorna 403
8. **El interceptor no interfiere con rutas @Public()** (login, register funcionan normalmente)

## Criterios de Aceptación (DoD)

- [ ] Toda operación CREATE/UPDATE/DELETE sobre entidades del sistema genera un registro en AuditLog
- [ ] El registro captura usuario, IP, user-agent, valores previos y nuevos
- [ ] No se registran las operaciones de lectura (findMany, findFirst, etc.)
- [ ] Las operaciones de escritura del propio módulo de auditoría no generan bucles infinitos
- [ ] ADMIN_GENERAL puede consultar logs con filtros por entidad, acción, fecha y usuario
- [ ] Los filtros funcionan correctamente (pagina, limite, combinaciones)
- [ ] Usuarios no autenticados no pueden acceder a los endpoints
- [ ] Usuarios con rol BASICO/ADMIN_ASOCIACION no pueden acceder a los endpoints
- [ ] La funcionalidad existente no se ve afectada (tests previos siguen pasando)
- [ ] Frontend: ADMIN_GENERAL ve tabla de logs con filtros en /dashboard/auditoria
- [ ] Mensajes de error en español formal (usted)
- [ ] Tests E2E cubren los flujos principales
