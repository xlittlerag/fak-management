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
      <div class="flex gap-1 bg-paper p-1 rounded-lg w-fit">
        <button onClick={() => setTab('pendientes')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'pendientes' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
          Bajas pendientes
        </button>
        <button onClick={() => setTab('desafiliados')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'desafiliados' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
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
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Asociación</th>
              <th class="px-4 py-2">Motivo</th>
              <th class="px-4 py-2">Fecha</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {solicitudes.length === 0 ? (
              <tr><td colspan={5} class="px-4 py-8 text-center text-steel">No hay bajas pendientes de aprobación.</td></tr>
            ) : solicitudes.map(s => (
              <tr key={s.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{s.usuario.nombre} {s.usuario.apellido}<div class="text-[10px] text-steel font-mono">{s.usuario.dni}</div></td>
                <td class="px-4 py-2 text-steel">{s.asociacion?.nombre || '-'}</td>
                <td class="px-4 py-2 text-steel max-w-xs truncate">{s.motivo || '-'}</td>
                <td class="px-4 py-2 text-steel">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
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
            <h3 class="text-lg font-bold text-ink mb-4">Rechazar solicitud de baja</h3>
            <p class="text-sm text-steel mb-4">¿Desea rechazar la baja de <strong>{rechazando.usuario.nombre} {rechazando.usuario.apellido}</strong>? El socio permanecerá activo.</p>
            <div class="mb-4">
              <label htmlFor="baja-motivo" class="block text-sm font-medium text-ink mb-1">Motivo (opcional)</label>
              <textarea
                id="baja-motivo"
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
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario / DNI</th>
              <th class="px-4 py-2">Email</th>
              <th class="px-4 py-2">Última asociación</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {usuarios.length === 0 ? (
              <tr><td colspan={3} class="px-4 py-8 text-center text-steel">No hay usuarios desafiliados.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{u.nombre} {u.apellido}<div class="text-[10px] text-steel font-mono">{u.dni}</div></td>
                <td class="px-4 py-2 text-steel">{u.email}</td>
                <td class="px-4 py-2 text-steel">{u.asociacion?.nombre || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
