import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { GRADUACIONES } from '../constants';
import { ConfirmModal } from '../components/ConfirmModal';
import { getErrorMessage } from '../lib/error';

export default function AdminConfig() {
  return (
    <div class="space-y-8">
      <ConfigCuota />
      <ConfigPreciosExamen />
      <ConfigReimpresion />
    </div>
  );
}

function ConfigCuota() {
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setSuccess('Cuota actualizada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-slate-400">Cargando cuota...</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 class="text-base font-bold text-slate-800 mb-6">Cuota Federativa</h3>

      {error && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}
      {success && <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} class="max-w-md space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Monto actual ($)</label>
          <input type="number" step="0.01" min="0" required value={monto}
            onInput={(e: Event) => setMonto((e.currentTarget as HTMLInputElement).value)}
            class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Fecha de vencimiento</label>
          <input type="date" required value={fecha}
            onInput={(e: Event) => setFecha((e.currentTarget as HTMLInputElement).value)}
            class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
        </div>
        <button type="submit" disabled={saving}
          class="bg-slate-900 text-white py-2 px-6 rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

function ConfigPreciosExamen() {
  interface PrecioExamen {
    id: number;
    graduacion: string;
    costo_inscripcion: number;
    costo_registro: number;
  }

  const GRAD_EXAMEN = GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION');
  const GRAD_LABELS: Record<string, string> = {};
  GRADUACIONES.forEach(g => { GRAD_LABELS[g.value] = g.label; });

  const [precios, setPrecios] = useState<PrecioExamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PrecioExamen | null>(null);
  const [newGraduacion, setNewGraduacion] = useState('');
  const [newCostoIns, setNewCostoIns] = useState('');
  const [newCostoReg, setNewCostoReg] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDeletePrice, setConfirmDeletePrice] = useState<number | null>(null);

  const fetchPrecios = async () => {
    try {
      const res = await api.get('/precios-examen');
      setPrecios(res.data);
    } catch {
      setError('Error al cargar precios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrecios(); }, []);

  const handleAdd = async () => {
    if (!newGraduacion || !newCostoIns || !newCostoReg) return;
    setError('');
    try {
      await api.post('/precios-examen', {
        graduacion: newGraduacion,
        costo_inscripcion: Number(newCostoIns),
        costo_registro: Number(newCostoReg),
      });
      setNewGraduacion('');
      setNewCostoIns('');
      setNewCostoReg('');
      setAdding(false);
      fetchPrecios();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!editing || !newCostoIns || !newCostoReg) return;
    setError('');
    try {
      await api.patch(`/precios-examen/${editing.id}`, {
        costo_inscripcion: Number(newCostoIns),
        costo_registro: Number(newCostoReg),
      });
      setEditing(null);
      setNewCostoIns('');
      setNewCostoReg('');
      fetchPrecios();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeletePrice = async (id: number) => {
    try {
      await api.delete(`/precios-examen/${id}`);
      fetchPrecios();
    } catch {
      setError('Error al eliminar precio');
    }
  };

  if (loading) return <div class="text-slate-400">Cargando precios de exámenes...</div>;

  const disponibles = GRAD_EXAMEN.filter(g => !precios.find(p => p.graduacion === g.value));

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-bold text-slate-800">Precios de Exámenes</h3>
        <button onClick={() => { setAdding(true); setNewGraduacion(disponibles[0]?.value || ''); setNewCostoIns(''); setNewCostoReg(''); }}
          disabled={disponibles.length === 0}
          class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Agregar Precio
        </button>
      </div>

      {error && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Graduación</th>
              <th class="px-4 py-2">Inscripción</th>
              <th class="px-4 py-2">Registro</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {precios.map(p => (
              <tr key={p.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{GRAD_LABELS[p.graduacion] || p.graduacion}</td>
                <td class="px-4 py-2">
                  {editing?.id === p.id ? (
                    <input type="number" value={newCostoIns}
                      onInput={(e: Event) => setNewCostoIns((e.target as HTMLInputElement).value)}
                      class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                  ) : `$${p.costo_inscripcion.toLocaleString('es-AR')}`}
                </td>
                <td class="px-4 py-2">
                  {editing?.id === p.id ? (
                    <input type="number" value={newCostoReg}
                      onInput={(e: Event) => setNewCostoReg((e.target as HTMLInputElement).value)}
                      class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                  ) : `$${p.costo_registro.toLocaleString('es-AR')}`}
                </td>
                <td class="px-4 py-2 text-right space-x-2">
                  {editing?.id === p.id ? (
                    <>
                      <button onClick={handleUpdate} class="text-green-600 hover:underline">Guardar</button>
                      <button onClick={() => { setEditing(null); setNewCostoIns(''); setNewCostoReg(''); }} class="text-slate-600 hover:underline">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditing(p); setNewCostoIns(String(p.costo_inscripcion)); setNewCostoReg(String(p.costo_registro)); }} class="text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => setConfirmDeletePrice(p.id)} class="text-red-600 hover:underline">Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {adding && (
              <tr class="bg-slate-50">
                <td class="px-4 py-2">
                  <select value={newGraduacion}
                    onChange={(e: Event) => setNewGraduacion((e.target as HTMLSelectElement).value)}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1">
                    {disponibles.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </td>
                <td class="px-4 py-2"><input type="number" value={newCostoIns}
                  onInput={(e: Event) => setNewCostoIns((e.target as HTMLInputElement).value)}
                  class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" /></td>
                <td class="px-4 py-2"><input type="number" value={newCostoReg}
                  onInput={(e: Event) => setNewCostoReg((e.target as HTMLInputElement).value)}
                  class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" /></td>
                <td class="px-4 py-2 text-right space-x-2">
                  <button onClick={handleAdd} class="text-green-600 hover:underline">Guardar</button>
                  <button onClick={() => { setAdding(false); setNewGraduacion(''); setNewCostoIns(''); setNewCostoReg(''); }} class="text-slate-600 hover:underline">Cancelar</button>
                </td>
              </tr>
            )}
            {precios.length === 0 && !adding && (
              <tr><td colSpan={4} class="px-4 py-8 text-center text-slate-500">No hay precios configurados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmDeletePrice !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDeletePrice(null)}
          onConfirm={() => handleDeletePrice(confirmDeletePrice)}
          title="Eliminar precio"
          message="¿Está seguro de eliminar este precio de examen?"
          confirmText="Eliminar"
          danger
        />
      )}
    </div>
  );
}

function ConfigReimpresion() {
  const [precio, setPrecio] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/diploma/config')
      .then(res => setPrecio(res.data.precio_reimpresion))
      .catch(() => setMsg('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/admin/diploma/config', { precio_reimpresion: precio });
      setMsg('Precio actualizado correctamente');
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-slate-400">Cargando configuración de reimpresión...</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 class="text-base font-bold text-slate-800 mb-6">Costo de Reimpresión de Diplomas</h3>

      {msg && (
        <div class={`px-4 py-3 rounded text-sm border mb-4 ${
          msg === 'Precio actualizado correctamente'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>{msg}</div>
      )}

      <div class="max-w-xs space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Precio de reimpresión ($)</label>
          <input type="number" min="0" value={precio}
            onInput={(e: Event) => setPrecio(parseFloat((e.target as HTMLInputElement).value) || 0)}
            class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
        </div>
        <button onClick={handleSave} disabled={saving}
          class="bg-slate-900 text-white py-2 px-6 rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
