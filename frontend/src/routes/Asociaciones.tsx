import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';

interface Asociacion {
  id: number;
  nombre: string;
}

export default function Asociaciones() {
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [newNombre, setNewNombre] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsociaciones();
  }, []);

  const fetchAsociaciones = async () => {
    try {
      const res = await api.get('/asociaciones');
      setAsociaciones(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!newNombre.trim()) return;
    try {
      await api.post('/asociaciones', { nombre: newNombre });
      setNewNombre('');
      fetchAsociaciones();
    } catch (err) {
      alert('Error al crear asociación');
    }
  };

  const handleSaveUpdate = async (id: number) => {
    try {
      await api.patch(`/asociaciones/${id}`, { nombre: editingNombre });
      setEditingId(null);
      fetchAsociaciones();
    } catch (err) {
      alert('Error al actualizar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que desea eliminar esta asociación?')) return;
    try {
      await api.delete(`/asociaciones/${id}`);
      fetchAsociaciones();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div class="space-y-6">
      {/* Create Section */}
      <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Añadir Nueva Asociación</h3>
        <form onSubmit={handleCreate} class="flex gap-4">
          <input 
            value={newNombre}
            onInput={(e: any) => setNewNombre(e.target.value)}
            placeholder="Nombre de la asociación..."
            class="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button 
            type="submit"
            class="px-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
          >
            Añadir
          </button>
        </form>
      </div>

      {/* List Section */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
            <tr>
              <th class="px-6 py-4">ID</th>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {asociaciones.filter(a => a.id !== 0).map(a => (
              <tr key={a.id} class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 font-mono text-sm text-slate-500">{a.id}</td>
                <td class="px-6 py-4">
                  {editingId === a.id ? (
                    <input 
                      autoFocus
                      value={editingNombre}
                      onInput={(e: any) => setEditingNombre(e.target.value)}
                      class="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  ) : (
                    <span class="font-medium text-slate-900">{a.nombre}</span>
                  )}
                </td>
                <td class="px-6 py-4 text-right space-x-4">
                  {editingId === a.id ? (
                    <>
                      <button 
                        onClick={() => handleSaveUpdate(a.id)}
                        class="text-blue-600 font-bold hover:underline text-xs"
                      >
                        Guardar
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        class="text-slate-400 hover:underline text-xs"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setEditingId(a.id); setEditingNombre(a.nombre); }}
                        class="text-slate-600 font-medium hover:underline text-xs"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(a.id)}
                        class="text-red-600 font-medium hover:underline text-xs"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
