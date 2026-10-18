import { useState, useEffect } from 'preact/hooks';
import api, { apiGet } from '../services/api';
import { loadMercadoPago } from '../lib/mercadopago';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';
import {
  GRAD_LABELS,
  DISCIPLINA_LABELS,
  GRAD_RANK,
  computeNextGrad,
} from '../lib/graduacion';
import { useAuth } from '../context/AuthContext';
import type { CategoriaDef } from '../types';
import { FileUpload } from '../components/FileUpload';

interface Evento {
  id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: { direccion?: string; provincia?: string };
  torneo?: {
    costo_inscripcion: number;
    categorias: Array<{ nombre: string }>;
    disciplina: string;
    inscripcion_multiple: boolean;
    info_adicional?: string;
  };
  examen?: {
    disciplinas: string[];
    graduaciones_a_rendir: Array<{
      disciplina: string;
      grad_min: string;
      grad_max: string;
    }>;
    info_adicional?: string;
  };
  seminario?: {
    costo_inscripcion: number;
    disciplina: string;
    info_adicional?: string;
  };
}

interface Inscripcion {
  id: number;
  evento_id: number;
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
}

export default function EventosDashboard() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [preciosExamen, setPreciosExamen] = useState<
    Record<string, { inscripcion: number; registro: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inscribiendo, setInscribiendo] = useState<Record<number, boolean>>({});
  const [payingId, setPayingId] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Record<number, string[]>>({});
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<
    Record<number, string[]>
  >({});
  const [necesidadesEsp, setNecesidadesEsp] = useState<Record<number, boolean>>(
    {},
  );
  const [descNecesidades, setDescNecesidades] = useState<
    Record<number, string>
  >({});
  const [medicoFile, setMedicoFile] = useState<Record<number, File | null>>({});
  const [simulatedPayment, setSimulatedPayment] = useState<{
    externalReference: string;
    inscripcionId: number;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Evento[]>('/eventos'),
      apiGet<Inscripcion[]>('/mis-inscripciones'),
      apiGet<
        Array<{
          graduacion: string;
          costo_inscripcion: number;
          costo_registro: number;
        }>
      >('/precios-examen'),
    ])
      .then(([eventos, inscripciones, precios]) => {
        setEventos(eventos);
        setInscripciones(inscripciones);
        const pxMap: Record<string, { inscripcion: number; registro: number }> =
          {};
        precios.forEach((p) => {
          pxMap[p.graduacion] = {
            inscripcion: p.costo_inscripcion,
            registro: p.costo_registro,
          };
        });
        setPreciosExamen(pxMap);
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const getInscripcion = (eventoId: number) =>
    inscripciones.find((i) => i.evento_id === eventoId) || null;

  const handleInscribir = async (eventoId: number) => {
    setInscribiendo((prev) => ({ ...prev, [eventoId]: true }));
    setError('');
    try {
      const evento = eventos.find((e) => e.id === eventoId);
      const body: Record<string, any> = {};
      if (evento?.tipo === 'EXAMEN') {
        const disc = selectedDisciplinas[eventoId];
        if (disc?.length) body.disciplinas = disc;
        if (necesidadesEsp[eventoId]) {
          body.necesidades_especiales = true;
          if (descNecesidades[eventoId])
            body.descripcion_necesidades = descNecesidades[eventoId];
        }
      } else {
        const cats = categorias[eventoId] || [];
        if (cats.length > 0) body.categorias = cats;
      }
      const res = await api.post(`/eventos/${eventoId}/inscribir`, body);
      const file = medicoFile[eventoId];
      if (file) {
        const fd = new FormData();
        fd.append('archivo_medico', file);
        await api.patch(`/inscripciones/${res.data.id}/archivo-medico`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setInscripciones((prev) => [...prev, res.data]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInscribiendo((prev) => ({ ...prev, [eventoId]: false }));
    }
  };

  const handlePagar = async (ins: Inscripcion) => {
    setPayingId(ins.id);
    setError('');
    try {
      const res = await api.post(`/inscripciones/${ins.id}/pagar`);
      if (res.data.gratuito) {
        setInscripciones((prev) =>
          prev.map((i) => (i.id === ins.id ? { ...i, pagado: true } : i)),
        );
        return;
      }
      const { preferenceId, simulated, externalReference } = res.data;
      if (simulated) {
        setSimulatedPayment({ externalReference, inscripcionId: ins.id });
        setPayingId(null);
        return;
      }
      await loadMercadoPago();
      const mp = new window.MercadoPago(
        import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY,
      );
      mp.checkout({
        preference: { id: preferenceId },
        render: { container: `#mp-checkout-ev-${ins.id}`, label: 'Pagar' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  };

  const handleSimulatePayment = async () => {
    if (!simulatedPayment) return;
    setError('');
    try {
      await api.post('/pagos/simulate', {
        externalReference: simulatedPayment.externalReference,
      });
      setInscripciones((prev) =>
        prev.map((i) =>
          i.id === simulatedPayment.inscripcionId ? { ...i, pagado: true } : i,
        ),
      );
      setSimulatedPayment(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  function estadoBadge(ins: Inscripcion) {
    if (ins.pagado)
      return { label: 'Pagado', cls: 'bg-success-soft text-success' };
    const map: Record<string, { label: string; cls: string }> = {
      PENDIENTE: { label: 'Pendiente', cls: 'bg-warning-soft text-warning' },
      APROBADO: { label: 'Aprobado', cls: 'bg-success-soft text-success' },
      RECHAZADO: { label: 'Rechazado', cls: 'bg-hinomaru-soft text-hinomaru' },
    };
    return (
      map[ins.estado_aprob] || {
        label: ins.estado_aprob,
        cls: 'bg-paper text-ink',
      }
    );
  }

  if (loading) return <Spinner text="Cargando eventos..." />;

  const upcoming = eventos.filter((e) => new Date(e.fecha_inicio) > new Date());

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-ink">Próximos Eventos</h2>

      {error && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {upcoming.length === 0 ? (
        <div class="bg-surface p-8 rounded-lg shadow-sm border border-steel-soft text-center text-steel">
          No hay eventos próximos.
        </div>
      ) : (
        <div class="grid gap-4">
          {upcoming.map((evento) => {
            const ins = getInscripcion(evento.id);
            const cats: Array<{ nombre: string }> =
              evento.torneo?.categorias || [];
            const costo =
              evento.torneo?.costo_inscripcion ??
              evento.seminario?.costo_inscripcion ??
              0;
            const infoExtra =
              evento.torneo?.info_adicional ??
              evento.examen?.info_adicional ??
              evento.seminario?.info_adicional ??
              '';
            const disciplinas: string[] = evento.examen?.disciplinas || [];
            const rangosExamen: Array<{
              disciplina: string;
              grad_min: string;
              grad_max: string;
            }> = evento.examen?.graduaciones_a_rendir || [];

            return (
              <div
                key={evento.id}
                class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6 space-y-4"
              >
                <div class="flex justify-between items-start">
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-ink">
                      {evento.tipo}
                    </h3>
                    <p class="text-sm text-steel mt-1">
                      {formatDate(evento.fecha_inicio)}
                    </p>
                    {evento.datos_lugar && (
                      <p class="text-sm text-steel">
                        {evento.datos_lugar.direccion ?? ''}
                        {evento.datos_lugar.provincia
                          ? ` - ${evento.datos_lugar.provincia}`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    {ins && (
                      <span
                        class={`px-3 py-1 rounded-full text-xs font-medium ${estadoBadge(ins).cls}`}
                      >
                        {estadoBadge(ins).label}
                      </span>
                    )}
                    <span class="px-3 py-1 bg-ai-soft text-ai rounded-full text-xs font-medium">
                      {evento.tipo}
                    </span>
                  </div>
                </div>

                {evento.tipo === 'EXAMEN' && disciplinas.length > 0 && (
                  <div class="flex flex-wrap gap-1">
                    <span class="text-xs text-steel mr-1">Disciplinas:</span>
                    {disciplinas.map((d) => (
                      <span class="px-2 py-0.5 bg-ai-soft text-ai rounded text-xs">
                        {DISCIPLINA_LABELS[d] || d}
                      </span>
                    ))}
                  </div>
                )}

                {evento.tipo !== 'EXAMEN' && costo > 0 && (
                  <p class="text-sm font-medium text-ink">
                    Costo: ${costo.toLocaleString('es-AR')}
                  </p>
                )}

                {infoExtra && (
                  <p class="text-sm text-steel italic">{infoExtra}</p>
                )}

                {evento.tipo === 'TORNEO' && cats.length > 0 && (
                  <div class="flex flex-wrap gap-1">
                    {cats.map((c: CategoriaDef) => (
                      <span class="px-2 py-0.5 bg-paper text-steel rounded text-xs">
                        {c.nombre}
                      </span>
                    ))}
                  </div>
                )}

                {!ins ? (
                  <div class="space-y-3 pt-2 border-t border-steel-soft">
                    {evento.tipo === 'TORNEO' && cats.length > 0 && (
                      <div>
                        <label class="block text-sm text-steel mb-1">
                          Categorías
                          {!evento.torneo?.inscripcion_multiple && (
                            <span class="text-xs text-steel ml-1">
                              (seleccione una)
                            </span>
                          )}
                        </label>
                        <div class="space-y-1">
                          {cats.map((c: CategoriaDef) => {
                            const selected = (
                              categorias[evento.id] || []
                            ).includes(c.nombre);
                            return (
                              <label class="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const prev = categorias[evento.id] || [];
                                    if (selected) {
                                      const next = prev.filter(
                                        (n: string) => n !== c.nombre,
                                      );
                                      setCategorias((prev2) => ({
                                        ...prev2,
                                        [evento.id]: next,
                                      }));
                                    } else {
                                      if (
                                        !evento.torneo?.inscripcion_multiple
                                      ) {
                                        setCategorias((prev2) => ({
                                          ...prev2,
                                          [evento.id]: [c.nombre],
                                        }));
                                      } else {
                                        setCategorias((prev2) => ({
                                          ...prev2,
                                          [evento.id]: [...prev, c.nombre],
                                        }));
                                      }
                                    }
                                  }}
                                />
                                {c.nombre}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {evento.tipo === 'EXAMEN' && (
                      <fieldset>
                        <legend class="block text-sm text-steel mb-2">
                          Disciplinas a rendir
                          <span class="text-xs text-steel ml-1">
                            (seleccione una o más)
                          </span>
                        </legend>
                        <div class="space-y-2">
                          {disciplinas.map((d: string) => {
                            const selected = (
                              selectedDisciplinas[evento.id] || []
                            ).includes(d);
                            const gradKey = `grad_${d.toLowerCase()}` as
                              'grad_kendo' | 'grad_iaido' | 'grad_jodo';
                            const userGrad =
                              user?.[gradKey] || 'SIN_GRADUACION';
                            const nextGrad = computeNextGrad(userGrad);
                            const rango = rangosExamen.find(
                              (r) => r.disciplina === d,
                            );
                            const costoGrad = nextGrad
                              ? preciosExamen[nextGrad]
                              : undefined;
                            const enRango =
                              nextGrad && rango
                                ? GRAD_RANK[nextGrad] >=
                                    GRAD_RANK[rango.grad_min] &&
                                  GRAD_RANK[nextGrad] <=
                                    GRAD_RANK[rango.grad_max]
                                : false;

                            return (
                              <div
                                class={`border rounded-lg p-3 ${selected ? 'border-ai/40 bg-ai-soft' : 'border-steel-soft bg-surface'}`}
                              >
                                <label class="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={!enRango}
                                    onChange={() => {
                                      const prev =
                                        selectedDisciplinas[evento.id] || [];
                                      if (selected) {
                                        setSelectedDisciplinas((prev2) => ({
                                          ...prev2,
                                          [evento.id]: prev.filter(
                                            (x: string) => x !== d,
                                          ),
                                        }));
                                      } else {
                                        setSelectedDisciplinas((prev2) => ({
                                          ...prev2,
                                          [evento.id]: [...prev, d],
                                        }));
                                      }
                                    }}
                                    class="w-4 h-4 mt-0.5 disabled:opacity-40"
                                  />
                                  <div class="flex-1">
                                    <p class="text-sm font-medium text-ink">
                                      {DISCIPLINA_LABELS[d] || d}
                                    </p>
                                    {nextGrad && enRango && (
                                      <div class="mt-1">
                                        <p class="text-xs text-steel">
                                          Se va a inscribir para rendir:{' '}
                                          <span class="font-semibold text-ink">
                                            {GRAD_LABELS[nextGrad] || nextGrad}
                                          </span>
                                          {costoGrad !== undefined && (
                                            <span class="text-steel">
                                              {' '}
                                              ($
                                              {costoGrad.inscripcion.toLocaleString(
                                                'es-AR',
                                              )}
                                              )
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    )}
                                    {nextGrad && !enRango && (
                                      <p class="text-xs text-warning mt-1">
                                        No disponible
                                      </p>
                                    )}
                                    {!nextGrad && (
                                      <p class="text-xs text-warning mt-1">
                                        Máxima graduación alcanzada
                                      </p>
                                    )}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        {(selectedDisciplinas[evento.id] || []).length > 0 && (
                          <p class="text-sm font-medium text-ink mt-2">
                            Total: $
                            {(selectedDisciplinas[evento.id] || [])
                              .reduce((sum, d) => {
                                const gradKey = `grad_${d.toLowerCase()}` as
                                  'grad_kendo' | 'grad_iaido' | 'grad_jodo';
                                const userGrad =
                                  user?.[gradKey] || 'SIN_GRADUACION';
                                const nextGrad = computeNextGrad(userGrad);
                                return (
                                  sum +
                                  ((nextGrad &&
                                    preciosExamen[nextGrad]?.inscripcion) ||
                                    0)
                                );
                              }, 0)
                              .toLocaleString('es-AR')}
                          </p>
                        )}
                        <div class="border-t border-steel-soft pt-4 space-y-3">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={necesidadesEsp[evento.id] || false}
                              onChange={(e: Event) => {
                                const checked = (e.target as HTMLInputElement)
                                  .checked;
                                setNecesidadesEsp((prev) => ({
                                  ...prev,
                                  [evento.id]: checked,
                                }));
                                if (!checked) {
                                  setDescNecesidades((prev) => {
                                    const n = { ...prev };
                                    delete n[evento.id];
                                    return n;
                                  });
                                  setMedicoFile((prev) => {
                                    const n = { ...prev };
                                    delete n[evento.id];
                                    return n;
                                  });
                                }
                              }}
                              class="w-4 h-4"
                            />
                            <span class="text-sm text-ink">
                              Declaro tener una dificultad que requiere
                              consideración especial
                            </span>
                          </label>
                          {necesidadesEsp[evento.id] && (
                            <>
                              <textarea
                                value={descNecesidades[evento.id] || ''}
                                onInput={(e: Event) =>
                                  setDescNecesidades((prev) => ({
                                    ...prev,
                                    [evento.id]: (
                                      e.target as HTMLTextAreaElement
                                    ).value,
                                  }))
                                }
                                class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                                rows={2}
                                placeholder="Describa la dificultad (uso de accesorio no reglamentado, incapacidad para realizar un movimiento, etc.)"
                              />
                              <FileUpload
                                label="Certificado médico"
                                currentFile={medicoFile[evento.id] || null}
                                onFileChange={(f) =>
                                  setMedicoFile((prev) => ({
                                    ...prev,
                                    [evento.id]: f,
                                  }))
                                }
                              />
                            </>
                          )}
                        </div>
                      </fieldset>
                    )}

                    <button
                      onClick={() => handleInscribir(evento.id)}
                      disabled={inscribiendo[evento.id]}
                      class="w-full bg-ai text-white py-2 rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {inscribiendo[evento.id]
                        ? 'Inscribiendo...'
                        : 'Inscribirme'}
                    </button>
                  </div>
                ) : ins.estado_aprob === 'APROBADO' && !ins.pagado ? (
                  <div
                    class="pt-2 border-t border-steel-soft"
                    id={`mp-checkout-ev-${ins.id}`}
                  >
                    {simulatedPayment?.inscripcionId === ins.id ? (
                      <button
                        onClick={handleSimulatePayment}
                        class="w-full bg-success text-white py-2 rounded font-medium hover:bg-success/90 transition-colors text-sm"
                      >
                        Pagar en modo prueba (simulado)
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePagar(ins)}
                        disabled={payingId === ins.id}
                        class="w-full bg-ai text-white py-2 rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {payingId === ins.id
                          ? 'Procesando...'
                          : 'Pagar inscripción'}
                      </button>
                    )}
                  </div>
                ) : ins.estado_aprob === 'RECHAZADO' ? (
                  <p class="pt-2 border-t border-steel-soft text-sm text-hinomaru">
                    Su inscripción fue rechazada.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
