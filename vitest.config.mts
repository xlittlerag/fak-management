import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC (vía unplugin-swc) es necesario porque esbuild no emite
// `design:paramtypes`, metadata que NestJS usa para resolver la DI.
// El plugin lee `experimentalDecorators`/`emitDecoratorMetadata` del tsconfig.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
    // Los e2e comparten una única base SQLite y limpian tablas en beforeEach,
    // así que no pueden correr en paralelo (equivalente a --runInBand).
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 15000,
    hookTimeout: 30000,
    teardownTimeout: 15000,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
        },
      },
    ],
  },
});
