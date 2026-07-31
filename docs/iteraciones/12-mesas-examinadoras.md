# Especificación Técnica — Iteración 12: Mesas Examinadoras

> **Estado:** Implementado
> **Commit:** `69aaaa9`
> **Fuente:** `docs/requerimiento.md` §"Mesas examinadoras (iteración futura)" — "Permitir la carga de aprobados y desaprobados por instancia de examen (práctico → kata → escrito). Registrar las distintas mesas examinadoras del día con: Nombres de los examinadores (texto libre, un input por mesa), Rango de graduación que examinó cada mesa. Al cargar el resultado de un candidato: si solo hay una mesa para su graduación, se asigna automáticamente. Si hay dos o más mesas compatibles, el administrador general debe seleccionar la mesa."

## 0. Decisiones de diseño (confirmadas)

1. **Instancias por (disciplina, graduación a rendir).** No todas las graduaciones rinden las mismas instancias:
   - **KENDO:** `KYU_3`/`KYU_2` → `PRACTICO` · `KYU_1` → `PRACTICO`+`KATA` · `DAN_*` → `PRACTICO`+`KATA`+`ESCRITO`.
   - **IAIDO/JODO:** no hay instancia práctica; `KYU_*` → `KATA` · `DAN_*` → `KATA`+`ESCRITO`.
   - Se modela como constante en código (`src/eventos/config/instancias-examen.ts`), siguiendo el patrón de `requisitos-examen.ts`.
2. **Mesa ligada a disciplina.** Una mesa examinadora cubre una disciplina específica (`Disciplina`) y un rango de graduación (`grad_min`/`grad_max`). Una mesa de Kendo no examina Iaido.
3. **Registro pagado por disciplina.** El registro (`costo_registro` de `PrecioExamen`) se carga por cada (candidato, disciplina). Un candidato que rinde Kendo e Iaido tiene dos registros.
4. **Graduación automática.** Al aprobar **todas** las instancias requeridas de una disciplina **y** registrar el pago del registro de esa disciplina, la graduación del usuario se actualiza automáticamente (campo `grad_<disciplina>`/`f_grad_<disciplina>`) y se crea `HistorialGraduacion`. Idempotente vía flag `graduacion_aplicada`.
5. **Pago de registro fuera del sistema.** El cobro ocurre durante el evento, por fuera; el administrador de la federación lo carga a posteriori en el sistema.
6. **Sin notificaciones por email.** El flujo se ve en el dashboard y en la auditoría existente.
7. **Acceso:** solo `ADMIN_GENERAL` gestiona mesas, resultados y registros.

## 1. Modelos de Base de Datos

```prisma
enum InstanciaExamen {
  PRACTICO
  KATA
  ESCRITO
}

model MesaExaminadora {
  id           Int               @id @default(autoincrement())
  evento_id    Int
  disciplina   Disciplina
  examinadores Json               // string[] de nombres (texto libre, un input por mesa)
  grad_min     String
  grad_max     String
  created_at   DateTime          @default(now())
  updated_at   DateTime          @updatedAt
  evento       Evento            @relation(fields: [evento_id], references: [id], onDelete: Cascade)
  resultados   ResultadoExamen[]
}

model ResultadoExamen {
  id            Int               @id @default(autoincrement())
  inscripcion_id Int
  disciplina    Disciplina
  instancia     InstanciaExamen
  mesa_id       Int?
  aprobado      Boolean           @default(false)
  cargado_por   Int               // Usuario.id que cargó el resultado
  created_at    DateTime          @default(now())
  updated_at    DateTime          @updatedAt
  inscripcion   InscripcionEvento @relation(fields: [inscripcion_id], references: [id], onDelete: Cascade)
  mesa          MesaExaminadora?  @relation(fields: [mesa_id], references: [id])

  @@unique([inscripcion_id, disciplina, instancia])
}

model RegistroExamen {
  id                  Int               @id @default(autoincrement())
  inscripcion_id      Int
  disciplina          Disciplina
  pagado              Boolean           @default(false)
  graduacion_aplicada Boolean           @default(false)  // idempotencia
  updated_at          DateTime          @updatedAt
  inscripcion         InscripcionEvento @relation(fields: [inscripcion_id], references: [id], onDelete: Cascade)

  @@unique([inscripcion_id, disciplina])
}
```

- La **graduación a rendir** ya está en `InscripcionEvento.categoria_grad` (array alineado con `disciplinas[]`, calculado por `computeCategoriasExamen` al inscribirse) — no requiere campo nuevo.
- Aplicar con `npx prisma db push` (convención del repo, sin migrations).

## 2. Regla de instancias (`src/eventos/config/instancias-examen.ts`)

```ts
// KENDO: KYU_3/KYU_2 → PRACTICO · KYU_1 → PRACTICO+KATA · DAN_* → PRACTICO+KATA+ESCRITO
// IAIDO/JODO: KYU_* → KATA · DAN_* → KATA+ESCRITO
instanciasRequeridas(disciplina, graduacion): InstanciaExamen[]
```

Se usa para validar al cargar resultados (rechazar una instancia no requerida para esa disciplina/graduación) y para determinar cuándo se completó el examen.

## 3. Endpoints (nuevo módulo `MesasModule`, todos `@Roles(ADMIN_GENERAL)`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/admin/eventos/:id/mesas` | Crear mesa. Body `{ disciplina, examinadores: string[], grad_min, grad_max }`. Valida rango dentro de `graduaciones_a_rendir` del examen y `grad_min <= grad_max` |
| `GET` | `/admin/eventos/:id/mesas` | Listar mesas del evento |
| `PATCH` | `/admin/mesas/:id` | Editar examinadores y/o rango (y disciplina) |
| `DELETE` | `/admin/mesas/:id` | Eliminar; bloqueado (409) si la mesa tiene resultados cargados |
| `GET` | `/admin/examenes/:id/resultados` | Candidatos (inscripciones `APROBADO`) agrupados por (candidato, disciplina): graduación target, instancias requeridas con estado, mesa asignada, registro pagado, graduación aplicada |
| `POST` | `/admin/resultados` | Cargar/actualizar resultado. Body `{ inscripcion_id, disciplina, instancia, aprobado, mesa_id? }`. Asignación de mesa: 0 compatibles → 400; 1 → automática; ≥2 → requiere `mesa_id`. Rechaza instancias no requeridas |
| `POST` | `/admin/inscripciones/:id/registro-pagado` | Marcar registro pagado. Body `{ disciplina }`. Dispara la aplicación de graduación si corresponde |

**Compatibilidad de mesa:** mesas del evento con `disciplina` igual y `rankGrad(grad_min) <= rankGrad(target) <= rankGrad(grad_max)`. Reutilizar `rankGrad` (ya existe en `eventos.service.ts`).

**`aplicarGraduacionSiCorresponde(inscripcion, disciplina)`** (transacción): valida que todas las instancias requeridas de esa disciplina tengan `ResultadoExamen.aprobado = true` **y** `RegistroExamen.pagado = true` **y** `!graduacion_aplicada`. Si aplica: `usuario.grad_<disciplina> = target`, `f_grad_<disciplina> = now`, crea `HistorialGraduacion` (`disciplina`, `graduacion`, `fecha_obtencion`, `otorgado_por: 'Mesa examinadora'`, patrón de `certificados.service.ts:133`), y setea `graduacion_aplicada = true`.

## 4. Cambios en lógica existente

- **`src/prisma/prisma.service.ts`:** agregar `'mesaExaminadora'`, `'resultadoExamen'`, `'registroExamen'` a `MODEL_NAMES` para que la auditoría automática (`$extends`) y las extensiones cubran los modelos nuevos.
- **Auditoría:** sin cambios — `$extends` ya registra `create`/`update` de los modelos nuevos.

## 5. Frontend

- **`routes/Dashboard.tsx`:** nuevo ítem de menú para `ADMIN_GENERAL` ("Mesas examinadoras", `/dashboard/mesas`).
- **`routes/EventosAdmin.tsx`:** botón "Mesas" por fila, visible solo en eventos `tipo === 'EXAMEN'` → `route('/dashboard/mesas?eventoId=X')`.
- **`routes/Mesas.tsx` (nuevo, `ADMIN_GENERAL`):**
  - **Sección A — Mesas:** listar, crear y editar mesas con inputs dinámicos de examinadores + disciplina + `grad_min`/`grad_max`; eliminar con `ConfirmModal`.
  - **Sección B — Resultados:** tabla de candidatos por disciplina con instancias requeridas (badge por instancia aprobado/desaprobado/pendiente), toggle aprobar/desaprobar por instancia, selector de mesa cuando hay 2+ compatibles, botón "Registro pagado" por disciplina y estado "Graduación aplicada".
- Reutilizar `Spinner`, `ConfirmModal`, `Pagination` y el patrón de estilos existente (Tailwind).

## 6. Archivos del módulo

**Backend:** `prisma/schema.prisma`, `src/eventos/config/instancias-examen.ts` (nuevo), `src/mesas/{mesas.module,mesas.controller,mesas.service}.ts` (nuevos), `src/mesas/dto/*.ts` (nuevos), `src/prisma/prisma.service.ts`, `src/app.module.ts`.

**Frontend:** `routes/Dashboard.tsx`, `routes/EventosAdmin.tsx`, `routes/Mesas.tsx` (nuevo).

**Tests:** `test/mesas.e2e-spec.ts` (nuevo).

## 7. Criterios de Aceptación (DoD)

- [x] CRUD de mesas con validación de rango dentro de `graduaciones_a_rendir` del examen y `grad_min <= grad_max`; borrado bloqueado si la mesa tiene resultados.
- [x] Asignación automática de mesa con 1 sola compatible; error con 0; selección manual con 2+.
- [x] Solo se pueden cargar las instancias requeridas para la (disciplina, graduación) del candidato (p.ej. KYU_2 Kendo solo acepta PRACTICO; KYU_1 Kendo acepta PRACTICO+KATA y rechaza ESCRITO; DAN acepta las tres; Iaido/Jodo sin PRACTICO).
- [x] Al aprobar todas las instancias de una disciplina + registro pagado → `grad_<disciplina>` y `f_grad_<disciplina>` actualizados, `HistorialGraduacion` creado, idempotente (no se duplica).
- [x] Carga de registro por disciplina; la graduación solo se aplica en la disciplina correspondiente.
- [x] Permisos: `ADMIN_ASOCIACION` no puede crear mesas ni cargar resultados (403).
- [x] Auditoría: creación/actualización de mesas, resultados y registros generan logs.
- [x] Mensajes de error en español formal (Usted).
- [x] Tests E2E cubren los flujos principales.

## 7bis. Notas de implementación

- `disciplina` se modela como `String` (no enum) para los tres modelos, consistente con `Torneo.disciplina` / `Seminario.disciplina` / `Examen`.
- Los timestamps usan `createdAt` (camelCase) y `cargado_por` es opcional (`Int?`).
- `ResultadoExamen.mesa` usa `onDelete: Cascade` (el servicio ya bloquea el borrado con resultados cargados vía 409).
- `aplicarGraduacionSiCorresponde` se ejecuta de forma secuencial sobre `this.prisma` (no en `$transaction`) para conservar los logs de auditoría automática de los modelos intervinientes.
- El shape de `GET /admin/examenes/:id/resultados` es: candidato → `instancias[]` planas (cada fila lleva `disciplina`, `graduacion`, `instancia`, `aprobado` —`null` = sin cargar—, `mesa_id`, `registro_pagado`, `graduacion_aplicada`), sin agrupar por disciplina.
- `test/test-utils.ts`: `createTestApp` sobreescribe `ThrottlerStorage` para que el rate-limit global (30 req/60s por ruta) no afecte a los e2e.

## 8. Tests E2E (`test/mesas.e2e-spec.ts`)

1. CRUD de mesas: crear (rango válido), editar, eliminar.
2. Crear mesa con rango fuera del examen → 400; `grad_min > grad_max` → 400.
3. Eliminar mesa con resultado cargado → 409.
4. Cargar resultado con 1 mesa compatible → se asigna automáticamente.
5. Cargar resultado sin mesa compatible → 400.
6. Cargar resultado con 2+ mesas compatibles y sin `mesa_id` → 400; con `mesa_id` → OK.
7. Validación de instancias: KYU_2 Kendo rechaza KATA/ESCRITO; KYU_1 Kendo rechaza ESCRITO; DAN Kendo acepta las 3; Iaido/Jodo rechazan PRACTICO.
8. Flujo completo: inscribir → aprobar inscripción → crear mesas → cargar todas las instancias aprobadas + registro pagado → graduación del usuario actualizada + `HistorialGraduacion` creado.
9. Idempotencia: recargar el mismo resultado no duplica la graduación.
10. Multi-disciplina: aprobar Kendo y no Iaido → solo se aplica Kendo.
11. `ADMIN_ASOCIACION` intenta crear mesa → 403.
12. Auditoría: `GET /admin/auditoria` refleja la creación de mesa/resultado.

## 9. Estimación

~6–8 días de trabajo (schema + backend + frontend + tests e2e), dificultad media (3/5). Sin integraciones externas; la complejidad está en la máquina de estados de resultados parciales por instancia y la asignación de mesa.
