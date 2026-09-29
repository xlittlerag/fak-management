import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

export default function AdminLogin() {
  const { refresh } = useAuth();
  const { route } = useLocation();
  const [password, setPassword] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tokenPendiente, setTokenPendiente] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ingresar = async (session: unknown) => {
    if (!session) {
      setError('No se pudo iniciar la sesión. Intente nuevamente.');
      setLoading(false);
      return;
    }
    route('/dashboard');
  };

  const handlePasswordSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/admin-login', { password });
      // Con 2FA habilitado el servidor devuelve el token pendiente en lugar
      // de crear la sesión; sin 2FA la sesión queda creada directamente.
      if (res.data?.requiere_2fa) {
        setTokenPendiente(res.data.token_pendiente);
        setLoading(false);
        return;
      }
      await ingresar(await refresh());
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleCodigoSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/admin-2fa/verificar', {
        token_pendiente: tokenPendiente,
        codigo,
      });
      await ingresar(await refresh());
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

        {tokenPendiente === null ? (
          <form onSubmit={handlePasswordSubmit} class="space-y-4">
            <div>
              <label htmlFor="admin-password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña de administrador</label>
              <input
                id="admin-password"
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
        ) : (
          <form onSubmit={handleCodigoSubmit} class="space-y-4">
            <p class="text-sm text-slate-600">
              Ingrese el código de 6 dígitos de su aplicación autenticadora. Si la perdió, utilice uno de sus códigos de respaldo.
            </p>
            <div>
              <label htmlFor="admin-2fa-code" class="block text-sm font-medium text-slate-700 mb-1">Código de verificación</label>
              <input
                id="admin-2fa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onInput={(e: Event) => setCodigo((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 tracking-widest text-center text-lg"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              class="w-full mt-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setTokenPendiente(null); setCodigo(''); setError(''); }}
              class="w-full py-2 text-sm text-slate-600 hover:text-slate-900 underline"
            >
              Volver
            </button>
          </form>
        )}

        <p class="mt-6 text-center text-sm text-slate-600">
          <a href="/login" class="text-slate-900 font-semibold underline">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  );
}
