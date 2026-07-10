# Especificación Técnica - Iteración 7: Mejoras de Eliminación de Eventos

## Objetivo

Rediseñar la eliminación de eventos con validación de integridad (inscripciones aprobadas bloquean el borrado), transaccionalidad, y mejora UX (botón dentro del formulario, separación próximos/pasados).

## Cambios en Backend

### `DELETE /eventos/:id` — Reglas de negocio

| Situación | Comportamiento |
|-----------|----------------|
| Evento sin inscripciones | Se elimina (sin cambios) |
| Evento con inscripciones pendientes/rechazadas | Se eliminan las inscripciones primero, luego el evento (transacción) |
| Evento con inscripciones aprobadas | Se rechaza con 400: "No se puede eliminar el evento porque tiene inscripciones aprobadas" |

### Validación en `EventosService.remove()`

1. Buscar si existe al menos una `InscripcionEvento` con `estado_aprob: 'APROBADO'` para el evento
2. Si existe → `BadRequestException`
3. Si no existe → `$transaction` con `inscripcionEvento.deleteMany` + `evento.delete`

### Notas técnicas

- La FK `InscripcionEvento_evento_id_fkey` no tiene `onDelete: Cascade`
- No se agrega Cascade en schema porque la lógica de negocio (qué inscripciones se borran y cuáles no) va en el service
- Se usa `this.prisma.$transaction` para atomicidad

## Cambios en Frontend

### `EventosAdmin.tsx`

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Botón eliminar | En fila de la tabla (junto a Editar/Publicar) | Solo dentro del formulario de edición |
| Texto del botón | "Eliminar" | "Eliminar permanentemente" (fondo rojo) |
| Confirmación | `confirm()` genérico | Mensaje explícito: incluye "inscripciones pendientes también serán eliminadas" |
| Eventos próximos/pasados | Todos mezclados en una tabla | Tabla principal = próximos (`fecha_inicio >= hoy`); botón "Ver eventos pasados" para alternar |
| Manejo de error 400 | `alert()` genérico | Se muestra en el mismo `formError` del formulario |

### Comportamiento de vistas

- Al cargar, se muestra "Gestión de Eventos" con eventos próximos
- Botón "Ver eventos pasados" cambia el título a "Eventos Pasados" y filtra
- Al crear/editar, los botones de toggle y crear se ocultan (el formulario se muestra debajo de la tabla)

## Tests

### `test/eventos.e2e-spec.ts` — Nuevos casos DELETE

```typescript
it('debería eliminar un evento sin inscripciones')
it('debería eliminar un evento con inscripciones pendientes (limpiándolas)')
it('NO debería eliminar un evento con inscripciones aprobadas')
```

Total tests en eventos: 33 (antes 31)

## Archivos modificados

- `src/eventos/eventos.service.ts` — Lógica de validación + transacción
- `frontend/src/routes/EventosAdmin.tsx` — Botón en formulario + separación vistas
- `test/eventos.e2e-spec.ts` — Tests de los 3 escenarios

## Decisiones técnicas

- **Sin cascade en schema**: La FK `InscripcionEvento` no tiene `onDelete: Cascade` deliberadamente. La lógica de qué inscripciones se eliminan (y cuáles no) se controla en el service.
- **Filtrado en frontend**: `findAllAdmin()` devuelve todos los eventos; el frontend filtra `eventosProximos` vs `eventosPasados` según la fecha. No se agregan query params al backend.
- **Transacción**: `deleteMany` + `delete` envueltos en `$transaction` para evitar estados inconsistentes.
