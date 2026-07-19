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

const DISC_LABEL: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

export default function DiplomasAdmin() {
  const [mode, setMode] = useState<'individual' | 'lote'>('individual');
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string; apellido: string; dni: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [disciplina, setDisciplina] = useState('KENDO');
  const [graduacion, setGraduacion] = useState('KYU_3');
  const [inscripcionId, setInscripcionId] = useState<number | undefined>();
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<{ id: number; tipo: string; fecha_inicio: string }[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [loteFiles, setLoteFiles] = useState<Record<string, File>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/usuarios').then(res => setUsuarios(res.data)).catch(() => {});
    api.get('/eventos/admin').then(res => setEventos(res.data)).catch(() => {});
  }, []);

  const handleSubmitIndividual = async (e: Event) => {
    e.preventDefault();
    if (!usuarioId) { setMsg('Debe seleccionar un usuario'); return; }
    if (!file) { setMsg('Debe seleccionar un archivo'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('usuario_id', String(usuarioId));
      fd.append('disciplina', disciplina);
      if (inscripcionId) fd.append('inscripcion_id', String(inscripcionId));
      if (!inscripcionId) fd.append('graduacion', graduacion);
      await api.post('/admin/diplomas', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMsg('Diploma cargado correctamente');
      setFile(null);
      setInscripcionId(undefined);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loadInscripciones = async (evId: number) => {
    setEventoId(evId);
    try {
      const res = await api.get(`/eventos/${evId}/inscripciones?aprobados=true`);
      setInscripciones(res.data);
    } catch (err) {
      setMsg(getErrorMessage(err));
    }
  };

  const handleSubmitLote = async () => {
    if (!eventoId) { setMsg('Debe seleccionar un evento'); return; }
    const entries = Object.entries(loteFiles);
    if (entries.length === 0) { setMsg('Debe seleccionar al menos un archivo'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('evento_id', String(eventoId));
      const metas: { usuario_id: number; disciplina: string }[] = [];
      entries.forEach(([key, f]) => {
        const [uid, disc] = key.split('_');
        metas.push({ usuario_id: parseInt(uid), disciplina: disc });
        fd.append('files', f);
      });
      fd.append('archivos_meta', JSON.stringify(metas));
      const res = await api.post('/admin/diplomas/lote', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const errs = res.data.errors;
      if (errs.length > 0) {
        setMsg(`Creados ${res.data.created}. Errores: ${errs.join('; ')}`);
      } else {
        setMsg(`${res.data.created} diplomas cargados correctamente`);
      }
      setLoteFiles({});
      setInscripciones([]);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const filteredUsuarios = usuarios.filter(u =>
    `${u.nombre} ${u.apellido} ${u.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Cargar Diplomas</h2>

      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg.startsWith('Error') || msg.startsWith('No')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>{msg}</div>
      )}

      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setMode('individual')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
          Individual
        </button>
        <button onClick={() => setMode('lote')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'lote' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
          Por Lote (post-examen)
        </button>
      </div>

      {mode === 'individual' && (
        <form onSubmit={handleSubmitIndividual} class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-800">Cargar Diploma Individual</h3>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Buscar usuario</label>
            <input type="text" placeholder="Nombre, apellido o DNI..." value={searchTerm}
              onInput={(e: Event) => setSearchTerm((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 mb-2" />
            <select value={usuarioId ?? ''}
              onChange={(e: Event) => setUsuarioId(parseInt((e.target as HTMLSelectElement).value) || null)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
              <option value="">Seleccionar usuario...</option>
              {filteredUsuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.dni})</option>
              ))}
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
              <select value={disciplina} onChange={(e: Event) => setDisciplina((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Graduación (si no hay inscripción)</label>
              <select value={graduacion} onChange={(e: Event) => setGraduacion((e.target as HTMLSelectElement).value)}
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ID de inscripción (opcional)</label>
            <input type="number" placeholder="Dejar vacío si es carga manual" value={inscripcionId ?? ''}
              onInput={(e: Event) => setInscripcionId(parseInt((e.target as HTMLInputElement).value) || undefined)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
          </div>
          <FileUpload
            label="Archivo del diploma"
            currentFile={file}
            onFileChange={setFile}
            required
          />
          <button type="submit" disabled={saving || !usuarioId || !file}
            class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Cargando...' : 'Cargar Diploma'}
          </button>
        </form>
      )}

      {mode === 'lote' && (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-800">Carga por Lote</h3>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Evento</label>
            <select value={eventoId ?? ''}
              onChange={(e: Event) => loadInscripciones(parseInt((e.target as HTMLSelectElement).value) || 0)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
              <option value="">Seleccionar evento...</option>
              {eventos.filter(e => e.tipo === 'EXAMEN').map(e => (
                <option key={e.id} value={e.id}>{e.tipo} - {new Date(e.fecha_inicio).toLocaleDateString('es-AR')}</option>
              ))}
            </select>
          </div>
          {inscripciones.length > 0 && (
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <th class="px-3 py-2">Usuario</th>
                    <th class="px-3 py-2">Disciplinas</th>
                    <th class="px-3 py-2">Archivo</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.map((ins: any) => {
                    const disciplinas = (ins.categoria_grad ? Object.keys(ins.categoria_grad) : []);
                    return disciplinas.map((disc: string) => (
                      <tr key={`${ins.id}_${disc}`} class="border-b border-slate-100">
                        <td class="px-3 py-2">{ins.usuario?.nombre} {ins.usuario?.apellido} ({ins.usuario?.dni})</td>
                        <td class="px-3 py-2">{DISC_LABEL[disc] || disc}</td>
                        <td class="px-3 py-2">
                          <FileUpload
                            label=""
                            currentFile={loteFiles[`${ins.usuario_id}_${disc}`] || null}
                            onFileChange={(f) => {
                              const key = `${ins.usuario_id}_${disc}`;
                              setLoteFiles(prev => {
                                const next = { ...prev };
                                if (f) next[key] = f;
                                else delete next[key];
                                return next;
                              });
                            }}
                            compact
                          />
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
          {Object.keys(loteFiles).length > 0 && (
            <button onClick={handleSubmitLote} disabled={saving}
              class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {saving ? 'Cargando...' : `Cargar ${Object.keys(loteFiles).length} diploma(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}