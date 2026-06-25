import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

export default function AdminLogin() {
  const { login } = useAuth();
  const { route } = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/admin-login', { password });
      login(res.data.access_token);
      route('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-2 text-center">Kendo Manager</h1>
        <p class="text-sm text-slate-500 text-center mb-6">Acceso de administrador general</p>

        {error && (
          <div class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña de administrador</label>
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
            {loading ? 'Validando...' : 'Ingresar como Administrador'}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-600">
          <a href="/login" class="text-slate-900 font-semibold underline">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  );
}
