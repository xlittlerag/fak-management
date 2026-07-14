import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';

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
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  APROBADO_ASOCIACION: 'bg-blue-50 text-blue-700 border-blue-200',
  APROBADO: 'bg-green-50 text-green-700 border-green-200',
  RECHAZADO: 'bg-red-50 text-red-700 border-red-200',
};

interface Certificado {
  id: number;
  url_archivo: string;
  disciplina: string;
  grad_solicitada: string;
  estado: string;
  created_at: string;
}

export default function Certificados() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disciplina, setDisciplina] = useState('KENDO');
  const [gradSolicitada, setGradSolicitada] = useState('KYU_3');
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
      await api.post('/certificados', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Certificación enviada correctamente');
      setFile(null);
      setDisciplina('KENDO');
      setGradSolicitada('KYU_3');
      const res = await api.get('/certificados');
      setCertificados(res.data);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-slate-400">Cargando certificaciones...</div>;
  if (error) return <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>;

  return (
    <div class="space-y-6">
      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg === 'Certificación enviada correctamente'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {msg}
        </div>
      )}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-bold mb-4 text-slate-800">Nueva Certificación Externa</h3>
        <p class="text-sm text-slate-500 mb-4">Suba un diploma de una entidad externa para solicitar su reconocimiento. El trámite requiere aprobación de su asociación y luego de la federación.</p>
        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
              <select
                value={disciplina}
                onChange={(e: Event) => setDisciplina((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Graduación solicitada</label>
              <select
                value={gradSolicitada}
                onChange={(e: Event) => setGradSolicitada((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
              >
                {GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION').map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Archivo del diploma</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e: Event) => setFile((e.target as HTMLInputElement).files?.[0] || null)}
              class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {file && <p class="text-xs text-green-600 mt-1">Archivo seleccionado: {file.name}</p>}
          </div>
          <button
            type="submit"
            disabled={saving || !file}
            class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Enviando...' : 'Solicitar Certificación'}
          </button>
        </form>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="font-semibold text-slate-800">Mis Certificaciones</h3>
        </div>
        {certificados.length === 0 ? (
          <div class="px-6 py-8 text-center text-slate-400">No tiene certificaciones registradas.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación</th>
                  <th class="px-4 py-2">Estado</th>
                  <th class="px-4 py-2">Fecha</th>
                  <th class="px-4 py-2">Archivo</th>
                </tr>
              </thead>
              <tbody>
                {certificados.map(c => (
                  <tr key={c.id} class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">{DISCIPLINAS.find(d => d.value === c.disciplina)?.label || c.disciplina}</td>
                    <td class="px-4 py-2">{GRADUACIONES.find(g => g.value === c.grad_solicitada)?.label || c.grad_solicitada}</td>
                    <td class="px-4 py-2">
                      <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ESTADO_COLORS[c.estado] || ''}`}>
                        {ESTADO_LABELS[c.estado] || c.estado}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-slate-500">{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                    <td class="px-4 py-2">
                      <a
                        href={c.url_archivo}
                        target="_blank"
                        class="text-slate-600 hover:text-slate-900 underline text-xs"
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