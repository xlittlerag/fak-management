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

export default api;
