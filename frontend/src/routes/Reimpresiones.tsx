import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';

function fileLabel(url: string): string {
  const ext = url.split('.').pop()?.toUpperCase();
  if (ext === 'PDF') return 'PDF';
  if (ext === 'PNG') return 'PNG';
  if (ext === 'JPG' || ext === 'JPEG') return 'JPG';
  return 'Archivo';
}

const DISC_LABEL: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

interface Reimpresion {
  id: number;
  pagado: boolean;
  created_at: string;
  mp_payment_id: string | null;
  usuario: { id: number; nombre: string; apellido: string; dni: string };
  diploma: { id: number; disciplina: string; graduacion: string; url_archivo: string };
}

export default function Reimpresiones() {
  const [reimpresiones, setReimpresiones] = useState<Reimpresion[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/admin/diploma/reimpresiones')
      .then(res => setReimpresiones(res.data))
      .catch(err => setMsg(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div class="text-steel">Cargando reimpresiones...</div>;

  return (
    <div class="space-y-4">
      {msg && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">{msg}</div>
      )}

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        {reimpresiones.length === 0 ? (
          <div class="px-6 py-8 text-center text-steel">No hay solicitudes de reimpresión.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                  <th class="px-4 py-2">Usuario</th>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación</th>
                  <th class="px-4 py-2">Pagado</th>
                  <th class="px-4 py-2">Fecha</th>
                  <th class="px-4 py-2">PDF Original</th>
                </tr>
              </thead>
              <tbody>
                {reimpresiones.map(r => (
                  <tr key={r.id} class="border-b border-steel-soft hover:bg-ai-soft/50">
                    <td class="px-4 py-2 font-medium">{r.usuario.nombre} {r.usuario.apellido}</td>
                    <td class="px-4 py-2">{DISC_LABEL[r.diploma.disciplina] || r.diploma.disciplina}</td>
                    <td class="px-4 py-2">{GRADUACIONES.find(g => g.value === r.diploma.graduacion)?.label || r.diploma.graduacion}</td>
                    <td class="px-4 py-2">
                      <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.pagado ? 'bg-success-soft text-success border-success/20' : 'bg-warning-soft text-warning border-warning/20'
                      }`}>
                        {r.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-steel">{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                    <td class="px-4 py-2">
                      <a href={r.diploma.url_archivo} target="_blank" rel="noopener noreferrer" class="text-steel hover:text-ink underline">Ver {fileLabel(r.diploma.url_archivo)}</a>
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
