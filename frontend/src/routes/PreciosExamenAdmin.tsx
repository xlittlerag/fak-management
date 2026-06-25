import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { GRADUACIONES } from '../constants';
import { getErrorMessage } from '../lib/error';

interface PrecioExamen {
  id: number;
  graduacion: string;
  costo_inscripcion: number;
  costo_registro: number;
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
  const [newCostoIns, setNewCostoIns] = useState('');
  const [newCostoReg, setNewCostoReg] = useState('');
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
          onClick={() => { setAdding(true); setNewGraduacion(disponibles[0]?.value || ''); setNewCostoIns(''); setNewCostoReg(''); }}
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
                    ) : (
                      `$${p.costo_inscripcion.toLocaleString('es-AR')}`
                    )}
                  </td>
                  <td class="px-4 py-2">
                    {editing?.id === p.id ? (
                      <input type="number" value={newCostoReg}
                        onInput={(e: Event) => setNewCostoReg((e.target as HTMLInputElement).value)}
                        class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                    ) : (
                      `$${p.costo_registro.toLocaleString('es-AR')}`
                    )}
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
                    <input type="number" value={newCostoIns}
                      onInput={(e: Event) => setNewCostoIns((e.target as HTMLInputElement).value)}
                      class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                  </td>
                  <td class="px-4 py-2">
                    <input type="number" value={newCostoReg}
                      onInput={(e: Event) => setNewCostoReg((e.target as HTMLInputElement).value)}
                      class="w-28 text-sm border-slate-300 rounded-md shadow-sm p-1" />
                  </td>
                  <td class="px-4 py-2 text-right space-x-2">
                    <button onClick={handleAdd} class="text-green-600 hover:underline">Guardar</button>
                    <button onClick={() => { setAdding(false); setNewGraduacion(''); setNewCostoIns(''); setNewCostoReg(''); }} class="text-slate-600 hover:underline">Cancelar</button>
                  </td>
                </tr>
              )}
              {precios.length === 0 && !adding && (
                <tr>
                  <td colspan={4} class="px-4 py-8 text-center text-slate-500">No hay precios configurados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
