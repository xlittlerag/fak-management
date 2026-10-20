#!/usr/bin/env node
/**
 * Escáner de secretos de alta señal (sin dependencias externas).
 *
 * Modos:
 *   --tracked   archivos versionados (default; para pre-push/CI)
 *   --staged    archivos en el índice (para pre-commit)
 *   --file PATH un archivo puntual (para el plugin de opencode)
 *
 * Falla (exit 1) si encuentra un patrón sospechoso. Para falsos positivos,
 * agregar `secret-scan-ignore` en la misma línea.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const argv = process.argv.slice(2);
const fileFlag = argv.indexOf('--file');
const explicitFile = fileFlag >= 0 ? argv[fileFlag + 1] : null;
const mode = argv.includes('--staged')
  ? 'staged'
  : explicitFile
    ? 'file'
    : 'tracked';

const SKIP_PATH =
  /(^|\/)(node_modules|dist|coverage|\.git|uploads)(\/|$)|(^|\/)(\.env|deploy\.env|pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$|\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|eot|mp4|webm|db|sqlite)$/i;
const SKIP_FILE = 'scripts/check-secrets.mjs';
const MAX_BYTES = 2_000_000;

const PATTERNS = [
  {
    name: 'private key',
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  {
    name: 'GitHub fine-grained token',
    re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/,
  },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'Stripe live key', re: /\bsk_live_[A-Za-z0-9]{16,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  {
    name: 'JWT_SECRET hardcodeado',
    re: /\bJWT_SECRET\s*=\s*["']?[A-Fa-f0-9]{32,}/,
  },
  {
    name: 'TOTP_ENCRYPTION_KEY hardcodeada',
    re: /\bTOTP_ENCRYPTION_KEY\s*=\s*["']?[A-Fa-f0-9]{32,}/,
  },
];

function gitList(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function listFiles() {
  if (mode === 'file') {
    if (!explicitFile) {
      console.error('check-secrets: falta la ruta después de --file');
      process.exit(2);
    }
    return [explicitFile];
  }
  if (mode === 'staged') {
    return gitList([
      'diff',
      '--cached',
      '--name-only',
      '--diff-filter=ACMR',
      '-z',
    ]);
  }
  return gitList(['ls-files', '-z']);
}

function checkBannedTrackedFiles(findings) {
  if (mode === 'file') return;
  const tracked = gitList(['ls-files', '-z']);
  for (const banned of ['.env', 'deploy.env']) {
    if (tracked.includes(banned)) {
      console.error(`${banned}: archivo de secretos versionado`);
      findings.count += 1;
    }
  }
}

function redact(value) {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}… (${value.length} chars)`;
}

const findings = { count: 0 };
checkBannedTrackedFiles(findings);

for (const file of listFiles()) {
  const rel = file.replaceAll('\\', '/');
  if (SKIP_PATH.test(rel) || rel === SKIP_FILE) continue;

  let content;
  try {
    const stats = statSync(rel);
    if (!stats.isFile() || stats.size > MAX_BYTES) continue;
    content = readFileSync(rel, 'utf8');
  } catch {
    continue;
  }
  if (content.includes('\0')) continue;

  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('secret-scan-ignore')) return;
    for (const pattern of PATTERNS) {
      const match = pattern.re.exec(line);
      if (!match) continue;
      console.error(
        `${rel}:${index + 1}  ${pattern.name}: ${redact(match[0])}`,
      );
      findings.count += 1;
      break;
    }
  });
}

if (findings.count > 0) {
  console.error(
    `\ncheck-secrets: ${findings.count} posible(s) secreto(s) detectado(s).`,
  );
  console.error(
    'Corregí el valor o agregá "secret-scan-ignore" en la línea si es un falso positivo.',
  );
  process.exit(1);
}

console.log('check-secrets: sin hallazgos');
