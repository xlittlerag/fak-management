import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { GRADUACIONES } from '../constants';

interface PrecioExamen {
  id: number;
  graduacion: string;
  costo: number;
}

const GRAD_EXAMEN = GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION');

const GRAD_LABELS: Record<string, string> = {};
GRADUACIONES.forEach(g => { GRAD_LABELS[g.value] = g.label; });

export default function PreciosExamenAdmin() {
  const [precios, setPrecios] = useState<PrecioExamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PrecioExamen | null>(null);
  const [newGraduacion, setNewGraduacion] = useState('');
  const [newCosto, setNewCosto] = useState('');
  const [adding, setAdding] = useState(false);

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
    if (!newGraduacion || !newCosto) return;
    setError('');
    try {
      await api.post('/precios-examen', { graduacion: newGraduacion, costo: Number(newCosto) });
      setNewGraduacion('');
      setNewCosto('');
      setAdding(false);
      fetchPrecios();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al agregar precio';
      setError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !newCosto) return;
    setError('');
    try {
      await api.patch(`/precios-examen/${editing.id}`, { costo: Number(newCosto) });
      setEditing(null);
      setNewCosto('');
      fetchPrecios();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar precio';
      setError(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este precio?')) return;
    try {
      await api.delete(`/precios-examen/${id}`);
      fetchPrecios();
    } catch {
      alert('Error al eliminar precio');
    }
  };

  if (loading) return <div class="p-8 text-slate-400">Cargando...</div>;

  const disponibles = GRAD_EXAMEN.filter(g => !precios.find(p => p.graduacion === g.value));

  return (
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-slate-800">Precios de Exámenes</h2>
        <button
          onClick={() => { setAdding(true); setNewGraduacion(disponibles[0]?.value || ''); setNewCosto(''); }}
          disabled={disponibles.length === 0}
          class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          Agregar Precio
        </button>
      </div>

      {error && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th class="px-4 py-2">Graduación</th>
                <th class="px-4 py-2">Costo</th>
                <th class="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {precios.map(p => (
                <tr key={p.id} class="hover:bg-slate-50">
                  <td class="px-4 py-2 font-medium">{GRAD_LABELS[p.graduacion] || p.graduacion}</td>
                  <td class="px-4 py-2">
                    {editing?.id === p.id ? (
                      <input type="number" value={newCosto}
                        onInput={(e: Event) => setNewCosto((e.target as HTMLInputElement).value)}
                        class="w-32 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                    ) : (
                      `$${p.costo.toLocaleString('es-AR')}`
                    )}
                  </td>
                  <td class="px-4 py-2 text-right space-x-2">
                    {editing?.id === p.id ? (
                      <>
                        <button onClick={handleUpdate} class="text-green-600 hover:underline">Guardar</button>
                        <button onClick={() => { setEditing(null); setNewCosto(''); }} class="text-slate-600 hover:underline">Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditing(p); setNewCosto(String(p.costo)); }} class="text-blue-600 hover:underline">Editar</button>
                        <button onClick={() => handleDelete(p.id)} class="text-red-600 hover:underline">Eliminar</button>
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
                      class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1"
                    >
                      {disponibles.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </td>
                  <td class="px-4 py-2">
                    <input type="number" value={newCosto}
                      onInput={(e: Event) => setNewCosto((e.target as HTMLInputElement).value)}
                      class="w-32 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                  </td>
                  <td class="px-4 py-2 text-right space-x-2">
                    <button onClick={handleAdd} class="text-green-600 hover:underline">Guardar</button>
                    <button onClick={() => { setAdding(false); setNewGraduacion(''); setNewCosto(''); }} class="text-slate-600 hover:underline">Cancelar</button>
                  </td>
                </tr>
              )}
              {precios.length === 0 && !adding && (
                <tr>
                  <td colspan={3} class="px-4 py-8 text-center text-slate-500">No hay precios configurados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
