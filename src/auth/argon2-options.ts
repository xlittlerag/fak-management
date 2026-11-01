/**
 * Parámetros base OWASP para Argon2id: m=19 MiB, t=2, p=1.
 *
 * Vive en un módulo sin decoradores para poder importarlo desde los seeds
 * con Node nativo (sin transformer) y desde `PasswordService`.
 */
export const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;
