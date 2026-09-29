import { Logger } from '@nestjs/common';

const logger = new Logger('CORS');

/**
 * Orígenes permitidos para CORS con credenciales.
 *
 * La sesión viaja en cookie httpOnly, de modo que el navegador solo la envía
 * hacia orígenes explícitos: nunca se usa `origin: true` (reflejaría
 * cualquier origen y anularía la defensa en profundidad junto a SameSite).
 * En producción el frontend se sirve desde el mismo origen, por lo que esto
 * solo es relevante en desarrollo o despliegues separados.
 *
 * Fail-closed: `*` se rechaza siempre; en producción se exige esquema
 * `https://` y sin `CORS_ORIGIN` la lista queda vacía (mismo origen).
 */
export function corsOrigins(): string[] {
  const crudo = process.env.CORS_ORIGIN;
  if (!crudo) {
    if (process.env.NODE_ENV === 'production') return [];
    return ['http://localhost:5173'];
  }
  const esProd = process.env.NODE_ENV === 'production';
  const validos: string[] = [];
  for (const parte of crudo.split(',')) {
    const origen = parte.trim();
    if (!origen) continue;
    if (origen === '*') {
      throw new Error(
        "CORS_ORIGIN no admite '*' con credenciales. Defina orígenes explícitos.",
      );
    }
    let url: URL;
    try {
      url = new URL(origen);
    } catch {
      throw new Error(`CORS_ORIGIN inválido: '${origen}' no es una URL.`);
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`CORS_ORIGIN inválido: '${origen}' debe usar http(s).`);
    }
    if (esProd && url.protocol !== 'https:') {
      throw new Error(
        `CORS_ORIGIN inválido en producción: '${origen}' debe usar https.`,
      );
    }
    validos.push(url.origin);
  }
  logger.log(`Orígenes CORS: ${validos.join(', ') || '(mismo origen)'}`);
  return validos;
}
