import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

export default function ResetPassword() {
  const { route } = useLocation();
  const [dni, setDni] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!dni.trim() || !codigo.trim() || !nuevaPassword.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (nuevaPassword.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password/complete', {
        dni: dni.trim(),
        codigo: codigo.trim().toUpperCase(),
        nueva_password: nuevaPassword,
      });
      setSuccess(res.data.mensaje);
      setTimeout(() => route('/login'), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Restablecer contraseña"
      subtitle="Ingrese el código recibido por correo electrónico y su nueva contraseña."
      footer={
        <a
          href="/login"
          class="font-medium text-ai underline hover:text-ai-strong"
        >
          Volver al inicio de sesión
        </a>
      }
    >
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
        <Field label="DNI" htmlFor="reset-dni">
          <Input
            id="reset-dni"
            type="text"
            value={dni}
            placeholder="DNI"
            onInput={(e: Event) => setDni((e.target as HTMLInputElement).value)}
          />
        </Field>

        <Field label="Código de blanqueo" htmlFor="reset-codigo">
          <Input
            id="reset-codigo"
            type="text"
            value={codigo}
            placeholder="Ej: A3B2C1"
            class="font-mono tracking-widest"
            onInput={(e: Event) =>
              setCodigo((e.target as HTMLInputElement).value)
            }
          />
        </Field>

        <Field label="Nueva contraseña" htmlFor="reset-nueva-password">
          <Input
            id="reset-nueva-password"
            type="password"
            value={nuevaPassword}
            placeholder="Mínimo 12 caracteres"
            onInput={(e: Event) =>
              setNuevaPassword((e.target as HTMLInputElement).value)
            }
          />
        </Field>

        <Field
          label="Confirmar nueva contraseña"
          htmlFor="reset-confirm-password"
        >
          <Input
            id="reset-confirm-password"
            type="password"
            value={confirmPassword}
            onInput={(e: Event) =>
              setConfirmPassword((e.target as HTMLInputElement).value)
            }
          />
        </Field>

        <Button type="submit" class="mt-2 w-full" loading={loading}>
          {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
        </Button>
      </form>
    </AuthLayout>
  );
}
