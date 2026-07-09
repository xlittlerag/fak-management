import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';

const DISCIPLINAS = [
  { value: 'KENDO', label: 'Kendo' },
  { value: 'IAIDO', label: 'Iaido' },
  { value: 'JODO', label: 'Jodo' },
];

const DISC_LABEL: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

const tabs = ['Cargar Diplomas', 'Reimpresiones', 'Configuración'];

interface Reimpresion {
  id: number;
  pagado: boolean;
  created_at: string;
  mp_payment_id: string | null;
  usuario: { id: number; nombre: string; apellido: string; dni: string };
  diploma: { id: number; disciplina: string; graduacion: string; url_archivo: string };
}

export default function DiplomasAdmin() {
  const [activeTab, setActiveTab] = useState(0);
  const [msg, setMsg] = useState('');

  return (
    <div class="space-y-6">
      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg.startsWith('Error') || msg.startsWith('No')
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {msg}
        </div>
      )}

      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === i ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && <CargaDiplomas setMsg={setMsg} />}
      {activeTab === 1 && <ReimpresionesList setMsg={setMsg} />}
      {activeTab === 2 && <ConfigDiploma setMsg={setMsg} />}
    </div>
  );
}

function CargaDiplomas({ setMsg }: { setMsg: (m: string) => void }) {
  const [mode, setMode] = useState<'individual' | 'lote'>('individual');
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string; apellido: string; dni: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [disciplina, setDisciplina] = useState('KENDO');
  const [graduacion, setGraduacion] = useState('KYU_3');
  const [inscripcionId, setInscripcionId] = useState<number | undefined>();
  const [fileUrl, setFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventos, setEventos] = useState<{ id: number; tipo: string; fecha_inicio: string }[]>([]);
  const [eventoId, setEventoId] = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [loteArchivos, setLoteArchivos] = useState<Record<string, string>>({});
  const [loteUploading, setLoteUploading] = useState<number | null>(null);

  useEffect(() => {
    api.get('/usuarios').then(res => setUsuarios(res.data)).catch(() => {});
    api.get('/eventos/admin').then(res => setEventos(res.data)).catch(() => {});
  }, []);

  const handleUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', input.files[0]);
      const res = await api.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFileUrl(res.data.url);
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitIndividual = async (e: Event) => {
    e.preventDefault();
    if (!usuarioId) { setMsg('Debe seleccionar un usuario'); return; }
    if (!fileUrl) { setMsg('Debe subir un archivo PDF'); return; }
    setSaving(true);
    try {
      await api.post('/admin/diplomas', {
        url_archivo: fileUrl,
        usuario_id: usuarioId,
        disciplina,
        graduacion: inscripcionId ? undefined : graduacion,
        inscripcion_id: inscripcionId || undefined,
      });
      setMsg('Diploma cargado correctamente');
      setFileUrl('');
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

  const handleUploadLote = async (e: Event, userId: number, disc: string) => {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    setLoteUploading(userId);
    try {
      const fd = new FormData();
      fd.append('file', input.files[0]);
      const res = await api.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const key = `${userId}_${disc}`;
      setLoteArchivos(prev => {
        const next = { ...prev };
        next[key] = res.data.url;
        return next;
      });
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setLoteUploading(null);
    }
  };

  const handleSubmitLote = async () => {
    if (!eventoId) { setMsg('Debe seleccionar un evento'); return; }
    const archivos = Object.entries(loteArchivos).map(([key, url]) => {
      const [uid, disc] = key.split('_');
      return { usuario_id: parseInt(uid), disciplina: disc, url_archivo: url };
    });
    if (archivos.length === 0) { setMsg('Debe subir al menos un archivo'); return; }
    setSaving(true);
    try {
      const res = await api.post('/admin/diplomas/lote', { evento_id: eventoId, archivos });
      const errs = res.data.errors;
      if (errs.length > 0) {
        setMsg(`Creados ${res.data.created}. Errores: ${errs.join('; ')}`);
      } else {
        setMsg(`${res.data.created} diplomas cargados correctamente`);
      }
      setLoteArchivos({});
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
      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode('individual')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          Individual
        </button>
        <button
          onClick={() => setMode('lote')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'lote' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          Por Lote (post-examen)
        </button>
      </div>

      {mode === 'individual' && (
        <form onSubmit={handleSubmitIndividual} class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-800">Cargar Diploma Individual</h3>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Buscar usuario</label>
            <input
              type="text"
              placeholder="Nombre, apellido o DNI..."
              value={searchTerm}
              onInput={(e: Event) => setSearchTerm((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 mb-2"
            />
            <select
              value={usuarioId ?? ''}
              onChange={(e: Event) => setUsuarioId(parseInt((e.target as HTMLSelectElement).value) || null)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Seleccionar usuario...</option>
              {filteredUsuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.dni})</option>
              ))}
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
              <select value={disciplina} onChange={(e: Event) => setDisciplina((e.target as HTMLSelectElement).value)} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Graduación (si no hay inscripción)</label>
              <select value={graduacion} onChange={(e: Event) => setGraduacion((e.target as HTMLSelectElement).value)} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">ID de inscripción (opcional)</label>
            <input
              type="number"
              placeholder="Dejar vacío si es carga manual"
              value={inscripcionId ?? ''}
              onInput={(e: Event) => setInscripcionId(parseInt((e.target as HTMLInputElement).value) || undefined)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Archivo PDF</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUpload} class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            {uploading && <p class="text-xs text-slate-400 mt-1">Subiendo archivo...</p>}
            {fileUrl && <p class="text-xs text-green-600 mt-1">Archivo listo: {fileUrl.split('/').pop()}</p>}
          </div>
          <button type="submit" disabled={saving || uploading || !usuarioId || !fileUrl} class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
            {saving ? 'Cargando...' : 'Cargar Diploma'}
          </button>
        </form>
      )}

      {mode === 'lote' && (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-800">Carga por Lote</h3>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Evento</label>
            <select
              value={eventoId ?? ''}
              onChange={(e: Event) => loadInscripciones(parseInt((e.target as HTMLSelectElement).value) || 0)}
              class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
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
                          {loteArchivos[`${ins.usuario_id}_${disc}`] ? (
                            <span class="text-green-600 text-[10px]">Subido</span>
                          ) : (
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={(e: Event) => handleUploadLote(e, ins.usuario_id, disc)}
                              class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700"
                            />
                          )}
                          {loteUploading === ins.usuario_id && <span class="text-[10px] text-slate-400 ml-1">Subiendo...</span>}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
          {Object.keys(loteArchivos).length > 0 && (
            <button
              onClick={handleSubmitLote}
              disabled={saving}
              class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Cargando...' : `Cargar ${Object.keys(loteArchivos).length} diploma(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReimpresionesList({ setMsg }: { setMsg: (m: string) => void }) {
  const [reimpresiones, setReimpresiones] = useState<Reimpresion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/diploma/reimpresiones')
      .then(res => setReimpresiones(res.data))
      .catch(err => setMsg(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div class="text-slate-400">Cargando reimpresiones...</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100">
        <h3 class="font-semibold text-slate-800">Solicitudes de Reimpresión</h3>
      </div>
      {reimpresiones.length === 0 ? (
        <div class="px-6 py-8 text-center text-slate-400">No hay solicitudes de reimpresión.</div>
      ) : (
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                <tr key={r.id} class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="px-4 py-2 font-medium">{r.usuario.nombre} {r.usuario.apellido}</td>
                  <td class="px-4 py-2">{DISC_LABEL[r.diploma.disciplina] || r.diploma.disciplina}</td>
                  <td class="px-4 py-2">{GRADUACIONES.find(g => g.value === r.diploma.graduacion)?.label || r.diploma.graduacion}</td>
                  <td class="px-4 py-2">
                    <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      r.pagado ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {r.pagado ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-slate-500">{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                  <td class="px-4 py-2">
                    <a href={r.diploma.url_archivo} target="_blank" class="text-slate-600 hover:text-slate-900 underline">
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

function ConfigDiploma({ setMsg }: { setMsg: (m: string) => void }) {
  const [precio, setPrecio] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/diploma/config')
      .then(res => setPrecio(res.data.precio_reimpresion))
      .catch(err => setMsg(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/diploma/config', { precio_reimpresion: precio });
      setMsg('Precio actualizado correctamente');
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-slate-400">Cargando configuración...</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 class="text-base font-bold text-slate-800">Configuración de Reimpresión</h3>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Precio de reimpresión ($)</label>
        <input
          type="number"
          min="0"
          value={precio}
          onInput={(e: Event) => setPrecio(parseFloat((e.target as HTMLInputElement).value) || 0)}
          class="w-full max-w-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}
