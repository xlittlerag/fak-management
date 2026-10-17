import { useState, useEffect, useCallback } from 'preact/hooks';
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
      <div class="flex gap-1 bg-paper p-1 rounded-lg w-fit flex-wrap">
        <button onClick={() => setTab('altas')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'altas' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
          Altas pendientes
        </button>
        <button onClick={() => setTab('admitir')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'admitir' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
          Admitir desafiliado
        </button>
        <button onClick={() => setTab('bajas')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'bajas' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
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

  const fetchAltas = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/afiliaciones/pendientes-alta', { signal });
      if (signal?.aborted) return;
      setSolicitudes(res.data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(getErrorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchAltas(controller.signal);
    return () => controller.abort();
  }, []);

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
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Dojo de destino</th>
              <th class="px-4 py-2">Motivo</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {solicitudes.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-steel">No hay altas pendientes de aprobación.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-steel font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-steel">{s.dojo?.nombre || '-'}</td>
                <td class="px-4 py-2 text-steel max-w-xs truncate">{s.motivo || '-'}</td>
                <td class="px-4 py-2 text-right space-x-2">
                  <button onClick={() => aprobar(s.id)} class="text-success hover:underline font-medium">Aprobar</button>
                  <button onClick={() => { setRechazando(s); setMotivo(''); }} class="text-hinomaru hover:underline font-medium">Rechazar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rechazando && (
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-bold text-ink mb-4">Rechazar solicitud de afiliación</h3>
            <p class="text-sm text-steel mb-4">¿Desea rechazar la afiliación de <strong>{rechazando.usuario.nombre} {rechazando.usuario.apellido}</strong>?</p>
            <div class="mb-4">
              <label htmlFor="motivo-rechazo" class="block text-sm font-medium text-ink mb-1">Motivo (opcional)</label>
              <textarea
                id="motivo-rechazo"
                value={motivo}
                onInput={(e: Event) => setMotivo((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              />
            </div>
            <div class="flex gap-3">
              <button onClick={() => setRechazando(null)} class="w-full bg-paper text-ink py-2 rounded-md font-medium hover:bg-ai-soft transition-colors">Cancelar</button>
              <button onClick={rechazar} class="w-full bg-hinomaru text-white py-2 rounded-md font-medium hover:bg-hinomaru/90 transition-colors">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdmitirDesafiliado() {
  const { user, loading: authLoading } = useAuth();
  const asociacionId = user?.asociacion_id;
  const [desafiliados, setDesafiliados] = useState<Desafiliado[]>([]);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dojoPorUsuario, setDojoPorUsuario] = useState<Record<number, string>>({});

  const fetchDesafiliados = useCallback(async (signal?: AbortSignal) => {
    if (asociacionId === undefined || asociacionId === null) return;
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/afiliaciones/desafiliados', { signal }),
        api.get(`/dojos/asociacion/${asociacionId}`, { signal }),
      ]);
      if (signal?.aborted) return;
      setDesafiliados(uRes.data);
      setDojos(dRes.data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(getErrorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [asociacionId]);

  useEffect(() => {
    if (authLoading) return;
    if (asociacionId === undefined || asociacionId === null) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetchDesafiliados(controller.signal);
    return () => controller.abort();
  }, [authLoading, asociacionId, fetchDesafiliados]);

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
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Última asociación</th>
              <th class="px-4 py-2">Dojo destino</th>
              <th class="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {desafiliados.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-steel">No hay usuarios desafiliados para admitir.</td></tr>
            ) : desafiliados.map(u => (
              <tr key={u.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{u.nombre} {u.apellido}<div class="text-[10px] text-steel font-mono">{u.dni}</div></td>
                <td class="px-4 py-2 text-steel">{u.asociacion?.nombre || '-'}</td>
                <td class="px-4 py-2">
                  <select
                    aria-label={`Dojo destino para ${u.nombre} ${u.apellido}`}
                    value={dojoPorUsuario[u.id] || ''}
                    onChange={(e: Event) => setDojoPorUsuario({ ...dojoPorUsuario, [u.id]: (e.target as HTMLSelectElement).value })}
                    class="text-sm border border-steel-soft rounded-md shadow-sm p-1"
                  >
                    <option value="">Seleccionar dojo...</option>
                    {dojos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </td>
                <td class="px-4 py-2 text-right">
                  <button onClick={() => admitir(u.id)} class="px-3 py-1 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong transition-colors">Admitir</button>
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

  const fetchBajas = async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/afiliaciones/bajas', { signal });
      if (signal?.aborted) return;
      setSolicitudes(res.data);
    } catch (err) {
      if (signal?.aborted) return;
      setError(getErrorMessage(err));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchBajas(controller.signal);
    return () => controller.abort();
  }, []);

  if (loading) return <div class="p-8"><Spinner text="Cargando solicitudes de baja..." /></div>;
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Origen</th>
              <th class="px-4 py-2">Estado</th>
              <th class="px-4 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {solicitudes.length === 0 ? (
              <tr><td colspan={4} class="px-4 py-8 text-center text-steel">No hay solicitudes de baja registradas.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-steel font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-steel">{s.tipo === 'BAJA_SOCIO' ? 'Solicitada por el socio' : 'Solicitada por la asociación'}</td>
                <td class="px-4 py-2">
                  <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.estado === 'APROBADO' ? 'bg-success-soft text-success' :
                    s.estado === 'RECHAZADO' ? 'bg-hinomaru-soft text-hinomaru' :
                    'bg-warning-soft text-warning'
                  }`}>
                    {ESTADO_LABELS[s.estado] || s.estado}
                  </span>
                </td>
                <td class="px-4 py-2 text-steel">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
