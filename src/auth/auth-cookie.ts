import type { CookieOptions, Response } from 'express';

/** Nombre de la cookie de sesión httpOnly que transporta el JWT. */
export const AUTH_COOKIE_NAME = 'access_token';

/**
 * Opciones de la cookie de sesión: httpOnly (inaccesible desde JS, lo que
 * impide su exfiltración ante un XSS), SameSite=Lax (mitiga CSRF en
 * navegaciones de terceros) y Secure en producción.
 * maxAge acompaña la expiración del JWT (1 día, ver AuthModule).
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...authCookieOptions(),
    maxAge: undefined,
  });
}
