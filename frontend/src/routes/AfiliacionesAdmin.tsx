import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';

interface Solicitante {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
}

interface SolicitudAlta {
  id: number;
  usuario: Solicitante;
  dojo: { id: number; nombre: string } | null;
  motivo?: string | null;
  created_at: string;
}

interface Desafiliado {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  asociacion: { nombre: string } | null;
}

interface Dojo { id: number; nombre: string; }

interface SolicitudBaja {
  id: number;
  tipo: string;
  estado: string;
  motivo?: string | null;
  created_at: string;
  usuario: Solicitante;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

export default function AfiliacionesAdmin() {
  const [tab, setTab] = useState<'altas' | 'admitir' | 'bajas'>('altas');

  return (
    <div class="space-y-4">
      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        <button onClick={() => setTab('altas')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'altas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Altas pendientes
        </button>
        <button onClick={() => setTab('admitir')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'admitir' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Admitir desafiliado
        </button>
        <button onClick={() => setTab('bajas')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'bajas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Solicitudes de baja
        </button>
      </div>
      {tab === 'altas' ? <AltasPendientes /> : tab === 'admitir' ? <AdmitirDesafiliado /> : <SolicitudesBaja />}
    </div>
  );
}

function AltasPendientes() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAlta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rechazando, setRechazando] = useState<SolicitudAlta | null>(null);
  const [motivo, setMotivo] = useState('');

  const fetchAltas = async () => {
    try {
      const res = await api.get('/afiliaciones/pendientes-alta');
      setSolicitudes(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAltas(); }, []);

  const aprobar = async (id: number) => {
    try {
      await api.patch(`/afiliaciones/alta/${id}/aprobar`);
      fetchAltas();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const rechazar = async () => {
    if (!rechazando) return;
    try {
      await api.patch(`/afiliaciones/alta/${rechazando.id}/rechazar`, { motivo: motivo || undefined });
      setRechazando(null);
      setMotivo('');
      fetchAltas();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando altas pendientes..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Dojo de destino</th>
              <th class="px-4 py-2">Motivo</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {solicitudes.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-slate-500">No hay altas pendientes de aprobación.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-slate-400 font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{s.dojo?.nombre || '-'}</td>
                <td class="px-4 py-2 text-slate-600 max-w-xs truncate">{s.motivo || '-'}</td>
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
            <h3 class="text-lg font-bold text-slate-800 mb-4">Rechazar solicitud de afiliación</h3>
            <p class="text-sm text-slate-600 mb-4">¿Desea rechazar la afiliación de <strong>{rechazando.usuario.nombre} {rechazando.usuario.apellido}</strong>?</p>
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

function AdmitirDesafiliado() {
  const { user } = useAuth();
  const [desafiliados, setDesafiliados] = useState<Desafiliado[]>([]);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dojoPorUsuario, setDojoPorUsuario] = useState<Record<number, string>>({});

  const fetchDesafiliados = async () => {
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/afiliaciones/desafiliados'),
        api.get(`/dojos/asociacion/${user?.asociacion_id}`),
      ]);
      setDesafiliados(uRes.data);
      setDojos(dRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDesafiliados(); }, []);

  const admitir = async (usuarioId: number) => {
    const dojoId = dojoPorUsuario[usuarioId];
    if (!dojoId) {
      setError('Debe seleccionar un dojo antes de admitir.');
      return;
    }
    try {
      await api.post(`/afiliaciones/alta/${usuarioId}`, { dojo_id: parseInt(dojoId) });
      fetchDesafiliados();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando usuarios desafiliados..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Última asociación</th>
              <th class="px-4 py-2">Dojo destino</th>
              <th class="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {desafiliados.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-slate-500">No hay usuarios desafiliados para admitir.</td></tr>
            ) : desafiliados.map(u => (
              <tr key={u.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{u.nombre} {u.apellido}<div class="text-[10px] text-slate-400 font-mono">{u.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{u.asociacion?.nombre || '-'}</td>
                <td class="px-4 py-2">
                  <select
                    value={dojoPorUsuario[u.id] || ''}
                    onChange={(e: Event) => setDojoPorUsuario({ ...dojoPorUsuario, [u.id]: (e.target as HTMLSelectElement).value })}
                    class="text-sm border border-slate-300 rounded-md shadow-sm p-1"
                  >
                    <option value="">Seleccionar dojo...</option>
                    {dojos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </td>
                <td class="px-4 py-2 text-right">
                  <button onClick={() => admitir(u.id)} class="px-3 py-1 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors">Admitir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SolicitudesBaja() {
  const [solicitudes, setSolicitudes] = useState<SolicitudBaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBajas = async () => {
    try {
      const res = await api.get('/afiliaciones/bajas');
      setSolicitudes(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBajas(); }, []);

  if (loading) return <div class="p-8"><Spinner text="Cargando solicitudes de baja..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Origen</th>
              <th class="px-4 py-2">Estado</th>
              <th class="px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {solicitudes.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-slate-500">No hay solicitudes de baja registradas.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-slate-400 font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{s.tipo === 'BAJA_SOCIO' ? 'Solicitada por el socio' : 'Solicitada por la asociación'}</td>
                <td class="px-4 py-2">
                  <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.estado === 'APROBADO' ? 'bg-green-100 text-green-700' :
                    s.estado === 'RECHAZADO' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {ESTADO_LABELS[s.estado] || s.estado}
                  </span>
                </td>
                <td class="px-4 py-2 text-slate-600">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
