/**
 * Lint on edit — opencode project plugin.
 *
 * Corre el eslint del workspace correspondiente (--fix) cada vez que opencode
 * edita un archivo .ts/.tsx, y reporta en el log los problemas que no pudo
 * corregir automáticamente. Es no bloqueante: fire-and-forget para no demorar
 * cada edición. El formateo (prettier) lo maneja el `formatter` nativo de opencode.
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
      const report = (stdout || stderr || error?.message || String(error)).trim();
      if (report) {
        const relative = file.startsWith(root) ? file.slice(root.length + 1) : file;
        await log(
          'warn',
          `[lint] eslint reportó problemas no corregibles en ${relative}:\n${report.slice(0, 2000)}`,
        );
      }
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    'tool.execute.after': async (input) => {
      if (!input || !EDIT_TOOLS.has(input.tool)) return;

      const raw = input.args?.filePath ?? input.args?.file_path ?? input.args?.path;
      if (typeof raw !== 'string' || !raw.trim() || !/\.(ts|tsx)$/.test(raw)) return;

      const abs = isAbsolute(raw) ? raw : join(root, raw);
      const relative = (abs.startsWith(root) ? abs.slice(root.length + 1) : abs)
        .split(sep)
        .join('/');

      if (SKIP.test(relative)) return;

      if (relative.startsWith('frontend/src/')) {
        void runEslint(abs, ['--dir', 'frontend', 'exec', 'eslint', '--fix', abs], `frontend:${abs}`);
        return;
      }

      if (relative.startsWith('src/') || relative.startsWith('test/')) {
        void runEslint(abs, ['exec', 'eslint', '--fix', abs], `backend:${abs}`);
      }
    },
  };
};

export default LintOnEdit;
