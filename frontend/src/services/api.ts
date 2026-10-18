import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? 'http://localhost:3000/api' : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // La sesión viaja en cookie httpOnly; el navegador la envía automáticamente.
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avisa al AuthContext para que limpie el estado en memoria.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      // Redirige solo desde el área privada: en /login un 401 es simplemente
      // "credenciales incorrectas" y en las páginas públicas no corresponde
      // expulsar al visitante.
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── Cache de GETs de lectura compartida ────────────────────────────────
// Evita repetir requests idénticos al navegar entre páginas (p. ej. /eventos
// se pide en Inicio, Ver Eventos y EventoDetalle). Es un cache en memoria por
// pestaña: cualquier mutación lo invalida para no servir datos obsoletos.
interface CacheEntry {
  expires: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const TTL_POR_URL: Array<[RegExp, number]> = [
  [/^\/eventos$/, 60_000],
  [/^\/precios-examen$/, 5 * 60_000],
  [/^\/mis-inscripciones$/, 15_000],
];

function ttlPara(url: string): number | null {
  for (const [re, ttl] of TTL_POR_URL) {
    if (re.test(url)) return ttl;
  }
  return null;
}

/** Limpia el cache y permite reusarlo tras mutaciones. */
export function invalidateApiCache() {
  cache.clear();
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get') invalidateApiCache();
  return config;
});

/**
 * GET con cache TTL y deduplicación de requests en vuelo. Pensado para
 * lecturas compartidas; para datos que deben estar siempre frescos usar `api.get`.
 */
export async function apiGet<T>(url: string): Promise<T> {
  const ttl = ttlPara(url);
  if (ttl === null) {
    return (await api.get<T>(url)).data;
  }

  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  const request = api
    .get<T>(url)
    .then((res) => {
      cache.set(url, { expires: Date.now() + ttl, data: res.data });
      return res.data;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, request);
  return request;
}

export default api;
