# Iteración 21 — Rendimiento

Optimización del rendimiento en cinco ejes, midiendo **antes y después** de
cada uno: bundle/lazy loading, requests + caching, re-renders, queries/N+1 e
imágenes/fuentes/scripts.

## Instrumentación

- `frontend/e2e/perf/performance.spec.ts`: harness de Core Web Vitals (LCP, CLS,
  FCP, TTFB) y costo de red por recurso vía CDP de Chromium. Corre sólo con
  `PERF=1`; escribe un JSON por escenario en `frontend/perf-results/`.
- `frontend/perf-budget.json`: umbrales que el harness valida **sólo** contra el
  build de producción (`PERF_BASE_URL`).
- Scripts: `pnpm build:stats` (rollup-plugin-visualizer → `dist/stats.html`) y
  `pnpm perf`.
- Reproducir medición de producción:

  ```bash
  cd frontend && pnpm build
  # backend sirviendo dist en :3000 (p. ej. `pnpm start`)
  PERF_BASE_URL=http://localhost:3000 PERF=1 pnpm e2e -- e2e/perf/performance.spec.ts
  ```

## Fase 1 — Índices, selects y PRAGMAs (backend)

- `prisma/schema.prisma`: índices en columnas de filtro/join calientes
  (`Usuario.estado_reg`, `Usuario.asociacion_id+rol+estado_reg`,
  `Evento.publicado+fecha_inicio`, `InscripcionEvento.evento_id`,
  `InscripcionEvento.evento_id+estado_aprob`, `CertificadoExterno.usuario_id+estado`,
  `DiplomaNacional.usuario_id`, etc.). Aplicado con `prisma db push`.
- Verificado con `EXPLAIN QUERY PLAN`: las 7 consultas clave pasan de `SCAN` a
  `SEARCH … USING INDEX`.
- `eventos.service.ts`: `include` completos (`usuario`/`evento`) reemplazados por
  selects acotados + `take: 500` en listados; `certificados`, `diplomas` y
  `afiliaciones` con `take` defensivo.
- `prisma.service.ts`: `PRAGMA journal_mode = WAL` y `synchronous = NORMAL` +
  `timeout` del adapter.
- Auditoría: se mantiene el `auditLog.create` síncrono (es una feature de
  trazabilidad); su costo quedó acotado por los índices nuevos.

## Fase 2 — Bundle y lazy loading

- `app.tsx`: todas las rutas pasan a `lazy(() => import(...))` (preact-iso).
- `Dashboard.tsx`: las 19 secciones internas pasan a chunks on-demand con
  `<Suspense>`.
- `vite.config.ts`: `manualChunks` separa `node_modules` en un chunk `vendor`
  cacheable.
- Eliminados assets muertos (`public/icons.svg`, `src/assets/*`).

| | Antes | Después |
| --- | --- | --- |
| JS inicial (gzip) | 267.84 kB (66.01 kB) | entry 5.60 kB (2.41) + vendor 71.42 kB (27.33) = **−55 % gzip** |
| Chunks de ruta | — | 30+ (0.38–22.92 kB c/u), bajo demanda |
| CSS (gzip) | 35.07 kB (6.89) | 33.39 kB (6.64) |

## Fase 3 — Requests y caching

- `services/api.ts`: `apiGet<T>()` con cache TTL en memoria + dedupe de requests
  en vuelo, invalidado ante cualquier mutación. Cachea `/eventos`,
  `/precios-examen` y `/mis-inscripciones` (antes se pedían repetidamente al
  navegar Inicio → Eventos → Detalle).
- `main.ts`: middleware `compression` (gzip) para JSON de API y assets.

## Fase 4 — Re-renders

- `AuthContext.tsx`: `useMemo`/`useCallback` para estabilizar el value del
  provider y `refresh`/`logout`/`checkAuth`; evita re-renderizar a todos los
  consumidores cuando cambia el proveedor sin cambiar la sesión.

## Fase 5 — Fuentes y scripts

- Fuentes Zen (Kaku Gothic New 400/500/700, Old Mincho 500/700) self-hosted como
  WOFF2 subset **latin** en `frontend/public/fonts/` + `@font-face` en
  `index.css`. Se eliminan los `<link>` a `fonts.googleapis.com` y
  `fonts.gstatic.com` (orígenes terceros en el path crítico).
- SDK de Mercado Pago: deja de cargarse en el `<head>` de todas las páginas;
  `lib/mercadopago.ts` lo inyecta on-demand en el primer checkout.

## Resultado (producción, Chromium, localhost)

JS de la ruta crítica (transfer, gzip):

| Escenario | JS antes | JS después | Orígenes terceros |
| --- | --- | --- | --- |
| Login | 64 kB | 37 kB | 2 → **0** |
| Dashboard básico | 64 kB | 44 kB | 2 → **0** |
| Dashboard admin | 64 kB | 50 kB | 2 → **0** |

- LCP/CLS se mantienen (LCP < 100 ms en localhost; CLS 0.0028, muy por debajo
  de 0.1). La cantidad de requests sube por el chunk splitting (HTTP/1.1 local);
  tras la primera navegación los chunks quedan en cache.
- `pnpm e2e` completo (16 tests funcionales) pasa sin regresiones.

## Archivos

- Backend: `prisma/schema.prisma`, `src/prisma/prisma.service.ts`,
  `src/eventos/eventos.service.ts`, `src/{certificados,diplomas,afiliaciones}/*.service.ts`,
  `src/main.ts` (+ dep `compression`).
- Frontend: `src/app.tsx`, `src/routes/*`, `src/services/api.ts`,
  `src/context/AuthContext.tsx`, `src/lib/mercadopago.ts`, `src/index.css`,
  `index.html`, `vite.config.ts`, `public/fonts/*`, `e2e/perf/performance.spec.ts`,
  `perf-budget.json`, `playwright.config.ts` (soporte `PERF_BASE_URL`).

## Notas

- `multer` se importa directo pero es dep transitiva de `@nestjs/platform-express`;
  `node dist/main.js` no la resuelve (funciona bajo `nest start`). Fuera del
  alcance de esta iteración; conviene declararla como dependencia directa.
