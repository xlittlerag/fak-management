import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

export default function Login() {
  const { url, route } = useLocation();
  const { refresh } = useAuth();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegistered =
    new URLSearchParams(url.split('?')[1]).get('registered') === 'true';

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    // TC-03: el mensaje de blanqueo anterior se limpia al iniciar sesión.
    setSuccess('');
    setLoading(true);

    try {
      await api.post('/auth/login', { dni, password });
      const session = await refresh();
      if (!session) {
        setError('No se pudo iniciar la sesión. Intente nuevamente.');
        setLoading(false);
        return;
      }
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
    // TC-03: se limpia cualquier mensaje previo antes de la nueva solicitud.
    setError('');
    setSuccess('');
    try {
      // TC-02: se muestra el mensaje del servidor (genérico a propósito:
      // no revela si el DNI existe). Falla solo por red o límite de intentos.
      const res = await api.post('/auth/reset-password/request', { dni });
      setSuccess(
        res.data?.mensaje ||
          'Solicitud de blanqueo enviada. Si el DNI está registrado, recibirá un correo con el código.',
      );
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthLayout
      title="Iniciar sesión"
      subtitle="Ingrese con su DNI y contraseña."
      footer={
        <>
          ¿No tiene una cuenta?{' '}
          <a
            href="/register"
            class="font-medium text-ai underline hover:text-ai-strong"
          >
            Regístrese aquí
          </a>
        </>
      }
    >
      {isRegistered && !error && (
        <Alert tone="success" class="mb-4">
          Registro exitoso. Su cuenta aguarda la aprobación del administrador de
          su asociación.
        </Alert>
      )}

      {success && (
        <Alert tone="success" class="mb-4">
          {success}
        </Alert>
      )}

      {error && (
        <Alert tone="error" class="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        <Field label="DNI" htmlFor="login-dni">
          <Input
            id="login-dni"
            type="text"
            inputMode="numeric"
            value={dni}
            onInput={(e: Event) => {
              setDni((e.target as HTMLInputElement).value);
              setSuccess('');
            }}
          />
        </Field>

        <Field label="Contraseña" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            value={password}
            onInput={(e: Event) =>
              setPassword((e.target as HTMLInputElement).value)
            }
          />
        </Field>

        <Button type="submit" class="mt-2 w-full" loading={loading}>
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </Button>
      </form>

      <div class="mt-4 text-center">
        <button
          onClick={handleRequestReset}
          class="text-sm text-ai underline hover:text-ai-strong"
        >
          ¿Olvidó su contraseña? Solicitar blanqueo
        </button>
      </div>

      <div class="mt-2 text-center">
        <a
          href="/admin-login"
          class="text-sm text-ai underline hover:text-ai-strong"
        >
          Acceso administrador
        </a>
      </div>
    </AuthLayout>
  );
}
