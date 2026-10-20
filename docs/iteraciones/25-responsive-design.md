# Iteración 25 — Diseño responsive del frontend

## Contexto

El frontend ya era funcional en desktop, pero no estaba preparado para anchos
pequeños: tablas con scroll horizontal, grillas fijas de dos columnas, botones
por debajo de 44 px, tipografía de formularios a 14 px y headers que se
comprimían en 320 px. Se aplicó el sub-skill `responsive-design` a todo el
frontend, con enfoque mobile-first.

## Decisiones

- **Rango de anchos:** 320, 768, 1024, 1280 y 1536 px.
- **Tablas:** en `<768px` cada fila se convierte en tarjeta; desde 768 px
  recuperan el comportamiento nativo de tabla. El usuario eligió este patrón
  para todas las tablas.
- **Etiquetas sin duplicar markup:** `lib/responsive-tables.ts` copia el texto
  de `<thead>` a `data-label` en cada `<td>`. Un `MutationObserver` cubre tablas
  y filas renderizadas después de cargar datos. Las celdas con `colspan`
  (estados vacíos) no llevan etiqueta.
- **Targets táctiles:** en móvil, botones, inputs, selects y textareas tienen
  `min-height` y `min-width` de 44 px. Los inputs usan 16 px para evitar el zoom
  automático de iOS. En desktop se mantiene la densidad original: los botones
  vuelven a su altura natural y los campos a 36 px.
- **Tipografía fluida:** tokens `--text-fluid-lg/xl/2xl/3xl` con `clamp()` en
  `@theme`, usados en títulos de páginas, paneles y shells.
- **Layouts:** `min-h-dvh` en shells y páginas públicas; sidebar de 256 px con
  `max-w-[85vw]`; headers con `flex-wrap`; grillas fijas reemplazadas por
  `grid-cols-1` + breakpoint; tarjetas con padding `p-4/p-5` y `sm:p-6`.

## Cambios

- `src/index.css`: tokens fluidos, `.table-cards` con restauración desktop vía
  `revert-layer`, empty states sin tarjeta, targets táctiles globales y
  `.touch-target`.
- `src/lib/responsive-tables.ts` + `src/main.tsx`: inicialización del modo
  tarjeta y observer para contenido dinámico.
- Primitivas `Button`, `Field`, `Modal`, `Pagination`, `Panel`, `PageHeader`:
  alturas táctiles, títulos fluidos, headers y acciones adaptables.
- Shells `AuthLayout`, `StatusPage` y `Dashboard`: `dvh`, paddings móviles,
  sidebar off-canvas y header con menú.
- Páginas públicas y de dashboard: `Eventos`, `EventoDetalle`, `_404`,
  `Dashboard`, `EventosDashboard`, `EventosAdmin`, `InscripcionesAdmin`,
  `MisInscripciones`, `Perfil`, `Usuarios`, `Mesas`, `AuditoriaAdmin`,
  `AdminConfig`, `Admin2FA`, `Asociaciones` y `FileUpload`.
- `e2e/flows/06-responsive.spec.ts`: matriz de 5 viewports. Verifica overflow
  horizontal, imágenes fuera de viewport, controles menores a 44 px, inputs
  menores a 16 px y tablas sin modo tarjeta.

## Verificación

- `pnpm --dir frontend run lint` OK.
- `pnpm --dir frontend run build` OK.
- `pnpm --dir frontend run e2e -- --reporter=line`: **31 passed, 3 skipped**
  (los 3 skipped son los tests de performance, que requieren `PERF=1`).
- Revisión visual con capturas a 320 px y 1280 px: tablas como tarjetas,
  etiquetas legibles, acciones apiladas y tablas desktop restauradas sin filas
  infladas.

## Tradeoffs

- El modo tarjeta depende de JavaScript. Si el script no corre, la tabla
  conserva su layout nativo con scroll horizontal, sin romper la página.
- Las reglas táctiles globales ganan a las utilidades de Tailwind; por eso los
  botones de tabla en desktop se excluyen del mínimo de 36 px para no aumentar
  la altura de las filas.
- No se agregó un viewport táctil real a Playwright: la suite valida por ancho,
  que es la condición que define el modo tarjeta.
