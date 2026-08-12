import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface Mesa {
  id: number;
  evento_id: number;
  disciplina: string;
  examinadores: string[];
  grad_min: string;
  grad_max: string;
}

interface InstanciaResultado {
  disciplina: string;
  graduacion: string;
  instancia: string;
  aprobado: boolean | null;
  mesa_id: number | null;
  registro_pagado: boolean;
  graduacion_aplicada: boolean;
}

interface ResultadoCandidato {
  inscripcion_id: number;
  usuario: { id: number; nombre: string; email: string; dni: string };
  instancias: InstanciaResultado[];
}

interface EventoAdmin {
  id: number;
  tipo: string;
  fecha_inicio: string;
  examen?: { disciplinas: string[] };
}

const GRAD_LABEL: Record<string, string> = {
  SIN_GRADUACION: 'Sin graduación',
  KYU_3: '3° Kyu',
  KYU_2: '2° Kyu',
  KYU_1: '1° Kyu',
  DAN_1: '1° Dan',
  DAN_2: '2° Dan',
  DAN_3: '3° Dan',
  DAN_4: '4° Dan',
  DAN_5: '5° Dan',
  DAN_6: '6° Dan',
  DAN_7: '7° Dan',
  DAN_8: '8° Dan',
};

const DISC_LABEL: Record<string, string> = {
  KENDO: 'Kendo',
  IAIDO: 'Iaido',
  JODO: 'Jodo',
};

const INSTANCIA_LABEL: Record<string, string> = {
  PRACTICO: 'Práctico',
  KATA: 'Kata',
  ESCRITO: 'Escrito',
};

const GRADOS = Object.keys(GRAD_LABEL).filter((g) => g !== 'SIN_GRADUACION');

const GRADUACION_RANK: Record<string, number> = {
  SIN_GRADUACION: 0,
  KYU_3: 1,
  KYU_2: 2,
  KYU_1: 3,
  DAN_1: 4,
  DAN_2: 5,
  DAN_3: 6,
  DAN_4: 7,
  DAN_5: 8,
  DAN_6: 9,
  DAN_7: 10,
  DAN_8: 11,
};

const rankGrad = (g: string): number => GRADUACION_RANK[g] ?? -1;

interface MesaFormState {
  id: number | null;
  disciplina: string;
  examinadores: string;
  grad_min: string;
  grad_max: string;
}

export default function Mesas() {
  const { route } = useLocation();
  const params = new URLSearchParams(window.location.search);
  const eventoId = params.get('eventoId');

  const [evento, setEvento] = useState<EventoAdmin | null>(null);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [resultados, setResultados] = useState<ResultadoCandidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MesaFormState>({
    id: null,
    disciplina: '',
    examinadores: '',
    grad_min: '',
    grad_max: '',
  });
  const [confirmDelete, setConfirmDelete] = useState<Mesa | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventoId) fetchData();
    else setLoading(false);
  }, [eventoId]);

  const fetchData = async () => {
    if (!eventoId) return;
    try {
      const eventoRes = await api.get(`/eventos/${eventoId}`);
      const mesasRes = await api.get(`/admin/eventos/${eventoId}/mesas`);
      const resultadosRes = await api.get(`/admin/examenes/${eventoId}/resultados`);
      setEvento(eventoRes.data);
      setMesas(mesasRes.data);
      setResultados(resultadosRes.data);
    } catch {
      setError('Error al cargar los datos del examen');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm({
      id: null,
      disciplina: (evento?.examen?.disciplinas?.[0] as string) || 'KENDO',
      examinadores: '',
      grad_min: 'KYU_3',
      grad_max: 'DAN_8',
    });
    setFormOpen(true);
  };

  const openEdit = (mesa: Mesa) => {
    setForm({
      id: mesa.id,
      disciplina: mesa.disciplina,
      examinadores: mesa.examinadores.join(', '),
      grad_min: mesa.grad_min,
      grad_max: mesa.grad_max,
    });
    setFormOpen(true);
  };

  const handleSaveMesa = async () => {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const examinadores = form.examinadores
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      if (examinadores.length === 0) {
        setError('Debe indicar al menos un examinador');
        return;
      }
      const body = {
        disciplina: form.disciplina,
        examinadores,
        grad_min: form.grad_min,
        grad_max: form.grad_max,
      };
      if (form.id) {
        await api.patch(`/admin/mesas/${form.id}`, body);
        setMsg('Mesa actualizada correctamente');
      } else {
        await api.post(`/admin/eventos/${eventoId}/mesas`, body);
        setMsg('Mesa creada correctamente');
      }
      setFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const m = axiosErr.response?.data?.message;
      setError(Array.isArray(m) ? m.join(' - ') : m || 'Error al guardar la mesa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setError('');
    setMsg('');
    try {
      await api.delete(`/admin/mesas/${confirmDelete.id}`);
      setMsg('Mesa eliminada correctamente');
      setConfirmDelete(null);
      fetchData();
    } catch {
      setError('No se puede eliminar la mesa porque tiene resultados cargados');
      setConfirmDelete(null);
    }
  };

  const mesasCompatibles = (disciplina: string, graduacion: string): Mesa[] =>
    mesas.filter(
      (m) =>
        m.disciplina === disciplina &&
        rankGrad(graduacion) >= rankGrad(m.grad_min) &&
        rankGrad(graduacion) <= rankGrad(m.grad_max),
    );

  const [mesaSeleccionada, setMesaSeleccionada] = useState<Record<string, number>>({});

  const handleCargarResultado = async (
    inscripcionId: number,
    instancia: InstanciaResultado,
    aprobado: boolean,
  ) => {
    setError('');
    setMsg('');
    const compatibles = mesasCompatibles(instancia.disciplina, instancia.graduacion);
    const key = `${inscripcionId}-${instancia.disciplina}-${instancia.instancia}`;
    const mesa_id = compatibles.length > 1 ? mesaSeleccionada[key] : undefined;
    if (compatibles.length > 1 && !mesa_id) {
      setError('Seleccione la mesa antes de cargar el resultado');
      return;
    }
    try {
      await api.post('/admin/resultados', {
        inscripcion_id: inscripcionId,
        disciplina: instancia.disciplina,
        instancia: instancia.instancia,
        aprobado,
        mesa_id,
      });
      setMsg(
        aprobado
          ? 'Instancia aprobada correctamente'
          : 'Instancia desaprobada correctamente',
      );
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const m = axiosErr.response?.data?.message;
      setError(Array.isArray(m) ? m.join(' - ') : m || 'Error al cargar el resultado');
    }
  };

  const handleRegistrarPago = async (inscripcionId: number, disciplina: string) => {
    setError('');
    setMsg('');
    try {
      await api.post(`/admin/inscripciones/${inscripcionId}/registro-pagado`, { disciplina });
      setMsg('Registro de pago confirmado');
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const m = axiosErr.response?.data?.message;
      setError(Array.isArray(m) ? m.join(' - ') : m || 'Error al registrar el pago');
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando examen..." /></div>;

  if (!eventoId) {
    return (
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <h4 class="font-semibold text-slate-800 mb-2">Mesas examinadoras</h4>
        <p class="text-slate-500 text-sm mb-4">
          Seleccione un examen desde Gestión de Eventos para administrar sus mesas.
        </p>
        <button
          onClick={() => route('/dashboard/eventos-admin')}
          class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Ir a Gestión de Eventos
        </button>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">Mesas examinadoras</h3>
          {evento && (
            <p class="text-sm text-slate-500">
              {new Date(evento.fecha_inicio).toLocaleDateString('es-AR')}
            </p>
          )}
        </div>
        <div class="flex gap-2">
          <button
            onClick={() => route('/dashboard/eventos-admin')}
            class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ← Volver a Eventos
          </button>
          <button
            onClick={openCreate}
            class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            Nueva Mesa
          </button>
        </div>
      </div>

      {error && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>}
      {msg && <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">{msg}</div>}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h4 class="font-semibold text-slate-800">Mesas</h4>
        </div>
        {mesas.length === 0 ? (
          <p class="px-6 py-8 text-center text-slate-500 text-sm">No hay mesas creadas para este examen.</p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Examinadores</th>
                  <th class="px-4 py-2">Graduaciones</th>
                  <th class="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {mesas.map((mesa) => (
                  <tr key={mesa.id} class="hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">{DISC_LABEL[mesa.disciplina] || mesa.disciplina}</td>
                    <td class="px-4 py-2 text-slate-600">{mesa.examinadores.join(', ')}</td>
                    <td class="px-4 py-2 text-slate-600">
                      {GRAD_LABEL[mesa.grad_min]} - {GRAD_LABEL[mesa.grad_max]}
                    </td>
                    <td class="px-4 py-2 text-right space-x-2">
                      <button onClick={() => openEdit(mesa)} class="text-blue-600 hover:underline">Editar</button>
                      <button onClick={() => setConfirmDelete(mesa)} class="text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h4 class="font-semibold text-slate-800">Resultados por candidato</h4>
        </div>
        {resultados.length === 0 ? (
          <p class="px-6 py-8 text-center text-slate-500 text-sm">
            No hay candidatos con inscripción aprobada en este examen.
          </p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th class="px-4 py-2">Candidato</th>
                  <th class="px-4 py-2">DNI</th>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación a rendir</th>
                  <th class="px-4 py-2">Instancia</th>
                  <th class="px-4 py-2">Estado</th>
                  <th class="px-4 py-2">Mesa</th>
                  <th class="px-4 py-2">Registro pago</th>
                  <th class="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                {resultados.map((candidato) => (
                  candidato.instancias.map((inst) => {
                    const key = `${candidato.inscripcion_id}-${inst.disciplina}-${inst.instancia}`;
                    const compatibles = mesasCompatibles(inst.disciplina, inst.graduacion);
                    return (
                      <tr key={key} class="hover:bg-slate-50">
                        <td class="px-4 py-2 font-medium">{candidato.usuario.nombre}</td>
                        <td class="px-4 py-2 text-slate-600">{candidato.usuario.dni}</td>
                        <td class="px-4 py-2">{DISC_LABEL[inst.disciplina] || inst.disciplina}</td>
                        <td class="px-4 py-2 text-slate-600">{GRAD_LABEL[inst.graduacion] || inst.graduacion}</td>
                        <td class="px-4 py-2">{INSTANCIA_LABEL[inst.instancia] || inst.instancia}</td>
                        <td class="px-4 py-2">
                          {inst.aprobado === null ? (
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Sin cargar
                            </span>
                          ) : inst.aprobado ? (
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                              Aprobado
                            </span>
                          ) : (
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">
                              Desaprobado
                            </span>
                          )}
                        </td>
                        <td class="px-4 py-2 text-slate-600">
                          {inst.mesa_id
                            ? `#${inst.mesa_id}`
                            : inst.aprobado === null && compatibles.length > 1
                              ? (
                                <select
                                  value={mesaSeleccionada[key] || ''}
                                  onChange={(e: Event) => {
                                    setMesaSeleccionada({
                                      ...mesaSeleccionada,
                                      [key]: Number((e.target as HTMLSelectElement).value),
                                    });
                                  }}
                                  class="border border-slate-300 rounded px-2 py-1 text-xs"
                                >
                                  <option value="">Seleccionar mesa</option>
                                  {compatibles.map((m) => (
                                    <option key={m.id} value={m.id}>#{m.id}</option>
                                  ))}
                                </select>
                              )
                              : '—'}
                        </td>
                        <td class="px-4 py-2">
                          {inst.registro_pagado ? (
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                              {inst.graduacion_aplicada ? 'Pagado y graduado' : 'Pagado'}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRegistrarPago(candidato.inscripcion_id, inst.disciplina)}
                              class="text-blue-600 hover:underline whitespace-nowrap"
                            >
                              Registrar pago
                            </button>
                          )}
                        </td>
                        <td class="px-4 py-2 text-right space-x-2">
                          {inst.aprobado === null && (
                            <>
                              <button
                                onClick={() => handleCargarResultado(candidato.inscripcion_id, inst, true)}
                                class="text-green-600 hover:underline"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleCargarResultado(candidato.inscripcion_id, inst, false)}
                                class="text-red-600 hover:underline"
                              >
                                Desaprobar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Editar Mesa' : 'Nueva Mesa'}>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
              <select
                value={form.disciplina}
                disabled={!!form.id}
                onChange={(e: Event) => setForm({ ...form, disciplina: (e.target as HTMLSelectElement).value })}
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
              >
                {(evento?.examen?.disciplinas || ['KENDO', 'IAIDO', 'JODO']).map((d: string) => (
                  <option key={d} value={d}>{DISC_LABEL[d] || d}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Examinadores (separados por coma)</label>
              <input
                type="text"
                value={form.examinadores}
                onInput={(e: Event) => setForm({ ...form, examinadores: (e.target as HTMLInputElement).value })}
                placeholder="Juan Pérez, Ana López"
                class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Graduación mínima</label>
                <select
                  value={form.grad_min}
                  onChange={(e: Event) => setForm({ ...form, grad_min: (e.target as HTMLSelectElement).value })}
                  class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {GRADOS.map((g) => <option key={g} value={g}>{GRAD_LABEL[g]}</option>)}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Graduación máxima</label>
                <select
                  value={form.grad_max}
                  onChange={(e: Event) => setForm({ ...form, grad_max: (e.target as HTMLSelectElement).value })}
                  class="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {GRADOS.map((g) => <option key={g} value={g}>{GRAD_LABEL[g]}</option>)}
                </select>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button onClick={() => setFormOpen(false)}
                class="w-full bg-slate-100 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button onClick={handleSaveMesa} disabled={saving}
                class="w-full bg-slate-900 text-white py-2 rounded-md font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Eliminar mesa"
          message={`¿Está seguro de eliminar la mesa de ${DISC_LABEL[confirmDelete.disciplina] || confirmDelete.disciplina}?`}
          confirmText="Eliminar"
          danger
        />
      )}
    </div>
  );
}
