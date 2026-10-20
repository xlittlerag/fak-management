import { useState, useEffect, useCallback } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { GRAD_LABEL, DISC_LABEL, GRADUACION_RANK } from '../lib/graduacion';

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

const INSTANCIA_LABEL: Record<string, string> = {
  PRACTICO: 'Práctico',
  KATA: 'Kata',
  ESCRITO: 'Escrito',
};

const GRADOS = Object.keys(GRAD_LABEL).filter((g) => g !== 'SIN_GRADUACION');

const rankGrad = (g: string): number => GRADUACION_RANK[g] ?? -1;

interface MesaFormState {
  id: number | null;
  disciplina: string;
  examinadores: string;
  grad_min: string;
  grad_max: string;
}

export default function Mesas() {
  const { route, query } = useLocation();
  const eventoId = query.eventoId ?? null;

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

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!eventoId) return;
      try {
        const [eventoRes, mesasRes, resultadosRes] = await Promise.all([
          api.get(`/eventos/${eventoId}`, { signal }),
          api.get(`/admin/eventos/${eventoId}/mesas`, { signal }),
          api.get(`/admin/examenes/${eventoId}/resultados`, { signal }),
        ]);
        if (signal?.aborted) return;
        setEvento(eventoRes.data);
        setMesas(mesasRes.data);
        setResultados(resultadosRes.data);
      } catch {
        if (signal?.aborted) return;
        setError('Error al cargar los datos del examen');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [eventoId],
  );

  useEffect(() => {
    if (!eventoId) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData, eventoId]);

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
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const m = axiosErr.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(' - ') : m || 'Error al guardar la mesa',
      );
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

  const [mesaSeleccionada, setMesaSeleccionada] = useState<
    Record<string, number>
  >({});

  const mesaKey = (inscripcionId: number, disciplina: string) =>
    `${inscripcionId}-${disciplina}`;

  const handleAvance = async (
    inscripcionId: number,
    disciplina: string,
    graduacion: string,
    aprobada_hasta: string | null,
    desaprobada: string | null,
    instancias: InstanciaResultado[],
  ) => {
    setError('');
    setMsg('');
    const compatibles = mesasCompatibles(disciplina, graduacion);
    const firstNonApproved = instancias.findIndex((i) => i.aprobado !== true);

    const willCreateRows =
      (aprobada_hasta
        ? instancias.findIndex((i) => i.instancia === aprobada_hasta) >=
          firstNonApproved
        : false) || !!desaprobada;

    const key = mesaKey(inscripcionId, disciplina);
    const mesa_id = compatibles.length > 1 ? mesaSeleccionada[key] : undefined;
    if (willCreateRows && compatibles.length > 1 && !mesa_id) {
      setError('Seleccione la mesa antes de actualizar los resultados');
      return;
    }
    try {
      await api.post('/admin/resultados/avance', {
        inscripcion_id: inscripcionId,
        disciplina,
        aprobada_hasta: aprobada_hasta ?? null,
        desaprobada: desaprobada ?? null,
        ...(mesa_id ? { mesa_id } : {}),
      });
      setMsg('Resultados actualizados correctamente');
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const m = axiosErr.response?.data?.message;
      setError(
        Array.isArray(m)
          ? m.join(' - ')
          : m || 'Error al actualizar los resultados',
      );
    }
  };

  const handleRegistrarPago = async (
    inscripcionId: number,
    disciplina: string,
  ) => {
    setError('');
    setMsg('');
    try {
      await api.post(`/admin/inscripciones/${inscripcionId}/registro-pagado`, {
        disciplina,
      });
      setMsg('Registro de pago confirmado');
      fetchData();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const m = axiosErr.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(' - ') : m || 'Error al registrar el pago',
      );
    }
  };

  if (loading)
    return (
      <div class="p-8">
        <Spinner text="Cargando examen..." />
      </div>
    );

  if (!eventoId) {
    return (
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-8 text-center">
        <h4 class="font-semibold text-ink mb-2">Mesas examinadoras</h4>
        <p class="text-steel text-sm mb-4">
          Seleccione un examen desde Gestión de Eventos para administrar sus
          mesas.
        </p>
        <button
          onClick={() => route('/dashboard/eventos-admin')}
          class="px-4 py-2 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong transition-colors"
        >
          Ir a Gestión de Eventos
        </button>
      </div>
    );
  }

  return (
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="text-fluid-lg font-semibold text-ink">
            Mesas examinadoras
          </h3>
          {evento && (
            <p class="text-sm text-steel">
              {new Date(evento.fecha_inicio).toLocaleDateString('es-AR')}
            </p>
          )}
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            onClick={() => route('/dashboard/eventos-admin')}
            class="px-4 py-2 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors"
          >
            ← Volver a Eventos
          </button>
          <button
            onClick={openCreate}
            class="px-4 py-2 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong transition-colors"
          >
            Nueva Mesa
          </button>
        </div>
      </div>

      {error && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      {msg && (
        <div class="bg-ai-soft border border-ai/20 text-ai px-4 py-3 rounded text-sm">
          {msg}
        </div>
      )}

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-steel-soft">
          <h4 class="font-semibold text-ink">Mesas</h4>
        </div>
        {mesas.length === 0 ? (
          <p class="px-6 py-8 text-center text-steel text-sm">
            No hay mesas creadas para este examen.
          </p>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                <tr>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Examinadores</th>
                  <th class="px-4 py-2">Graduaciones</th>
                  <th class="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-steel-soft/60">
                {mesas.map((mesa) => (
                  <tr key={mesa.id} class="hover:bg-ai-soft/50">
                    <td class="px-4 py-2 font-medium">
                      {DISC_LABEL[mesa.disciplina] || mesa.disciplina}
                    </td>
                    <td class="px-4 py-2 text-steel">
                      {mesa.examinadores.join(', ')}
                    </td>
                    <td class="px-4 py-2 text-steel">
                      {GRAD_LABEL[mesa.grad_min]} - {GRAD_LABEL[mesa.grad_max]}
                    </td>
                    <td class="px-4 py-2 text-right space-x-2">
                      <button
                        onClick={() => openEdit(mesa)}
                        class="text-ai hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(mesa)}
                        class="text-hinomaru hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-steel-soft">
          <h4 class="font-semibold text-ink">Resultados por candidato</h4>
        </div>
        <div class="px-6 py-3 border-b border-steel-soft bg-ai-soft/60">
          <p class="text-xs text-steel">
            <span class="font-semibold">¿Cómo se cargan los resultados?</span>{' '}
            Las instancias se aprueban en orden: Práctico → Kata → Escrito. Haga
            clic en la instancia hasta la que el candidato aprobó (las
            anteriores se rellenan solas) o use «Desaprobado» en la primera que
            no aprobó. Todo es re-editable. La graduación se hace efectiva
            cuando la federación carga el diploma desde Diplomas.
          </p>
        </div>
        {resultados.length === 0 ? (
          <div class="px-6 py-8 text-center">
            <p class="text-steel text-sm mb-4">
              Los candidatos aparecen cuando su inscripción al examen está
              aprobada. Apruebe las inscripciones desde Gestión de Eventos.
            </p>
            <button
              onClick={() =>
                route(`/dashboard/inscripciones?eventoId=${eventoId}`)
              }
              class="px-4 py-2 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong transition-colors"
            >
              Ver inscripciones
            </button>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                <tr>
                  <th class="px-4 py-2">Candidato</th>
                  <th class="px-4 py-2">DNI</th>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación a rendir</th>
                  <th class="px-4 py-2">Instancias</th>
                  <th class="px-4 py-2">Mesa</th>
                  <th class="px-4 py-2">Registro pago</th>
                  <th class="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-steel-soft/60">
                {resultados.flatMap((candidato) => {
                  const grupos = new Map<string, InstanciaResultado[]>();
                  for (const inst of candidato.instancias) {
                    if (!grupos.has(inst.disciplina)) {
                      grupos.set(inst.disciplina, []);
                    }
                    grupos.get(inst.disciplina)!.push(inst);
                  }
                  return [...grupos.entries()].map(
                    ([disciplina, instancias]) => {
                      const graduacion = instancias[0].graduacion;
                      const registro = instancias[0];
                      const compatibles = mesasCompatibles(
                        disciplina,
                        graduacion,
                      );
                      const firstNonApproved = instancias.findIndex(
                        (i) => i.aprobado !== true,
                      );
                      const todasAprobadas = firstNonApproved === -1;
                      const fallo =
                        firstNonApproved >= 0 &&
                        instancias[firstNonApproved].aprobado === false;
                      const mesaActual =
                        firstNonApproved >= 0
                          ? instancias[firstNonApproved].mesa_id
                          : (instancias[instancias.length - 1]?.mesa_id ??
                            null);
                      const mesaSelKey = mesaKey(
                        candidato.inscripcion_id,
                        disciplina,
                      );
                      return (
                        <tr
                          key={`${candidato.inscripcion_id}-${disciplina}`}
                          class="hover:bg-ai-soft/50"
                        >
                          <td class="px-4 py-2 font-medium">
                            {candidato.usuario.nombre}
                          </td>
                          <td class="px-4 py-2 text-steel">
                            {candidato.usuario.dni}
                          </td>
                          <td class="px-4 py-2">
                            {DISC_LABEL[disciplina] || disciplina}
                          </td>
                          <td class="px-4 py-2 text-steel">
                            {GRAD_LABEL[graduacion] || graduacion}
                          </td>
                          <td class="px-4 py-2">
                            <div class="flex flex-wrap items-center gap-1">
                              {instancias.map((inst, i) => {
                                let cls =
                                  'border border-steel-soft text-steel bg-surface';
                                if (inst.aprobado === true) {
                                  cls = 'bg-success text-white border-success';
                                } else if (inst.aprobado === false) {
                                  cls =
                                    'bg-hinomaru text-white border-hinomaru';
                                }
                                return (
                                  <div
                                    class="flex items-center gap-1"
                                    key={inst.instancia}
                                  >
                                    <button
                                      onClick={() =>
                                        handleAvance(
                                          candidato.inscripcion_id,
                                          disciplina,
                                          graduacion,
                                          inst.instancia,
                                          null,
                                          instancias,
                                        )
                                      }
                                      title={`Hacer click para aprobar hasta ${INSTANCIA_LABEL[inst.instancia]}`}
                                      class={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${cls}`}
                                    >
                                      {INSTANCIA_LABEL[inst.instancia] ||
                                        inst.instancia}
                                    </button>
                                    {i < instancias.length - 1 && (
                                      <span class="text-steel-soft text-xs">
                                        →
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td class="px-4 py-2 text-steel">
                            {mesaActual ? (
                              `#${mesaActual}`
                            ) : compatibles.length > 1 ? (
                              <select
                                aria-label={`Seleccionar mesa para ${DISC_LABEL[disciplina] || disciplina}`}
                                value={mesaSeleccionada[mesaSelKey] || ''}
                                onChange={(e: Event) => {
                                  setMesaSeleccionada({
                                    ...mesaSeleccionada,
                                    [mesaSelKey]: Number(
                                      (e.target as HTMLSelectElement).value,
                                    ),
                                  });
                                }}
                                class="border border-steel-soft rounded px-2 py-1 text-xs"
                              >
                                <option value="">Seleccionar mesa</option>
                                {compatibles.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    #{m.id}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td class="px-4 py-2">
                            {registro.registro_pagado ? (
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success">
                                {registro.graduacion_aplicada
                                  ? 'Pagado y graduado'
                                  : 'Pagado'}
                              </span>
                            ) : todasAprobadas ? (
                              <button
                                onClick={() =>
                                  handleRegistrarPago(
                                    candidato.inscripcion_id,
                                    disciplina,
                                  )
                                }
                                class="text-ai hover:underline whitespace-nowrap"
                              >
                                Registrar pago
                              </button>
                            ) : (
                              <span class="text-steel text-xs whitespace-nowrap">
                                Requiere aprobar todas las instancias
                              </span>
                            )}
                          </td>
                          <td class="px-4 py-2 text-right">
                            {firstNonApproved >= 0 && (
                              <button
                                onClick={() =>
                                  handleAvance(
                                    candidato.inscripcion_id,
                                    disciplina,
                                    graduacion,
                                    firstNonApproved > 0
                                      ? instancias[firstNonApproved - 1]
                                          .instancia
                                      : null,
                                    fallo
                                      ? null
                                      : instancias[firstNonApproved].instancia,
                                    instancias,
                                  )
                                }
                                class={`hover:underline ${
                                  fallo ? 'text-steel' : 'text-hinomaru'
                                }`}
                              >
                                {fallo ? 'Quitar desaprobado' : 'Desaprobado'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <Modal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          title={form.id ? 'Editar Mesa' : 'Nueva Mesa'}
        >
          <div class="space-y-4">
            <div>
              <label
                htmlFor="mesa-disciplina"
                class="block text-sm font-medium text-ink mb-1"
              >
                Disciplina
              </label>
              <select
                id="mesa-disciplina"
                value={form.disciplina}
                disabled={!!form.id}
                onChange={(e: Event) =>
                  setForm({
                    ...form,
                    disciplina: (e.target as HTMLSelectElement).value,
                  })
                }
                class="w-full border border-steel-soft rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ai/20 disabled:bg-paper"
              >
                {(
                  evento?.examen?.disciplinas || ['KENDO', 'IAIDO', 'JODO']
                ).map((d: string) => (
                  <option key={d} value={d}>
                    {DISC_LABEL[d] || d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mesa-examinadores"
                class="block text-sm font-medium text-ink mb-1"
              >
                Examinadores (separados por coma)
              </label>
              <input
                id="mesa-examinadores"
                type="text"
                value={form.examinadores}
                onInput={(e: Event) =>
                  setForm({
                    ...form,
                    examinadores: (e.target as HTMLInputElement).value,
                  })
                }
                placeholder="Juan Pérez, Ana López"
                class="w-full border border-steel-soft rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
              />
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="mesa-grad-min"
                  class="block text-sm font-medium text-ink mb-1"
                >
                  Graduación mínima
                </label>
                <select
                  id="mesa-grad-min"
                  value={form.grad_min}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      grad_min: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full border border-steel-soft rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
                >
                  {GRADOS.map((g) => (
                    <option key={g} value={g}>
                      {GRAD_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="mesa-grad-max"
                  class="block text-sm font-medium text-ink mb-1"
                >
                  Graduación máxima
                </label>
                <select
                  id="mesa-grad-max"
                  value={form.grad_max}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      grad_max: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full border border-steel-soft rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
                >
                  {GRADOS.map((g) => (
                    <option key={g} value={g}>
                      {GRAD_LABEL[g]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button
                onClick={() => setFormOpen(false)}
                class="w-full bg-paper text-ink py-2 rounded-md font-medium hover:bg-ai-soft transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMesa}
                disabled={saving}
                class="w-full bg-ai text-white py-2 rounded-md font-medium hover:bg-ai-strong transition-colors disabled:opacity-50"
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
