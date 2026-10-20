/**
 * Checks on edit — opencode project plugin.
 *
 * En cada edición:
 *  1. Escanea el archivo en busca de secretos de alta señal (barato, node).
 *  2. Corre el eslint del workspace correspondiente (--fix) para .ts/.tsx.
 *
 * Es no bloqueante: fire-and-forget para no demorar cada edición; los
 * hallazgos se reportan en el log. El formateo (prettier) lo maneja el
 * `formatter` nativo de opencode. Los gates que bloquean son pre-commit y
 * pre-push (ver AGENTS.md).
 *
 * Sin dependencias externas: usa solo módulos nativos de Node.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isAbsolute, join, sep } from 'node:path';

const execFileAsync = promisify(execFile);

const EDIT_TOOLS = new Set(['edit', 'write', 'patch']);
const SKIP = /(^|\/)(node_modules|dist|uploads|coverage|\.git)(\/|$)/;

export const LintOnEdit = async ({ client, worktree, directory }) => {
  const root = worktree || directory;
  const inFlight = new Set();

  const log = (level, message) =>
    client.app.log({ body: { service: 'lint-on-edit', level, message } });

  async function runEslint(file, args, key) {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      await execFileAsync('pnpm', args, { cwd: root });
    } catch (error) {
      const stdout = error?.stdout?.toString?.() ?? '';
      const stderr = error?.stderr?.toString?.() ?? '';
      const report = (
        stdout ||
        stderr ||
        error?.message ||
        String(error)
      ).trim();
      if (report) {
        const relative = file.startsWith(root)
          ? file.slice(root.length + 1)
          : file;
        await log(
          'warn',
          `[lint] eslint reportó problemas no corregibles en ${relative}:\n${report.slice(0, 2000)}`,
        );
      }
    } finally {
      inFlight.delete(key);
    }
  }

  async function runSecretScan(file, key) {
    if (inFlight.has(key)) return;
    inFlight.add(key);
    try {
      await execFileAsync(
        'node',
        [join(root, 'scripts/check-secrets.mjs'), '--file', file],
        { cwd: root },
      );
    } catch (error) {
      const stdout = error?.stdout?.toString?.() ?? '';
      const stderr = error?.stderr?.toString?.() ?? '';
      const report = (
        stdout ||
        stderr ||
        error?.message ||
        String(error)
      ).trim();
      if (report) {
        const relative = file.startsWith(root)
          ? file.slice(root.length + 1)
          : file;
        await log(
          'warn',
          `[secretos] posible secreto en ${relative}:\n${report.slice(0, 2000)}`,
        );
      }
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    'tool.execute.after': async (input) => {
      if (!input || !EDIT_TOOLS.has(input.tool)) return;

      const raw =
        input.args?.filePath ?? input.args?.file_path ?? input.args?.path;
      if (typeof raw !== 'string' || !raw.trim()) return;

      const abs = isAbsolute(raw) ? raw : join(root, raw);
      const relative = (abs.startsWith(root) ? abs.slice(root.length + 1) : abs)
        .split(sep)
        .join('/');

      if (SKIP.test(relative)) return;

      // Barato: aplica a cualquier archivo de texto editado.
      void runSecretScan(abs, `secrets:${abs}`);

      if (!/\.(ts|tsx)$/.test(relative)) return;

      if (relative.startsWith('frontend/src/')) {
        void runEslint(
          abs,
          ['--dir', 'frontend', 'exec', 'eslint', '--fix', abs],
          `frontend:${abs}`,
        );
        return;
      }

      if (relative.startsWith('src/') || relative.startsWith('test/')) {
        void runEslint(abs, ['exec', 'eslint', '--fix', abs], `backend:${abs}`);
      }
    },
  };
};

export default LintOnEdit;
