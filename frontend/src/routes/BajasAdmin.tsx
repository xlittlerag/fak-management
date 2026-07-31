import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';

interface SolicitudBaja {
  id: number;
  estado: string;
  motivo?: string | null;
  created_at: string;
  usuario: { id: number; nombre: string; apellido: string; dni: string; email: string };
  asociacion: { id: number; nombre: string } | null;
}

interface Desafiliado {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  asociacion: { nombre: string } | null;
}

export default function BajasAdmin() {
  const [tab, setTab] = useState<'pendientes' | 'desafiliados'>('pendientes');

  return (
    <div class="space-y-4">
      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('pendientes')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'pendientes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Bajas pendientes
        </button>
        <button onClick={() => setTab('desafiliados')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'desafiliados' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Usuarios desafiliados
        </button>
      </div>
      {tab === 'pendientes' ? <BajasPendientes /> : <ListaDesafiliados />}
    </div>
  );
}

function BajasPendientes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudBaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState<SolicitudBaja | null>(null);
  const [motivo, setMotivo] = useState('');

  const fetchBajas = async () => {
    try {
      const res = await api.get('/afiliaciones/pendientes-baja');
      setSolicitudes(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBajas(); }, []);

  const aprobar = async (id: number) => {
    try {
      await api.patch(`/afiliaciones/baja/${id}/aprobar`);
      fetchBajas();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const rechazar = async () => {
    if (!rechazando) return;
    try {
      await api.patch(`/afiliaciones/baja/${rechazando.id}/rechazar`, { motivo: motivo || undefined });
      setRechazando(null);
      setMotivo('');
      fetchBajas();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando bajas pendientes..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Asociación</th>
              <th class="px-4 py-2">Motivo</th>
              <th class="px-4 py-2">Fecha</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {solicitudes.length === 0 ? (
              <tr><td colspan={5} class="px-4 py-8 text-center text-slate-500">No hay bajas pendientes de aprobación.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-slate-400 font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{s.asociacion?.nombre || '-'}</td>
                <td class="px-4 py-2 text-slate-600 max-w-xs truncate">{s.motivo || '-'}</td>
                <td class="px-4 py-2 text-slate-600">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                <td class="px-4 py-2 text-right space-x-2">
                  <button onClick={() => aprobar(s.id)} class="text-green-600 hover:underline font-medium">Aprobar</button>
                  <button onClick={() => { setRechazando(s); setMotivo(''); }} class="text-red-600 hover:underline font-medium">Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rechazando && (
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-bold text-slate-800 mb-4">Rechazar solicitud de baja</h3>
            <p class="text-sm text-slate-600 mb-4">¿Desea rechazar la baja de <strong>{rechazando.usuario.nombre} {rechazando.usuario.apellido}</strong>? El socio permanecerá activo.</p>
            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-700 mb-1">Motivo (opcional)</label>
              <textarea
                value={motivo}
                onInput={(e: Event) => setMotivo((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div class="flex gap-3">
              <button onClick={() => setRechazando(null)} class="w-full bg-slate-100 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={rechazar} class="w-full bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700 transition-colors">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListaDesafiliados() {
  const [usuarios, setUsuarios] = useState<Desafiliado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/afiliaciones/desafiliados')
      .then(res => setUsuarios(res.data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div class="p-8"><Spinner text="Cargando usuarios desafiliados..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Última asociación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {usuarios.length === 0 ? (
              <tr><td colspan={3} class="px-4 py-8 text-center text-slate-500">No hay usuarios desafiliados.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{u.nombre} {u.apellido}<div class="text-[10px] text-slate-400 font-mono">{u.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{u.email}</td>
                <td class="px-4 py-2 text-slate-600">{u.asociacion?.nombre || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
