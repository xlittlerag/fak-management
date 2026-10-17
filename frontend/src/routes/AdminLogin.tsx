import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

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
    <AuthLayout
      title="Acceso administrador"
      subtitle="Ingrese la contraseña de administrador general."
      footer={
        <a
          href="/login"
          class="font-medium text-ai underline hover:text-ai-strong"
        >
          Volver al inicio de sesión
        </a>
      }
    >
      {error && (
        <Alert tone="error" class="mb-4">
          {error}
        </Alert>
      )}

      {tokenPendiente === null ? (
        <form onSubmit={handlePasswordSubmit} class="space-y-4">
          <Field label="Contraseña de administrador" htmlFor="admin-password">
            <Input
              id="admin-password"
              type="password"
              value={password}
              onInput={(e: Event) =>
                setPassword((e.target as HTMLInputElement).value)
              }
            />
          </Field>

          <Button type="submit" class="mt-2 w-full" loading={loading}>
            {loading ? 'Validando...' : 'Ingresar como Administrador'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleCodigoSubmit} class="space-y-4">
          <p class="text-sm text-steel">
            Ingrese el código de 6 dígitos de su aplicación autenticadora. Si la
            perdió, utilice uno de sus códigos de respaldo.
          </p>
          <Field label="Código de verificación" htmlFor="admin-2fa-code">
            <Input
              id="admin-2fa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              placeholder="123456"
              class="text-center text-lg tracking-widest"
              onInput={(e: Event) =>
                setCodigo((e.target as HTMLInputElement).value)
              }
            />
          </Field>

          <Button type="submit" class="mt-2 w-full" loading={loading}>
            {loading ? 'Verificando...' : 'Verificar código'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="w-full"
            disabled={loading}
            onClick={() => {
              setTokenPendiente(null);
              setCodigo('');
              setError('');
            }}
          >
            Volver
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
