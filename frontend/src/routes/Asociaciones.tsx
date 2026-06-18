import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';

interface Dojo {
  id: number;
  nombre: string;
}

interface Asociacion {
  id: number;
  nombre: string;
  dojos?: Dojo[];
}

export default function Asociaciones() {
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newDojoNombre, setNewDojoNombre] = useState('');

  useEffect(() => {
    fetchAsociaciones();
  }, []);

  const fetchAsociaciones = async () => {
    try {
      const res = await api.get('/asociaciones');
      const assocData = await Promise.all(res.data.map(async (a: Asociacion) => {
        const dojosRes = await api.get(`/dojos/asociacion/${a.id}`);
        return { ...a, dojos: dojosRes.data };
      }));
      setAsociaciones(assocData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDojo = async (asociacion_id: number) => {
    if (!newDojoNombre.trim()) return;
    try {
      await api.post('/dojos', { nombre: newDojoNombre, asociacion_id });
      setNewDojoNombre('');
      fetchAsociaciones();
    } catch (err) {
      alert('Error al crear dojo');
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
            <tr>
              <th class="px-6 py-4">Nombre Asociación</th>
              <th class="px-6 py-4">Dojos</th>
              <th class="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {asociaciones.filter(a => a.id !== 0).map(a => (
              <>
                <tr key={a.id} class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 font-medium text-slate-900">{a.nombre}</td>
                  <td class="px-6 py-4 text-sm text-slate-500">{a.dojos?.length || 0} dojos</td>
                  <td class="px-6 py-4 text-right">
                    <button 
                      onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                      class="text-blue-600 hover:underline text-xs font-medium"
                    >
                      {expanded === a.id ? 'Ocultar Dojos' : 'Gestionar Dojos'}
                    </button>
                  </td>
                </tr>
                {expanded === a.id && (
                  <tr class="bg-slate-50">
                    <td colSpan={3} class="px-6 py-4">
                      <div class="ml-8 border-l-2 border-slate-200 pl-4 space-y-4">
                        <h5 class="text-xs font-bold text-slate-500 uppercase">Dojos vinculados</h5>
                        <ul class="space-y-1">
                          {a.dojos?.map(d => (
                            <li key={d.id} class="text-sm text-slate-700">{d.nombre}</li>
                          ))}
                        </ul>
                        <div class="flex gap-2">
                          <input 
                            placeholder="Nuevo dojo..."
                            value={newDojoNombre}
                            onInput={(e: any) => setNewDojoNombre(e.target.value)}
                            class="text-sm px-2 py-1 border border-slate-300 rounded"
                          />
                          <button 
                            onClick={() => handleCreateDojo(a.id)}
                            class="px-3 py-1 bg-slate-900 text-white rounded text-xs"
                          >
                            Añadir Dojo
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
