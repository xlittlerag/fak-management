/** Constantes compartidas de la suite E2E (sincronizadas con scripts/e2e-seed.ts). */
export const API_URL = 'http://localhost:3000';

export const ADMIN_PASSWORD = 'Admin123!';
export const USER_PASSWORD = 'Password123!';

export const BASICO_DNI = '11111111';
export const ASOC_DNI = '22222222';
export const DESAFILIADO_DNI = '33333333';

/** Sufijo único para aislar datos entre specs de la misma corrida. */
export function uniqueSuffix() {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 36 ** 6).toString(36)}`;
}

/** DNI único de hasta 12 caracteres (el sufijo crudo se truncaría y colisionaría). */
export function uniqueDni(prefix = 'E2E') {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `${prefix}${time}${rand}`.slice(0, 12);
}
