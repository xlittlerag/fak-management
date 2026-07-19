import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';
import { Spinner } from '../components/Spinner';

const DISCIPLINA_LABELS: Record<string, string> = {
  KENDO: 'Kendo',
  IAIDO: 'Iaido',
  JODO: 'Jodo',
};

const DISCIPLINA_COLORS: Record<string, string> = {
  KENDO: 'bg-blue-50 text-blue-700 border-blue-200',
  IAIDO: 'bg-green-50 text-green-700 border-green-200',
  JODO: 'bg-purple-50 text-purple-700 border-purple-200',
};

interface DiplomaItem {
  id: number;
  disciplina: string;
  graduacion: string;
  url_archivo: string;
  created_at: string;
}

export default function MisDiplomas() {
  const [diplomas, setDiplomas] = useState<DiplomaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/mis-diplomas')
      .then(res => setDiplomas(res.data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text="Cargando diplomas..." />;
  if (error) return <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100">
        <h3 class="font-semibold text-slate-800">Mis Diplomas Nacionales</h3>
      </div>
      {diplomas.length === 0 ? (
        <div class="px-6 py-8 text-center text-slate-400">No tiene diplomas emitidos.</div>
      ) : (
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <th class="px-4 py-2">Disciplina</th>
                <th class="px-4 py-2">Graduación</th>
                <th class="px-4 py-2">Fecha de emisión</th>
                <th class="px-4 py-2">Archivo</th>
              </tr>
            </thead>
            <tbody>
              {diplomas.map(d => (
                <tr key={d.id} class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="px-4 py-2">
                    <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${DISCIPLINA_COLORS[d.disciplina] || ''}`}>
                      {DISCIPLINA_LABELS[d.disciplina] || d.disciplina}
                    </span>
                  </td>
                  <td class="px-4 py-2 font-medium">
                    {GRADUACIONES.find(g => g.value === d.graduacion)?.label || d.graduacion}
                  </td>
                  <td class="px-4 py-2 text-slate-500">
                    {new Date(d.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td class="px-4 py-2">
                    <a
                      href={d.url_archivo}
                      target="_blank"
                      class="text-slate-600 hover:text-slate-900 underline text-xs"
                    >
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
