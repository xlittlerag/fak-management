import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { GRADUACIONES, SEXOS_CATEGORIA, CATEGORIAS_TORNEO_DEFAULT, PROVINCIAS } from '../constants';
import { getErrorMessage } from '../lib/error';
import { useAuth } from '../context/AuthContext';

interface Categoria {
  nombre: string;
  grad_min?: string;
  grad_max?: string;
  genero?: string;
  edad_min?: number;
  edad_max?: number;
}

interface Evento {
  id: number;
  tipo: string;
  ambito: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: Record<string, any>;
  publicado: boolean;
  pago_fuera_sistema: boolean;
  archivos_info: string[];
  creador_id?: number;
  torneo?: {
    disciplina: string;
    costo_inscripcion: number;
    categorias: Categoria[];
    inscripcion_multiple: boolean;
    grad_min?: string;
    grad_max?: string;
    info_adicional?: string;
    fecha_limite_informativa?: string;
    fecha_limite_real?: string;
    inscripciones_abiertas: boolean;
  };
  examen?: {
    disciplinas: string[];
    graduaciones_a_rendir: string[];
    info_adicional?: string;
  };
  seminario?: {
    disciplina: string;
    costo_inscripcion: number;
    info_adicional?: string;
  };
}

const TIPOS = ['TORNEO', 'EXAMEN', 'SEMINARIO'];
const GRAD_OPTS = GRADUACIONES.map(g => ({ value: g.value, label: g.label }));
const GRAD_EXAMEN_OPTS = GRADUACIONES.filter(g => g.value !== 'SIN_GRADUACION').map(g => ({ value: g.value, label: g.label }));
const DISCIPLINAS = [
  { value: 'KENDO', label: 'Kendo' },
  { value: 'IAIDO', label: 'Iaido' },
  { value: 'JODO', label: 'Jodo' },
];

interface RangoExamen {
  disciplina: string;
  grad_min: string;
  grad_max: string;
}

function emptyCategoria(): Categoria {
  return { nombre: '', grad_min: '', grad_max: '', genero: '', edad_min: undefined, edad_max: undefined };
}

function canEditEvent(evento: Evento, user: { id: number; rol: string } | null): boolean {
  if (!user) return false;
  if (user.rol === 'ADMIN_GENERAL') return true;
  if (user.rol === 'ADMIN_ASOCIACION' && evento.creador_id === user.id) return true;
  return false;
}

export default function EventosAdmin() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<Evento | null | undefined>(undefined);
  const [showPasados, setShowPasados] = useState(false);

  const [form, setForm] = useState({
    tipo: 'TORNEO',
    ambito: 'REGIONAL',
    fecha_inicio: '',
    fecha_fin: '',
    direccion: '',
    provincia: '',
    costo_inscripcion: '',
    disciplina: '',
    grad_min: '',
    grad_max: '',
    info_adicional: '',
    inscripcion_multiple: false,
    pago_fuera_sistema: false,
    fecha_limite_informativa: '',
    fecha_limite_real: '',
    archivos_info: '',
  });
  const [categorias, setCategorias] = useState<Categoria[]>([emptyCategoria()]);
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<string[]>(['KENDO']);
  const [rangosExamen, setRangosExamen] = useState<RangoExamen[]>([
    { disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' },
  ]);

  const isFormOpen = editing !== undefined;

  const fetchEventos = async () => {
    try {
      const res = await api.get('/eventos/admin');
      setEventos(res.data);
    } catch {
      setTableError('Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEventos(); }, []);

  useEffect(() => {
    if (form.tipo === 'EXAMEN') {
      setForm(prev => ({ ...prev, ambito: 'NACIONAL', pago_fuera_sistema: false }));
    }
  }, [form.tipo]);

  useEffect(() => {
    setRangosExamen(prev => {
      const kept = prev.filter(r => selectedDisciplinas.includes(r.disciplina));
      const newDiscs = selectedDisciplinas.filter(d => !kept.find(r => r.disciplina === d));
      if (newDiscs.length === 0) return kept;
      return [...kept, ...newDiscs.map(d => ({ disciplina: d, grad_min: 'KYU_3', grad_max: 'DAN_8' }))];
    });
  }, [selectedDisciplinas]);

  function resetForm() {
    setForm({
      tipo: 'TORNEO', ambito: 'REGIONAL', fecha_inicio: '', fecha_fin: '',
      direccion: '', provincia: '', costo_inscripcion: '',
      disciplina: '', grad_min: '', grad_max: '', info_adicional: '',
      inscripcion_multiple: false, pago_fuera_sistema: false,
      fecha_limite_informativa: '', fecha_limite_real: '', archivos_info: '',
    });
    setCategorias([emptyCategoria()]);
    setSelectedDisciplinas(['KENDO']);
    setRangosExamen([{ disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' }]);
    setFormError('');
  }

  function openCreate() {
    resetForm();
    setEditing(null);
  }

  function openEdit(ev: Evento) {
    setForm({
      tipo: ev.tipo,
      ambito: ev.ambito || 'REGIONAL',
      fecha_inicio: ev.fecha_inicio.slice(0, 10),
      fecha_fin: ev.fecha_fin.slice(0, 10),
      direccion: ((ev.datos_lugar as { direccion: string; provincia: string })?.direccion ?? ''),
      provincia: ((ev.datos_lugar as { direccion: string; provincia: string })?.provincia ?? ''),
      costo_inscripcion: String(ev.torneo?.costo_inscripcion ?? ev.seminario?.costo_inscripcion ?? ''),
      disciplina: ev.torneo?.disciplina ?? ev.seminario?.disciplina ?? '',
      grad_min: ev.torneo?.grad_min || '',
      grad_max: ev.torneo?.grad_max || '',
      info_adicional: ev.torneo?.info_adicional ?? ev.examen?.info_adicional ?? ev.seminario?.info_adicional ?? '',
      inscripcion_multiple: ev.torneo?.inscripcion_multiple || false,
      pago_fuera_sistema: ev.pago_fuera_sistema || false,
      fecha_limite_informativa: ev.torneo?.fecha_limite_informativa?.slice(0, 10) || '',
      fecha_limite_real: ev.torneo?.fecha_limite_real?.slice(0, 10) || '',
      archivos_info: (ev.archivos_info || []).join('\n'),
    });
    setCategorias(
      ev.torneo?.categorias?.length
        ? ev.torneo.categorias
        : [emptyCategoria()],
    );
    setSelectedDisciplinas(ev.examen?.disciplinas || ['KENDO']);
    const examRangos = ev.examen?.graduaciones_a_rendir as RangoExamen[] | undefined;
    setRangosExamen(
      Array.isArray(examRangos) && examRangos.length > 0
        ? examRangos
        : ev.examen?.disciplinas?.map(d => ({ disciplina: d, grad_min: 'KYU_3', grad_max: 'DAN_8' })) || [{ disciplina: 'KENDO', grad_min: 'KYU_3', grad_max: 'DAN_8' }]
    );
    setFormError('');
    setEditing(ev);
  }

  function cancelForm() {
    resetForm();
    setEditing(undefined);
  }

  function updateCat(index: number, field: keyof Categoria, value: string | number | undefined) {
    const next = [...categorias];
    next[index] = { ...next[index], [field]: value };
    setCategorias(next);
  }

  function addCategoria() {
    setCategorias([...categorias, emptyCategoria()]);
  }

  function removeCategoria(index: number) {
    if (categorias.length <= 1) return;
    setCategorias(categorias.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setFormError('');
    try {
      const body: Record<string, any> = {
        tipo: form.tipo,
        ambito: form.ambito,
        fecha_inicio: new Date(form.fecha_inicio + 'T00:00:00').toISOString(),
        fecha_fin: new Date(form.fecha_fin + 'T23:59:59').toISOString(),
        datos_lugar: { direccion: form.direccion, provincia: form.provincia },
        pago_fuera_sistema: form.pago_fuera_sistema,
      };

      if (form.archivos_info.trim()) {
        body.archivos_info = form.archivos_info.split('\n').map(s => s.trim()).filter(Boolean);
      }

      if (form.tipo === 'TORNEO') {
        body.disciplina = form.disciplina;
        body.costo_inscripcion = form.costo_inscripcion ? Number(form.costo_inscripcion) : 0;
        if (form.grad_min) body.grad_min = form.grad_min;
        if (form.grad_max) body.grad_max = form.grad_max;
        if (form.info_adicional) body.info_adicional = form.info_adicional;
        body.inscripcion_multiple = form.inscripcion_multiple;

        const validas = categorias.filter(c => c.nombre.trim());
        if (validas.length === 0) {
          setFormError('Debe agregar al menos una categoría');
          return;
        }
        body.categorias = validas;

        if (form.fecha_limite_informativa) {
          body.fecha_limite_informativa = new Date(form.fecha_limite_informativa + 'T23:59:59').toISOString();
        }
        if (form.fecha_limite_real) {
          body.fecha_limite_real = new Date(form.fecha_limite_real + 'T23:59:59').toISOString();
        }
      }

      if (form.tipo === 'EXAMEN') {
        body.disciplinas = selectedDisciplinas;
        body.graduaciones_a_rendir = rangosExamen;
        if (form.info_adicional) body.info_adicional = form.info_adicional;

        if (selectedDisciplinas.length === 0) {
          setFormError('Debe seleccionar al menos una disciplina');
          return;
        }
        if (rangosExamen.length === 0) {
          setFormError('Debe seleccionar al menos un rango de graduaciones');
          return;
        }
      }

      if (form.tipo === 'SEMINARIO') {
        body.disciplina = form.disciplina;
        body.costo_inscripcion = form.costo_inscripcion ? Number(form.costo_inscripcion) : 0;
        if (form.info_adicional) body.info_adicional = form.info_adicional;
      }

      if (editing) {
        await api.patch(`/eventos/${editing.id}`, body);
      } else {
        await api.post('/eventos', body);
      }

      cancelForm();
      fetchEventos();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('¿Está seguro de eliminar permanentemente este evento? Esta acción no se puede deshacer. Si el evento tiene inscripciones pendientes, también serán eliminadas.')) return;
    try {
      await api.delete(`/eventos/${editing.id}`);
      cancelForm();
      fetchEventos();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const handlePublicar = async (id: number) => {
    try {
      await api.patch(`/eventos/${id}/publicar`);
      fetchEventos();
    } catch {
      alert('Error al publicar evento');
    }
  };

  const handleCerrar = async (id: number) => {
    if (!confirm('¿Está seguro de cerrar las inscripciones para este evento?')) return;
    try {
      await api.post(`/eventos/${id}/cerrar-inscripciones`);
      fetchEventos();
    } catch {
      alert('Error al cerrar inscripciones');
    }
  };

  if (loading) return <div class="p-8 text-slate-400">Cargando...</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventosProximos = eventos.filter(ev => new Date(ev.fecha_inicio) >= today);
  const eventosPasados = eventos.filter(ev => new Date(ev.fecha_inicio) < today);
  const eventosVisibles = showPasados ? eventosPasados : eventosProximos;

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-slate-800">
          {showPasados ? 'Eventos Pasados' : 'Gestión de Eventos'}
        </h2>
        <div class="flex gap-2">
          {!isFormOpen && (
            <button
              onClick={() => setShowPasados(!showPasados)}
              class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              {showPasados ? 'Ver próximos' : 'Ver eventos pasados'}
            </button>
          )}
          {!isFormOpen && (
            <button
              onClick={openCreate}
              class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Crear Evento
            </button>
          )}
        </div>
      </div>

      {tableError && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{tableError}</div>}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th class="px-4 py-2">Tipo</th>
                <th class="px-4 py-2">Fecha</th>
                <th class="px-4 py-2">Lugar</th>
                <th class="px-4 py-2">Estado</th>
                <th class="px-4 py-2">Costo</th>
                <th class="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {eventosVisibles.map(ev => (
                <tr key={ev.id} class="hover:bg-slate-50">
                  <td class="px-4 py-2 font-medium">{ev.tipo}</td>
                  <td class="px-4 py-2 text-slate-600">
                    {new Date(ev.fecha_inicio).toLocaleDateString('es-AR')}
                  </td>
                  <td class="px-4 py-2 text-slate-600">{((ev.datos_lugar as { direccion: string; provincia: string })?.direccion ?? '-')}</td>
                  <td class="px-4 py-2">
                    <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ev.publicado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {ev.publicado ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    {ev.tipo === 'EXAMEN' ? 'Variable' : `$${(ev.torneo?.costo_inscripcion ?? ev.seminario?.costo_inscripcion ?? 0)}`}
                  </td>
                  <td class="px-4 py-2 text-right space-x-2">
                    {canEditEvent(ev, user) && (
                      <>
                        <button onClick={() => openEdit(ev)} class="text-blue-600 hover:underline">Editar</button>
                        {!ev.publicado && (
                          <button onClick={() => handlePublicar(ev.id)} class="text-green-600 hover:underline">Publicar</button>
                        )}
                        {ev.tipo === 'TORNEO' && ev.torneo?.inscripciones_abiertas && (
                          <button onClick={() => handleCerrar(ev.id)} class="text-orange-600 hover:underline">Cerrar insc.</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {eventosVisibles.length === 0 && (
                <tr>
                  <td colspan={6} class="px-4 py-8 text-center text-slate-500">
                    {showPasados ? 'No hay eventos pasados.' : 'No hay eventos próximos.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 class="text-base font-bold text-slate-900 mb-6">
            {editing ? 'Editar Evento' : 'Crear Evento'}
          </h3>

          {formError && (
            <div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{formError}</div>
          )}

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e: Event) => setForm({...form, tipo: (e.target as HTMLSelectElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
              >
                {(user?.rol === 'ADMIN_GENERAL' ? TIPOS : TIPOS.filter(t => t !== 'EXAMEN')).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ámbito</label>
              <select
                value={form.ambito}
                onChange={(e: Event) => setForm({...form, ambito: (e.target as HTMLSelectElement).value})}
                disabled={form.tipo === 'EXAMEN'}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="REGIONAL">Regional</option>
                <option value="NACIONAL">Nacional</option>
              </select>
              {form.tipo === 'EXAMEN' && <p class="text-[10px] text-slate-400 mt-0.5">Los exámenes son siempre nacionales</p>}
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Inicio</label>
              <input type="date" value={form.fecha_inicio}
                onInput={(e: Event) => setForm({...form, fecha_inicio: (e.target as HTMLInputElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fin</label>
              <input type="date" value={form.fecha_fin}
                onInput={(e: Event) => setForm({...form, fecha_fin: (e.target as HTMLInputElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección</label>
              <input type="text" value={form.direccion}
                onInput={(e: Event) => setForm({...form, direccion: (e.target as HTMLInputElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Provincia</label>
              <select value={form.provincia}
                onChange={(e: Event) => setForm({...form, provincia: (e.target as HTMLSelectElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
              >
                <option value="">Seleccionar provincia</option>
                {PROVINCIAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {form.tipo === 'TORNEO' && (
              <>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo de inscripción</label>
                  <input type="number" value={form.costo_inscripcion}
                    onInput={(e: Event) => setForm({...form, costo_inscripcion: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Disciplina</label>
                  <select value={form.disciplina}
                    onChange={(e: Event) => setForm({...form, disciplina: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
                  >
                    {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grad. mínima</label>
                  <select value={form.grad_min}
                    onChange={(e: Event) => setForm({...form, grad_min: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Sin requisito</option>
                    {GRAD_OPTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grad. máxima</label>
                  <select value={form.grad_max}
                    onChange={(e: Event) => setForm({...form, grad_max: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
                  >
                    <option value="">Sin requisito</option>
                    {GRAD_OPTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {form.tipo === 'SEMINARIO' && (
              <>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo de inscripción</label>
                  <input type="number" value={form.costo_inscripcion}
                    onInput={(e: Event) => setForm({...form, costo_inscripcion: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Disciplina</label>
                  <select value={form.disciplina}
                    onChange={(e: Event) => setForm({...form, disciplina: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2"
                  >
                    {DISCIPLINAS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              </>
            )}

            {form.tipo === 'TORNEO' && (
              <div class="flex items-end">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.inscripcion_multiple}
                    onChange={(e: Event) => setForm({...form, inscripcion_multiple: (e.target as HTMLInputElement).checked})}
                    class="w-4 h-4" />
                  <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Inscripción múltiple</span>
                </label>
              </div>
            )}

            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pago_fuera_sistema}
                  onChange={(e: Event) => setForm({...form, pago_fuera_sistema: (e.target as HTMLInputElement).checked})}
                  disabled={form.ambito === 'NACIONAL' || form.tipo === 'EXAMEN'}
                  class="w-4 h-4 disabled:opacity-40" />
                <span class={`text-xs font-bold uppercase tracking-wider ${form.ambito === 'NACIONAL' || form.tipo === 'EXAMEN' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Pago fuera del sistema
                </span>
                {(form.ambito === 'NACIONAL' || form.tipo === 'EXAMEN') && <span class="text-[10px] text-slate-400 ml-1">(no disponible para eventos nacionales)</span>}
              </label>
            </div>

            {form.tipo === 'TORNEO' && (
              <>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha límite informativa</label>
                  <input type="date" value={form.fecha_limite_informativa}
                    onInput={(e: Event) => setForm({...form, fecha_limite_informativa: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha límite real</label>
                  <input type="date" value={form.fecha_limite_real}
                    onInput={(e: Event) => setForm({...form, fecha_limite_real: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
                </div>
              </>
            )}

            <div class="lg:col-span-3">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Archivos de información (URLs, uno por línea)</label>
              <textarea value={form.archivos_info}
                onInput={(e: Event) => setForm({...form, archivos_info: (e.target as HTMLTextAreaElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" rows={2} />
            </div>

            <div class={form.tipo === 'EXAMEN' ? 'lg:col-span-3' : 'lg:col-span-3'}>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Información adicional</label>
              <textarea value={form.info_adicional}
                onInput={(e: Event) => setForm({...form, info_adicional: (e.target as HTMLTextAreaElement).value})}
                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" rows={3} />
            </div>
          </div>

          {/* Disciplinas para EXAMEN */}
          {form.tipo === 'EXAMEN' && (
            <div class="mt-6">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Disciplinas</label>
              <div class="flex flex-wrap gap-4">
                {DISCIPLINAS.map(d => {
                  const active = selectedDisciplinas.includes(d.value);
                  return (
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={active}
                        onChange={() => {
                          if (active) {
                            setSelectedDisciplinas(selectedDisciplinas.filter(x => x !== d.value));
                          } else {
                            setSelectedDisciplinas([...selectedDisciplinas, d.value]);
                          }
                        }}
                        class="w-4 h-4" />
                      {d.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rangos de graduaciones por disciplina para EXAMEN */}
          {form.tipo === 'EXAMEN' && (
            <div class="mt-4 space-y-4">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Rangos de graduaciones por disciplina
              </label>
              {selectedDisciplinas.map(d => {
                const rango = rangosExamen.find(r => r.disciplina === d) || { disciplina: d, grad_min: 'KYU_3', grad_max: 'DAN_8' };
                return (
                  <div key={d} class="flex flex-wrap items-end gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span class="text-sm font-semibold text-slate-700 min-w-[60px]">{DISCIPLINAS.find(dd => dd.value === d)?.label || d}</span>
                    <div>
                      <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Desde</label>
                      <select
                        value={rango.grad_min}
                        onChange={(e: Event) => {
                          const val = (e.target as HTMLSelectElement).value;
                          setRangosExamen(rangosExamen.map(r =>
                            r.disciplina === d ? { ...r, grad_min: val } : r
                          ));
                        }}
                        class="text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                      >
                        {GRAD_EXAMEN_OPTS.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Hasta</label>
                      <select
                        value={rango.grad_max}
                        onChange={(e: Event) => {
                          const val = (e.target as HTMLSelectElement).value;
                          setRangosExamen(rangosExamen.map(r =>
                            r.disciplina === d ? { ...r, grad_max: val } : r
                          ));
                        }}
                        class="text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                      >
                        {GRAD_EXAMEN_OPTS.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
              {selectedDisciplinas.length === 0 && (
                <p class="text-sm text-slate-400">Seleccione al menos una disciplina para configurar los rangos.</p>
              )}
            </div>
          )}

          {/* Categorías para TORNEO */}
          {form.tipo === 'TORNEO' && (
            <div class="mt-6">
              <div class="flex items-center justify-between mb-3">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Categorías</label>
                <div class="flex gap-2">
                  <button
                    onClick={() => setCategorias(CATEGORIAS_TORNEO_DEFAULT.map(c => ({ ...c })))}
                    class="text-xs text-green-600 hover:underline font-medium"
                  >
                    Cargar por defecto
                  </button>
                  <button
                    onClick={addCategoria}
                    class="text-xs text-blue-600 hover:underline font-medium"
                  >
                    + Agregar categoría
                  </button>
                </div>
              </div>

              <div class="space-y-3">
                {categorias.map((cat, i) => (
                  <div key={i} class="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-semibold text-slate-500">Categoría {i + 1}</span>
                      {categorias.length > 1 && (
                        <button
                          onClick={() => removeCategoria(i)}
                          class="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Nombre</label>
                        <input type="text" value={cat.nombre}
                          onInput={(e: Event) => updateCat(i, 'nombre', (e.target as HTMLInputElement).value)}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                          placeholder="Ej: Torneo Kyu" />
                      </div>
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Grad. mínima</label>
                        <select value={cat.grad_min || ''}
                          onChange={(e: Event) => updateCat(i, 'grad_min', (e.target as HTMLSelectElement).value || undefined)}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                        >
                          <option value="">Sin requisito</option>
                          {GRAD_OPTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Grad. máxima</label>
                        <select value={cat.grad_max || ''}
                          onChange={(e: Event) => updateCat(i, 'grad_max', (e.target as HTMLSelectElement).value || undefined)}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                        >
                          <option value="">Sin requisito</option>
                          {GRAD_OPTS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Género</label>
                        <select value={cat.genero || ''}
                          onChange={(e: Event) => updateCat(i, 'genero', (e.target as HTMLSelectElement).value || undefined)}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                        >
                          {SEXOS_CATEGORIA.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Edad mín.</label>
                        <input type="number" value={cat.edad_min ?? ''}
                          onInput={(e: Event) => {
                            const val = (e.target as HTMLInputElement).value;
                            updateCat(i, 'edad_min', val ? parseInt(val) : undefined);
                          }}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                          placeholder="Ej: 8" />
                      </div>
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Edad máx.</label>
                        <input type="number" value={cat.edad_max ?? ''}
                          onInput={(e: Event) => {
                            const val = (e.target as HTMLInputElement).value;
                            updateCat(i, 'edad_max', val ? parseInt(val) : undefined);
                          }}
                          class="w-full text-sm border-slate-300 rounded-md shadow-sm p-1.5"
                          placeholder="Ej: 17" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div class="flex gap-3 mt-6 pt-4 border-t border-slate-200">
            {editing && (
              <button
                onClick={handleDelete}
                class="px-6 py-2 bg-red-700 text-white rounded-md font-medium hover:bg-red-800 transition-colors text-sm"
              >
                Eliminar permanentemente
              </button>
            )}
            <button
              onClick={cancelForm}
              class="px-6 py-2 bg-slate-100 text-slate-700 rounded-md font-medium hover:bg-slate-200 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              class="px-6 py-2 bg-slate-900 text-white rounded-md font-medium hover:bg-slate-800 transition-colors text-sm"
            >
              {editing ? 'Guardar Cambios' : 'Crear Evento'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
