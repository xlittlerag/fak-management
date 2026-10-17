import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';
import { FileUpload } from '../components/FileUpload';

const DISCIPLINAS = [
  { value: 'KENDO', label: 'Kendo' },
  { value: 'IAIDO', label: 'Iaido' },
  { value: 'JODO', label: 'Jodo' },
];

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO_ASOCIACION: 'Aprobado (Asociación)',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-warning-soft text-warning border-warning/20',
  APROBADO_ASOCIACION: 'bg-ai-soft text-ai border-ai/20',
  APROBADO: 'bg-success-soft text-success border-success/20',
  RECHAZADO: 'bg-hinomaru-soft text-hinomaru border-hinomaru/20',
};

interface Certificado {
  id: number;
  url_archivo: string;
  disciplina: string;
  grad_solicitada: string;
  estado: string;
  fecha_obtencion?: string | null;
  created_at: string;
}

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disciplina, setDisciplina] = useState('KENDO');
  const [gradSolicitada, setGradSolicitada] = useState('KYU_3');
  const [fechaObtencion, setFechaObtencion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/certificados')
      .then(res => setCertificados(res.data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!file) { setMsg('Debe seleccionar un archivo'); return; }
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('disciplina', disciplina);
      fd.append('grad_solicitada', gradSolicitada);
      // TC-07: fecha real de obtención del grado (puede ser anterior a la carga).
      if (fechaObtencion) fd.append('fecha_obtencion', fechaObtencion);
      await api.post('/certificados', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Certificación enviada correctamente');
      setFile(null);
      setDisciplina('KENDO');
      setGradSolicitada('KYU_3');
      setFechaObtencion('');
      const res = await api.get('/certificados');
      setCertificados(res.data);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-steel">Cargando certificaciones...</div>;
  if (error) return <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">{error}</div>;

  return (
    <div class="space-y-6">
      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg === 'Certificación enviada correctamente'
            ? 'bg-success-soft border-success/20 text-success'
            : 'bg-hinomaru-soft border-hinomaru/20 text-hinomaru'
        }`}>
          {msg}
        </div>
      )}

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
        <h3 class="text-lg font-bold mb-4 text-ink">Nueva Certificación Externa</h3>
        <p class="text-sm text-steel mb-4">Suba un diploma de una entidad externa para solicitar su reconocimiento. El trámite requiere aprobación de su asociación y luego de la federación.</p>
        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cert-disciplina" class="block text-sm font-medium text-ink mb-1">Disciplina</label>
              <select
                id="cert-disciplina"
                value={disciplina}
                onChange={(e: Event) => setDisciplina((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              >
                {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cert-graduacion" class="block text-sm font-medium text-ink mb-1">Graduación solicitada</label>
              <select
                id="cert-graduacion"
                value={gradSolicitada}
                onChange={(e: Event) => setGradSolicitada((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              >
                {GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION').map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="cert-fecha-obtencion" class="block text-sm font-medium text-ink mb-1">Fecha de obtención del grado</label>
            <input
              id="cert-fecha-obtencion"
              type="date"
              value={fechaObtencion}
              onInput={(e: Event) => setFechaObtencion((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
            />
            <p class="text-xs text-steel mt-1">Si obtuvo el grado antes de subir el archivo, indíquelo aquí. Si lo deja vacío se usará la fecha de aprobación.</p>
          </div>
          <FileUpload
            label="Archivo del diploma"
            currentFile={file}
            onFileChange={setFile}
            required
          />
          <button
            type="submit"
            disabled={saving || !file}
            class="px-8 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Enviando...' : 'Solicitar Certificación'}
          </button>
        </form>
      </div>

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-steel-soft">
          <h3 class="font-semibold text-ink">Mis Certificaciones</h3>
        </div>
        {certificados.length === 0 ? (
          <div class="px-6 py-8 text-center text-steel">No tiene certificaciones registradas.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación</th>
                  <th class="px-4 py-2">Estado</th>
                  <th class="px-4 py-2">Fecha</th>
                  <th class="px-4 py-2">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {certificados.map(c => (
                  <tr key={c.id} class="border-b border-steel-soft hover:bg-ai-soft/50">
                    <td class="px-4 py-2 font-medium">{DISCIPLINAS.find(d => d.value === c.disciplina)?.label || c.disciplina}</td>
                    <td class="px-4 py-2">{GRADUACIONES.find(g => g.value === c.grad_solicitada)?.label || c.grad_solicitada}</td>
                    <td class="px-4 py-2">
                      <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ESTADO_COLORS[c.estado] || ''}`}>
                        {ESTADO_LABELS[c.estado] || c.estado}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-steel">{new Date(c.fecha_obtencion || c.created_at).toLocaleDateString('es-AR')}</td>
                    <td class="px-4 py-2">
                      <a
                        href={c.url_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-steel hover:text-ink underline text-xs"
                      >
                        Ver archivo
                      </a>
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