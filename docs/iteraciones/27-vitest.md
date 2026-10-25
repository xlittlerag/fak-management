# Iteración 27 — Migración de Jest a Vitest

## Contexto

La suite de tests corría con **Jest 30 + ts-jest**: 17 suites E2E (251 tests) y
2 specs unitarios (23 tests). ts-jest transpila con la API de TypeScript, lo que
agrega un árbol de dependencias grande y un paso de transformación lento, además
de atar la versión de `typescript` al peer de ts-jest (`>=4.3 <7`).

El frontend ya usa **Vite**, así que Vitest comparte el mismo pipeline de
transformación y resolución. El objetivo fue migrar los tests sin cambiar su
comportamiento, sacar las dependencias que quedaban sin uso y mantener (mejorar,
en realidad) el gate de tipos sobre `test/`.

## Cambios

### Dependencias

| Acción    | Paquetes                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Agregados | `vitest`, `@vitest/coverage-v8`, `unplugin-swc`                                                                                  |
| Quitados  | `jest`, `ts-jest`, `@types/jest`, `ts-node`, `ts-loader`, `tsconfig-paths`, `source-map-support`                                 |

Neto: **−219 snapshots** en `pnpm-lock.yaml` (1198 → 979); pnpm reportó 208
paquetes removidos y 39 agregados. `@swc/core` y `@swc/cli` se mantienen: los
usa el builder SWC de Nest y `unplugin-swc`.

### Configuración (`vitest.config.mts`)

- **`unplugin-swc`** como transformador. Esbuild (el default de Vite/Vitest) no
  emite `design:paramtypes`, la metadata que NestJS usa para resolver la
  inyección de dependencias. El plugin lee `experimentalDecorators` y
  `emitDecoratorMetadata` del `tsconfig.json`.
- **Dos proyectos**: `unit` (`src/**/*.spec.ts`) y `e2e`
  (`test/**/*.e2e-spec.ts`). Permiten conservar los comandos separados y que
  `pnpm test:e2e test/<archivo>` siga filtrando un solo archivo.
- **Ejecución serial** (`fileParallelism: false`, `pool: 'forks'`): todas las
  suites comparten la misma base SQLite y hacen `cleanupDb()` en `beforeEach`;
  correrlas en paralelo las rompería. Es el equivalente a `--runInBand`.
- `globals: true` para conservar `describe`/`it`/`expect`/`vi` sin imports.
- Timeouts explícitos (`testTimeout: 15s`, `hookTimeout: 30s`): levantar una app
  Nest completa por suite puede superar los 5 s por defecto de Jest.

### Mocks

`jest.spyOn` → `vi.spyOn` en las 11 ocurrencias (pagos, diplomas,
certificados, afiliaciones, notificaciones, eventos). Vitest tipa
`mockImplementation` de forma más estricta que Jest, así que dos mocks que
devolvían un objeto plano pasaron a ser `async` (el servicio real devuelve
`Promise`).

### Typecheck de tests

`ts-jest` no estaba typechequeando `test/` (el `tsconfig.json` tiene
`isolatedModules: true`), y `pnpm run typecheck` usa `tsconfig.build.json`, que
excluye `test/`. Se agregó:

- `tsconfig.test.json` (extiende el base, agrega `vitest.config.mts` al typecheck).
- `types: ["node", "vitest/globals"]` en el `tsconfig.json` base, para que el
  editor y ambos typechecks reconozcan `describe`/`it`/`expect`/`vi` (antes
  venían de `@types/jest`).
- Script `typecheck:test` con TypeScript 7 nativo.
- El script entra en `preflight` y en el job `lint` de CI.

El nuevo gate destapó **5 errores preexistentes**, ya corregidos: tres
asignaciones de `set-cookie` (tipado `string` en supertest) y dos mocks no
`async`.

### CI

- Se agregó `pnpm run typecheck:test` al job `lint`.
- Se agregó `pnpm test` (unitarios) al job `test`, que antes solo corría E2E.
- El job `test` sigue corriendo `pnpm run test:e2e` sin cambios de entorno.

### Lint

`.oxlintrc.json`: `env.jest` → `env.vitest`.

## Resultados

| Métrica                | Valor                                          |
| ---------------------- | ---------------------------------------------- |
| Tests unitarios        | 23/23 en **~1,4 s** (2 archivos)               |
| Tests E2E              | 251/251 en **~40 s** (17 archivos)             |
| Paquetes de desarrollo | **−219 snapshots** en el lockfile (1198 → 979) |
| Typecheck de `test/`   | nuevo gate (TS 7), 5 errores corregidos        |
| Imagen final           | 792 MB → **798 MB**                            |

La imagen crece ~6 MB porque `magicast` (con `@babel/parser` y `@babel/types`)
entra en la closure de producción: Vitest lo trae al árbol de desarrollo y eso
satisface un peer opcional de `c12`, que usa `@prisma/config`. No afecta el
runtime.

No se conservó una medición pareja del runner anterior; el foco de la iteración
fue quitar dependencias y unificar el pipeline de transformación con Vite.

## Decisiones

- **`typescript@6` no se elimina en esta iteración.** Vitest saca la restricción
  de ts-jest (`<7`), pero `@nestjs/cli` lo declara como dependencia directa
  (`~6.0.2`) y usa la API JS del compilador en su builder SWC
  (`swc-defaults.js`). TS 7 nativo es un binario Go sin API JS. La revisión de
  `@nestjs/cli` queda para una iteración aparte.
- **`ts-node` y `tsconfig-paths` se fueron de nuestras devDependencies**: solo se
  usaban en el viejo `test:debug`. El nuevo `test:debug` usa
  `vitest --inspectBrk`. (`tsconfig-paths` sigue presente como dependencia
  transitiva de `@nestjs/cli`.)
- **`ts-loader` se fue**: no se usa con el builder SWC (era peer opcional del
  CLI de Nest).
- **`source-map-support` se fue**: no tenía importadores.

## Validación

- `pnpm test`: 23/23.
- `pnpm run test:e2e`: 251/251.
- `pnpm run typecheck` y `pnpm run typecheck:test`: OK.
- `pnpm run lint`: 0 errores (solo warnings preexistentes).
- `pnpm run format:check`: OK.
- `pnpm run build` (SWC): OK.
- Imagen Docker: build OK, `vitest`/`jest` ausentes de la closure de producción,
  `prisma db push` + arranque + `GET /api/eventos` → 200.

## Archivos

- `vitest.config.mts` (nuevo)
- `tsconfig.test.json` (nuevo), `tsconfig.json`
- `package.json`, `pnpm-lock.yaml`
- `test/jest-e2e.json` (eliminado)
- `test/*.e2e-spec.ts` (mocks `vi.spyOn`, tipos)
- `.oxlintrc.json`, `.gitignore`
- `.github/workflows/ci.yml`
- `src/auth/two-factor.service.ts` (comentario)
- `AGENTS.md`
