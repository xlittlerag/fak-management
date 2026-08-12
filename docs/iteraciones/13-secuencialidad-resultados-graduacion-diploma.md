# Especificación Técnica — Iteración 13: Secuencialidad de Resultados y Graduación efectiva por Diploma

> **Estado:** Implementado
> **Commit:** `123c4fa`
> **Fuente:** Iteración 12 §"Mesas examinadoras" — las instancias se aprueban en orden (práctico → kata → escrito); evolución detectada tras el sprint: hoy se podían marcar etapas posteriores sin haber aprobado las anteriores, y la graduación se efectivizaba en el momento del pago del registro (mesas) en lugar de al emitir el diploma.

## 0. Decisiones de diseño (confirmadas)

1. **Secuencialidad estricta.** Las instancias exigidas para una (disciplina, graduación) se aprueban en el orden que devuelve `instanciasRequeridas` (PRÁCTICO → KATA → ESCRITO). No se puede cargar una instancia `i` si alguna instancia anterior no está `aprobado = true`. Una instancia desaprobada detiene el avance: nada posterior puede estar aprobado.
2. **Editable en ambas direcciones.** El administrador de la federación puede bajar la barra (volver a pendiente etapas posteriores) o corregir un estado erróneo. Invariante de estado garantizada por construcción: las aprobadas forman un **prefijo** `[true..true]`, a lo sumo la primera no-aprobada puede estar `false` (desaprobado), y ninguna posterior tiene valor.
3. **Endpoints de mutación: `avance` atómico + `cargarResultado` con guard.** El frontend utiliza el nuevo `POST /admin/resultados/avance` que reescribe todo el prefijo en una transacción. El endpoint por-instancia se conserva con la regla secuencial como red de seguridad y compatibilidad con la auditoría/existentes.
4. **Graduación efectiva al cargar el diploma (Opción A).** Las mesas solo registran evidencia (editable). La graduación se aplica cuando la federación carga el **Diploma Nacional** de la inscripción de examen, moviéndose la lógica responsable de `registrarPago` (mesas) a `DiplomasService`. Patrón consistente con `certificados.service.ts (aprobarGeneral)`.
5. **Gate del diploma.** Un diploma de una inscripción de examen se rechaza (400 individual / error en lote) si el candidato no tiene **todas las instancias requeridas aprobadas** y el **registro de examen pagado**. No aplica a inscripciones no-examen ni a cargas manuales sin `inscripcion_id` (solo suben el archivo).
6. **Inmutabilidad post-diploma.** Una vez que el diploma efectivizó la graduación (`graduacion_aplicada = true`), se rechaza cualquier edición de resultados de esa disciplina (no se revocan graduaciones otorgadas).
7. **Acceso:** solo `ADMIN_GENERAL` gestiona resultados y diplomas.

## 1. Cambios Backend

### `src/mesas/mesas.service.ts`
- **`cargarResultado`:** tras validar que la instancia es requerida, verifica que todas las anteriores en `instanciasRequeridas` tengan `aprobado = true` (400 *"Debe aprobar Práctico antes de poder cargar Kata"*). Agrega bloqueo si `registroExamen.graduacion_aplicada = true`.
- **`cargarAvance(dto)` (nuevo):** reescribe el estado de una disciplina de forma atómica.
  - Body: `{ inscripcion_id, disciplina, aprobada_hasta?: PRACTICO|KATA|ESCRITO, desaprobada?: PRACTICO|KATA|ESCRITO, mesa_id? }`.
  - Semántica: `aprobada_hasta` fija el último prefijo aprobado (las anteriores se `upsert` en `true`); `desaprobada` marca como `false` la primera no-aprobada (debe ser inmediatamente posterior al prefijo, si no → 400); las posteriores se eliminan (vuelven a pendiente).
  - La asignación de mesa se resuelve **antes** de abrir la transacción (reutilizando `asignarMesa`; 1 compatible → automática, ≥2 requiere `mesa_id`, 0 → 400) para no usar `this.prisma` dentro de `$transaction`.
- **`registrarPago`:** ya no invoca a `aplicarGraduacionSiCorresponde` (que se elimina). Solo marca `pagado = true`.

### `src/mesas/dto/cargar-avance.dto.ts` (nuevo) y `src/mesas/mesas.controller.ts`
- `POST /admin/resultados/avance` (ADMIN_GENERAL), validado con el DTO nuevo.

### `src/diplomas/diplomas.service.ts`
- `validarEvidenciaExamen(inscripcionId, disciplina, graduacion)`: para eventos `EXAMEN`, exige todas las instancias de `instanciasRequeridas` aprobadas + `RegistroExamen.pagado`; si no → `BadRequestException`.
- `aplicarGraduacionPorDiploma(tx, ...)`: actualiza `usuario.grad_*`/`f_grad_*`, crea `HistorialGraduacion` (`otorgado_por: 'Diploma nacional #<id>'`) y marca `graduacion_aplicada = true`.
- `create` y `createLote`: integran el gate y aplican la graduación **dentro de la misma transacción** que crea el `diplomaNacional`. En lote, las fallas se reportan en `errors`.

## 2. Endpoints nuevos/modificados

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/admin/resultados/avance` | **(nuevo)** Reinicia/avanza el prefijo de instancias de una disciplina. Body `{ inscripcion_id, disciplina, aprobada_hasta?, desaprobada?, mesa_id? }` → 201 `{ message }` |
| `POST` | `/admin/resultados` | **(modificado)** + guard secuencial y bloqueo post-diploma (400) |

Sin cambios de schema (no hace falta `prisma db push`): `graduacion_aplicada` ya existía.

## 3. Frontend — `frontend/src/routes/Mesas.tsx`

- Reemplaza los botones Aprobar/Desaprobar por instancia por una **barra de progreso por (candidato, disciplina)**: segundos segmentos con las instancias requeridas (verde = aprobado, rojo = desaprobado, gris = pendiente).
  - Click en un segmento → `aprobada_hasta = instancia` (las anteriores se rellenan solas; posteriores vuelven a pendiente).
  - Botón "Desaprobado"/"Quitar desaprobado" sobre la primera no-aprobada → `desaprobada` con el prefijo anterior.
  - Todo re-editable (bajar la barra o corregir una falla).
- Selector de mesa por (candidato, disciplina) cuando hay 2+ compatibles; se exige al crear nuevas filas.
- Columna "Registro pago" y badge "Pagado y graduado" (ahora se enciende al emitir el diploma).
- Ayuda actualizada: la graduación se efectiviza desde **Diplomas**.

## 4. Tests E2E

- `test/mesas.e2e-spec.ts`:
  - Guard secuencial: KATA sin PRÁCTICO → 400; ESCRITO sin las dos anteriores → 400.
  - Describe `Avance secuencial`: marcar hasta KATA rellena el prefijo; bajar la barra vuelve pendiente; marcar Desaprobado registra la falla; rechaza desaprobar sin prefijo; requiere `mesa_id` con varias mesas; rechaza editar tras diploma (`graduacion_aplicada`).
  - Describe `Registro de pago (graduación diferida al diploma)`: `registrarPago` ya **no** aplica graduación (grad sin cambio, historial vacío, `graduacion_aplicada = false`).
- `test/diplomas.e2e-spec.ts`:
  - Describe `Graduación por diploma`: evidencia completa → 201 + grad/historial/`graduacion_aplicada`; sin evidencia → 400; sin pago → 400; manual sin inscripción → solo upload.
  - Tests previos de inscripción (individual + lote) ahora siembran la evidencia de examen para seguir creando diplomas.

## 5. Estimación / Notas

- ~3–4 días (backend + UI + tests), dificultad media-baja (2.5/5). La máquina de estados pasa de "filas independientes" a "prefijo invariante".

## 6. Criterios de Aceptación (DoD)

- [x] No se puede cargar una etapa posterior sin haber aprobado las anteriores (400), en `cargarResultado` y por construcción en `avance`.
- [x] `POST /admin/resultados/avance` reescribe el prefijo atómicamente; bajar la barra limpia las posteriores; marcar Desaprobado deja las anteriores como prefijo.
- [x] `registrarPago` ya no efectiviza la graduación.
- [x] El diploma de examen aplica la graduación solo con todas las instancias + pago; rechazo claro si no corresponde (400 / error en lote).
- [x] Ediciones de resultados bloqueadas tras la graduación otorgada por diploma.
- [x] Barra de progreso en `Mesas.tsx` reemplaza los botones por instancia.
- [x] Tests E2E actualizados (mesas + diplomas) y suite completa verde.