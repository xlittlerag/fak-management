import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';

interface Asociacion { id: number; nombre: string; }
interface Dojo { id: number; nombre: string; }
interface Solicitud {
  id: number;
  tipo: string;
  estado: string;
  motivo?: string | null;
  created_at: string;
  asociacion: { nombre: string } | null;
  dojo: { nombre: string } | null;
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

const TIPO_LABELS: Record<string, string> = {
  BAJA_SOCIO: 'Baja solicitada por usted',
  BAJA_ASOCIACION: 'Baja solicitada por su asociación',
  ALTA_SOCIO: 'Alta solicitada por usted',
  ALTA_ASOCIACION: 'Alta registrada por la asociación',
};

export default function Afiliacion() {
  const { user } = useAuth();
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [asociacionId, setAsociacionId] = useState('');
  const [dojoId, setDojoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/asociaciones')
      .then(res => setAsociaciones(res.data))
      .catch(() => setMessage({ text: 'No se pudieron cargar las asociaciones.', type: 'error' }));
  }, []);

  useEffect(() => {
    if (asociacionId) {
      api.get(`/dojos/asociacion/${asociacionId}`)
        .then(res => { setDojos(res.data); setDojoId(''); })
        .catch(() => setDojos([]));
    } else {
      setDojos([]);
      setDojoId('');
    }
  }, [asociacionId]);

  useEffect(() => {
    api.get('/afiliaciones/mis-solicitudes')
      .then(res => setSolicitudes(res.data))
      .catch(() => {})
      .finally(() => setLoadingSolicitudes(false));
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!asociacionId || !dojoId) {
      setMessage({ text: 'Debe seleccionar la asociación y el dojo de destino.', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await api.post('/afiliaciones/alta', {
        asociacion_id: parseInt(asociacionId),
        dojo_id: parseInt(dojoId),
        motivo: motivo || undefined,
      });
      setMessage({ text: 'Solicitud de afiliación enviada. La asociación de destino la revisará.', type: 'success' });
      setAsociacionId('');
      setDojoId('');
      setMotivo('');
      api.get('/afiliaciones/mis-solicitudes')
        .then(res => setSolicitudes(res.data))
        .catch(() => {});
    } catch (err) {
      setMessage({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  if (user?.estado_reg !== 'DESAFILIADO') {
    return (
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-8">
        <p class="text-steel">Su afiliación se encuentra activa. No necesita solicitar una nueva afiliación.</p>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="bg-warning-soft border border-warning/20 text-warning rounded-lg p-4">
        <p class="font-semibold">Usted se encuentra desafiliado.</p>
        <p class="text-sm">Complete el siguiente formulario para solicitar su afiliación a una asociación.</p>
      </div>

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-8">
        <h3 class="text-lg font-bold mb-6 text-ink">Solicitar Afiliación</h3>

        {message.text && (
          <div class={`mb-6 p-4 rounded text-sm font-medium ${
            message.type === 'success' ? 'bg-success-soft text-success border border-success/20' : 'bg-hinomaru-soft text-hinomaru border border-hinomaru/20'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-6 max-w-xl">
          <div>
            <label htmlFor="afil-asociacion" class="block text-sm font-medium text-ink mb-1">Asociación de destino</label>
            <select
              id="afil-asociacion"
              value={asociacionId}
              onChange={(e: Event) => setAsociacionId((e.target as HTMLSelectElement).value)}
              class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
            >
              <option value="">Seleccione una asociación...</option>
              {asociaciones.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="afil-dojo" class="block text-sm font-medium text-ink mb-1">Dojo de destino</label>
            <select
              id="afil-dojo"
              value={dojoId}
              onChange={(e: Event) => setDojoId((e.target as HTMLSelectElement).value)}
              disabled={!asociacionId}
              class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20 disabled:bg-paper disabled:text-steel"
            >
              <option value="">Seleccione un dojo...</option>
              {dojos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="afil-motivo" class="block text-sm font-medium text-ink mb-1">Motivo (opcional)</label>
            <textarea
              id="afil-motivo"
              value={motivo}
              onInput={(e: Event) => setMotivo((e.target as HTMLTextAreaElement).value)}
              rows={3}
              class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              placeholder="Indique el motivo de su solicitud..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            class="px-8 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
      </div>

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-steel-soft">
          <h4 class="font-semibold text-ink">Historial de solicitudes</h4>
        </div>
        {loadingSolicitudes ? (
          <div class="p-8"><Spinner text="Cargando solicitudes..." /></div>
        ) : solicitudes.length === 0 ? (
          <div class="p-8 text-center text-steel">No tiene solicitudes registradas.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                <tr>
                  <th class="px-4 py-2">Solicitud</th>
                  <th class="px-4 py-2">Destino</th>
                  <th class="px-4 py-2">Fecha</th>
                  <th class="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-steel-soft/60">
                {solicitudes.map(s => (
                  <tr key={s.id} class="hover:bg-ai-soft/50">
                    <td class="px-4 py-2 font-medium">{TIPO_LABELS[s.tipo] || s.tipo}</td>
                    <td class="px-4 py-2 text-steel">
                      {s.asociacion?.nombre || '-'}
                      {s.dojo?.nombre ? ` / ${s.dojo.nombre}` : ''}
                    </td>
                    <td class="px-4 py-2 text-steel">{formatDate(s.created_at)}</td>
                    <td class="px-4 py-2">
                      <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.estado === 'APROBADO' ? 'bg-success-soft text-success' :
                        s.estado === 'RECHAZADO' ? 'bg-hinomaru-soft text-hinomaru' :
                        'bg-warning-soft text-warning'
                      }`}>
                        {ESTADO_LABELS[s.estado] || s.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
