/**
 * Orígenes permitidos para CORS con credenciales.
 *
 * La sesión viaja en cookie httpOnly, de modo que el navegador solo la envía
 * hacia orígenes explícitos: nunca se usa `origin: true` (reflejaría
 * cualquier origen y anularía la defensa en profundidad junto a SameSite).
 * En producción el frontend se sirve desde el mismo origen, por lo que esto
 * solo es relevante en desarrollo o despliegues separados.
 */
export function corsOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
