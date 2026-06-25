import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

export default function Login() {
  const { url, route } = useLocation();
  const { login } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegistered = new URLSearchParams(url.split('?')[1]).get('registered') === 'true';

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { dni, password });
      login(res.data.access_token);
      route('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    if (!dni) {
      setError('Por favor, ingrese su DNI para solicitar el blanqueo.');
      return;
    }
    try {
      await api.post('/auth/reset-password/request', { dni });
      setError('Solicitud de blanqueo enviada. Aguarde la aprobación administrativa.');
    } catch {
      setError('Error al solicitar el blanqueo.');
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-6 text-center">Kendo Manager</h1>

        {isRegistered && !error && (
          <div class="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-sm">
            Registro exitoso. Su cuenta aguarda la aprobación del administrador de su asociación.
          </div>
        )}

        {error && (
          <div class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">DNI</label>
            <input
              type="text"
              value={dni}
              onInput={(e: Event) => setDni((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onInput={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full mt-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div class="mt-4 text-center">
          <button
            onClick={handleRequestReset}
            class="text-sm text-slate-500 hover:text-slate-900 underline"
          >
            ¿Olvidó su contraseña? Solicitar blanqueo
          </button>
        </div>

        <div class="mt-2 text-center">
          <a href="/admin-login" class="text-sm text-slate-500 hover:text-slate-900 underline">
            Acceso administrador
          </a>
        </div>

        <p class="mt-6 text-center text-sm text-slate-600">
          ¿No tiene una cuenta? <a href="/register" class="text-slate-900 font-semibold underline">Regístrese aquí</a>
        </p>
      </div>
    </div>
  );
}
