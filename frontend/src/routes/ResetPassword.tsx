import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

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

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
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
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-2 text-center">Restablecer Contraseña</h1>
        <p class="text-sm text-slate-500 text-center mb-6">Ingrese el código recibido por correo electrónico y su nueva contraseña.</p>

        {success && (
          <div class="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-sm">
            {success}
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
              placeholder="DNI"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Código de blanqueo</label>
            <input
              type="text"
              value={codigo}
              onInput={(e: Event) => setCodigo((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono tracking-widest"
              placeholder="Ej: A3B2C1"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={nuevaPassword}
              onInput={(e: Event) => setNuevaPassword((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onInput={(e: Event) => setConfirmPassword((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full mt-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-600">
          <a href="/login" class="text-slate-900 font-semibold underline">Volver al inicio de sesión</a>
        </p>
      </div>
    </div>
  );
}
