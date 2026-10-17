# Iteración 19 — Correcciones de QA (planilla Test C Kendo)

Revisión de los 13 casos de `docs/Test C Kendo - Hoja 1.csv`: cuáles son
comportamiento esperado y cuáles bugs reales, con sus fixes.

## Comportamiento esperado (sin cambios de lógica)

- **TC-01 (login con DNI no numérico → 401):** esperado. El login responde
  siempre `401` genérico para no revelar si el DNI existe ni su formato
  (endurecimiento, iteración 17). Los tests e2e usan DNIs alfanuméricos
  (`nonexistent`, `P123`) y esperan 401/403, por lo que validar formato en
  `LoginDto` rompería la suite. Solo se agregó `inputMode="numeric"` guía.
- **TC-02 (blanqueo con DNI inexistente):** esperado. `requestReset` responde
  idéntico exista o no el DNI (anti-enumeración). La nota del caso ("backend
  devuelve 404") está desactualizada. Se mejoró el frontend para mostrar el
  mensaje del servidor en vez de un genérico.
- **TC-05 (DNI con letras en registro):** no se valida formato por ahora. El
  DNI es identificador opaco (los tests usan `D123`, `RESET01`); exigir solo
  números requeriría migrar datos de test y seeds. Queda como limitación
  conocida; el label ahora dice "solo números" como guía.
- **TC-08 (inscribirse a 2° Dan siendo 3° Dan pendiente):** esperado. La
  inscripción usa el grado **efectivo** (`grad_*`); las aprobaciones pendientes
  no cambian el grado hasta la aprobación general. La confusión es UX (el grado
  pendiente no se muestra).
- **TC-10 (todos en 3° Kyu en Iaido/Jodo):** esperado cuando los participantes
  son `SIN_GRADUACION` en esa disciplina: el grado a rendir es el siguiente
  (`KYU_3`, cubierto por e2e). Backend y frontend computan por disciplina
  (`grad_${disco}`), sin hardcodeo.
- **TC-09 (rangos Iaido/Jodo "reseteados"):** no reproducido en backend: create
  y update persisten `graduaciones_a_rendir` por disciplina sin valores por
  defecto. Se endureció el formulario (actualizaciones funcionales de estado).

## Bugs corregidos

- **TC-03:** el mensaje de éxito del blanqueo quedaba visible al iniciar otra
  acción. `Login.tsx` ahora lo limpia al enviar el login, al re-escribir el DNI
  y antes de cada solicitud.
- **TC-04:** se creaban usuarios con fechas imposibles. Nuevo
  `src/utils/validar-fecha.ts` (`validarFechaNacimiento`: no futura, edad ≤
  120) aplicado en `AuthService.register` y `UsuariosService.updatePerfil`.
- **TC-06:** se creaban usuarios con teléfono con letras. `@Matches` en
  `RegisterUserDto` y `UpdatePerfilDto` (dígitos + `+ - ( ) .` y espacios).
- **TC-07:** el certificado tomaba como fecha de graduación la fecha de carga.
  Nuevo campo opcional `CertificadoExterno.fecha_obtencion` (schema + DTO +
  formulario "Fecha de obtención del grado"); `aprobarGeneral` lo usa para
  `f_grad_*` e historial. Requiere `npx prisma db push` (sin migraciones,
  según convención).
- **TC-11/TC-12:** las fechas mostraban +1 día al editar (se cortaba el ISO en
  UTC con `slice(0, 10)` en vez de fecha local). Nuevo `toDateInputValue()`
  en `EventoForm` para inicio, fin y límites. La comparación del backend ya era
  correcta (el límite es fin del día, inclusivo).
- **TC-13:** el rango a nivel evento se ignoraba cuando había categorías.
  `validarCategorias` ahora lo exige como requisito adicional
  (`validarRangoEvento`) y el formulario lo aclara con un hint.

## Tests

- `auth.e2e-spec.ts`: registro 400 con fecha futura, fecha 1111 y teléfono con
  letras.
- `eventos.e2e-spec.ts`: 403 si cumple la categoría pero no el rango del
  evento; 200 si cumple ambos.
- `certificados.e2e-spec.ts`: `fecha_obtencion` informada llega a
  `f_grad_kendo`; 400 si es futura.

## Verificación pendiente

Sin runtime Node en este entorno no se pudo ejecutar `pnpm test:e2e` ni
`prisma generate`; correr en CI: `pnpm install`, `npx prisma db push`,
`pnpm test:e2e`.
