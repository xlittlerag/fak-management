import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

export default function CuotaAdmin() {
  const { user } = useAuth();
  const { route } = useLocation();
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (user?.rol !== 'ADMIN_GENERAL') {
    route('/dashboard');
    return null;
  }

  useEffect(() => {
    api.get('/admin/fee')
      .then(res => {
        if (res.data) {
          setMonto(String(res.data.monto_actual));
          setFecha(res.data.fecha_vencimiento ? res.data.fecha_vencimiento.split('T')[0] : '');
        }
      })
      .catch(() => setError('No se pudo cargar la configuración actual'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.patch('/admin/fee', {
        monto_actual: parseFloat(monto),
        fecha_vencimiento: new Date(fecha).toISOString(),
      });
      setSuccess('Configuración guardada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div class="text-slate-500">Cargando configuración...</div>;
  }

  return (
    <div class="max-w-lg">
      <h3 class="text-xl font-bold text-slate-900 mb-6">Configuración de Cuota Federativa</h3>

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Monto actual ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={monto}
            onInput={(e: Event) => setMonto((e.currentTarget as HTMLInputElement).value)}
            class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha de vencimiento</label>
          <input
            type="date"
            required
            value={fecha}
            onInput={(e: Event) => setFecha((e.currentTarget as HTMLInputElement).value)}
            class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          class="w-full bg-slate-900 text-white py-2.5 rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}
