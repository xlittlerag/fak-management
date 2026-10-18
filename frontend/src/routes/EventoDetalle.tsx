import { useState, useEffect } from 'preact/hooks';
import { Spinner } from '../components/Spinner';
import { useLocation } from 'preact-iso';
import api, { apiGet } from '../services/api';
import { loadMercadoPago } from '../lib/mercadopago';
import { useAuth } from '../context/AuthContext';
import { FileUpload } from '../components/FileUpload';
import { getErrorMessage } from '../lib/error';
import {
  GRAD_LABELS,
  DISCIPLINA_LABELS,
  GRAD_RANK,
  computeNextGrad,
} from '../lib/graduacion';
import type { InscripcionResumen, CategoriaDef, DatosLugar } from '../types';
import { Wordmark } from '../components/ui/Wordmark';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { controlClass } from '../components/ui/Field';

interface Evento {
  id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: DatosLugar;
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
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
}

export default function EventoDetalle() {
  const { path } = useLocation();
  const { user } = useAuth();
  const eventoId = parseInt(path.split('/').pop() || '0');
  const [evento, setEvento] = useState<Evento | null>(null);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [preciosExamen, setPreciosExamen] = useState<
    Record<string, { inscripcion: number; registro: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [selDisciplinas, setSelDisciplinas] = useState<string[]>([]);
  const [necesidadesEsp, setNecesidadesEsp] = useState(false);
  const [descNecesidades, setDescNecesidades] = useState('');
  const [medicoFile, setMedicoFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [simulatedPayment, setSimulatedPayment] = useState<{
    externalReference: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/eventos/${eventoId}`).then((r) => r.data),
      user
        ? apiGet<InscripcionResumen[]>('/mis-inscripciones')
        : Promise.resolve([] as InscripcionResumen[]),
      apiGet<
        Array<{
          graduacion: string;
          costo_inscripcion: number;
          costo_registro: number;
        }>
      >('/precios-examen'),
    ])
      .then(([eventoData, inscripciones, precios]) => {
        setEvento(eventoData);
        const found = inscripciones.find((i) => i.evento_id === eventoId);
        if (found) setInscripcion(found);
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
      .catch(() => setError('Error al cargar el evento'))
      .finally(() => setLoading(false));
  }, [eventoId, user]);

  const handleInscribir = async () => {
    setInscribiendo(true);
    setError('');
    try {
      const body: {
        categorias?: string[];
        disciplinas?: string[];
        necesidades_especiales?: boolean;
        descripcion_necesidades?: string;
      } = {};
      if (evento?.tipo === 'EXAMEN') {
        if (selDisciplinas.length > 0) body.disciplinas = selDisciplinas;
      } else {
        if (categoria.length > 0) body.categorias = categoria;
      }
      body.necesidades_especiales = necesidadesEsp;
      if (necesidadesEsp && descNecesidades)
        body.descripcion_necesidades = descNecesidades;
      const res = await api.post(`/eventos/${eventoId}/inscribir`, body);
      setInscripcion(res.data);

      if (medicoFile) {
        const fd = new FormData();
        fd.append('archivo_medico', medicoFile);
        await api.patch(`/inscripciones/${res.data.id}/archivo-medico`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setSuccess('Se ha inscripto correctamente al evento');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInscribiendo(false);
    }
  };

  const handlePagar = async () => {
    if (!inscripcion) return;
    setError('');
    try {
      const res = await api.post(`/inscripciones/${inscripcion.id}/pagar`);
      if (res.data.gratuito) {
        setInscripcion({ ...inscripcion, pagado: true });
        setSuccess('Inscripción confirmada');
        return;
      }
      const { preferenceId, simulated, externalReference } = res.data;
      if (simulated) {
        setSimulatedPayment({ externalReference });
        return;
      }
      await loadMercadoPago();
      const mp = new window.MercadoPago(
        import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY,
      );
      mp.checkout({
        preference: { id: preferenceId },
        render: { container: '#mp-checkout-inscripcion', label: 'Pagar' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleSimulatePayment = async () => {
    if (!simulatedPayment) return;
    try {
      await api.post('/pagos/simulate', {
        externalReference: simulatedPayment.externalReference,
      });
      setInscripcion({ ...inscripcion!, pagado: true });
      setSuccess('Pago simulado completado');
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

  function estadoLabel(estado: string) {
    const labels: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADO: 'Aprobado',
      RECHAZADO: 'Rechazado',
    };
    return labels[estado] || estado;
  }

  if (loading) return <Spinner text="Cargando evento..." />;
  if (!evento) return <div class="p-8 text-hinomaru">Evento no encontrado</div>;

  const categorias: Array<{ nombre: string }> = evento.torneo?.categorias || [];
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
  const puedeInscribirse =
    user && !inscripcion && new Date(evento.fecha_inicio) > new Date();

  return (
    <div class="min-h-screen bg-paper">
      <header class="border-b border-steel-soft bg-surface">
        <div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-8">
          <a href="/eventos">
            <Wordmark />
          </a>
          <a
            href="/login"
            class="text-sm font-medium text-ai underline hover:text-ai-strong"
          >
            Iniciar sesión
          </a>
        </div>
      </header>

      <div class="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
        <a
          href="/eventos"
          class="text-sm font-medium text-ai hover:text-ai-strong"
        >
          &larr; Volver a eventos
        </a>

        <Panel bodyClass="space-y-4 p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h1 class="font-display text-2xl text-ink">{evento.tipo}</h1>
              <p class="mt-1 text-sm text-steel">ID: {evento.id}</p>
            </div>
            <Badge tone="info" class="shrink-0">
              {evento.tipo}
            </Badge>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-steel">Inicio</p>
              <p class="font-medium text-ink">
                {formatDate(evento.fecha_inicio)}
              </p>
            </div>
            <div>
              <p class="text-steel">Fin</p>
              <p class="font-medium text-ink">{formatDate(evento.fecha_fin)}</p>
            </div>
            {evento.datos_lugar && (
              <div class="col-span-2">
                <p class="text-steel">Lugar</p>
                <p class="font-medium text-ink">
                  {evento.datos_lugar.direccion || ''}
                  {evento.datos_lugar.provincia
                    ? ` - ${evento.datos_lugar.provincia}`
                    : ''}
                </p>
              </div>
            )}
            {evento.tipo !== 'EXAMEN' && costo > 0 && (
              <div class="col-span-2">
                <p class="text-steel">Costo de inscripción</p>
                <p class="tnum font-medium text-ink">
                  ${costo.toLocaleString('es-AR')}
                </p>
              </div>
            )}
          </div>

          {infoExtra && (
            <div>
              <p class="text-sm text-steel">Información adicional</p>
              <p class="text-sm font-medium text-ink">{infoExtra}</p>
            </div>
          )}

          {evento.tipo === 'EXAMEN' && disciplinas.length > 0 && (
            <div>
              <p class="mb-2 text-sm font-medium text-steel">Disciplinas</p>
              <div class="flex flex-wrap gap-2">
                {disciplinas.map((d) => (
                  <Badge key={d} tone="info">
                    {DISCIPLINA_LABELS[d] || d}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {categorias.length > 0 && (
            <div>
              <p class="mb-2 text-sm font-medium text-steel">Categorías</p>
              <div class="flex flex-wrap gap-2">
                {categorias.map((c: CategoriaDef) => (
                  <Badge key={c.nombre} tone="neutral">
                    {c.nombre}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {evento.tipo === 'EXAMEN' && rangosExamen.length > 0 && (
            <div>
              <p class="mb-2 text-sm font-medium text-steel">
                Graduaciones disponibles
              </p>
              <div class="flex flex-wrap gap-2">
                {rangosExamen.map((r) => (
                  <Badge key={`${r.disciplina}-${r.grad_min}`} tone="warning">
                    {DISCIPLINA_LABELS[r.disciplina] || r.disciplina}:{' '}
                    {GRAD_LABELS[r.grad_min] || r.grad_min} -{' '}
                    {GRAD_LABELS[r.grad_max] || r.grad_max}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {error && <Alert tone="error">{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}

        {inscripcion ? (
          <Panel title="Su inscripción" bodyClass="space-y-3 p-6">
            <div class="space-y-2 text-sm">
              {evento.tipo === 'EXAMEN' &&
                inscripcion.disciplinas &&
                inscripcion.disciplinas.length > 0 && (
                  <div class="flex justify-between">
                    <span class="text-steel">Disciplinas</span>
                    <span class="font-medium text-ink">
                      {(inscripcion.disciplinas || [])
                        .map((d: string) => DISCIPLINA_LABELS[d] || d)
                        .join(', ')}
                    </span>
                  </div>
                )}
              <div class="flex justify-between">
                <span class="text-steel">
                  {evento.tipo === 'EXAMEN' ? 'Graduaciones' : 'Categoría'}
                </span>
                <span class="font-medium text-ink">
                  {(inscripcion.categorias || []).join(', ') || 'General'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-steel">Estado</span>
                <span
                  class={`font-medium ${inscripcion.estado_aprob === 'APROBADO' ? 'text-success' : inscripcion.estado_aprob === 'RECHAZADO' ? 'text-hinomaru' : 'text-warning'}`}
                >
                  {estadoLabel(inscripcion.estado_aprob)}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-steel">Pago</span>
                <span
                  class={`font-medium ${inscripcion.pagado ? 'text-success' : 'text-warning'}`}
                >
                  {inscripcion.pagado ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            </div>

            {inscripcion.estado_aprob === 'APROBADO' &&
              !inscripcion.pagado &&
              (evento.tipo !== 'EXAMEN' ? costo > 0 : true) && (
                <div id="mp-checkout-inscripcion">
                  {simulatedPayment ? (
                    <Button onClick={handleSimulatePayment} class="w-full">
                      Pagar en modo prueba (simulado)
                    </Button>
                  ) : (
                    <Button onClick={handlePagar} class="w-full">
                      Pagar inscripción
                    </Button>
                  )}
                </div>
              )}
          </Panel>
        ) : puedeInscribirse ? (
          <Panel title="Inscribirse" bodyClass="space-y-4 p-6">
            {evento.tipo === 'TORNEO' && categorias.length > 0 && (
              <div>
                <label class="mb-1 block text-sm text-steel">
                  Categorías
                  {!evento.torneo?.inscripcion_multiple && (
                    <span class="ml-1 text-xs text-steel/70">
                      (seleccione una)
                    </span>
                  )}
                </label>
                <div class="space-y-1">
                  {categorias.map((c: CategoriaDef) => {
                    const selected = categoria.includes(c.nombre);
                    return (
                      <label class="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            if (selected) {
                              setCategoria(
                                categoria.filter((n: string) => n !== c.nombre),
                              );
                            } else {
                              if (!evento.torneo?.inscripcion_multiple) {
                                setCategoria([c.nombre]);
                              } else {
                                setCategoria([...categoria, c.nombre]);
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
                <legend class="mb-2 block text-sm text-steel">
                  Disciplinas a rendir
                  <span class="ml-1 text-xs text-steel/70">
                    (seleccione una o más)
                  </span>
                </legend>
                <div class="space-y-2">
                  {disciplinas.map((d: string) => {
                    const selected = selDisciplinas.includes(d);
                    const gradKey =
                      `grad_${d.toLowerCase()}` as keyof typeof user;
                    const userGrad =
                      (user?.[gradKey] as string) || 'SIN_GRADUACION';
                    const nextGrad = computeNextGrad(userGrad);
                    const rango = rangosExamen.find((r) => r.disciplina === d);

                    const costoGrad = nextGrad
                      ? preciosExamen[nextGrad]
                      : undefined;
                    const enRango =
                      nextGrad && rango
                        ? GRAD_RANK[nextGrad] >= GRAD_RANK[rango.grad_min] &&
                          GRAD_RANK[nextGrad] <= GRAD_RANK[rango.grad_max]
                        : false;

                    return (
                      <div
                        class={`rounded-lg border p-3 ${selected ? 'border-ai/40 bg-ai-soft' : 'border-steel-soft bg-surface'}`}
                      >
                        <label class="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={!enRango}
                            onChange={() => {
                              if (selected) {
                                setSelDisciplinas(
                                  selDisciplinas.filter((x: string) => x !== d),
                                );
                              } else {
                                setSelDisciplinas([...selDisciplinas, d]);
                              }
                            }}
                            class="mt-0.5 h-4 w-4 disabled:opacity-40"
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
                                  {costoGrad && (
                                    <span class="text-steel/70">
                                      {' '}
                                      ($
                                      {costoGrad.inscripcion.toLocaleString(
                                        'es-AR',
                                      )}
                                      )
                                    </span>
                                  )}
                                </p>
                                {(costoGrad?.registro ?? 0) > 0 && (
                                  <p class="mt-0.5 text-[10px] text-steel/70">
                                    En caso de aprobar, deberá abonar $
                                    {(costoGrad?.registro ?? 0).toLocaleString(
                                      'es-AR',
                                    )}{' '}
                                    en concepto de registro
                                  </p>
                                )}
                              </div>
                            )}
                            {nextGrad && !enRango && (
                              <p class="mt-1 text-xs text-warning">
                                No disponible — su graduación siguiente no está
                                dentro del rango de este examen
                              </p>
                            )}
                            {!nextGrad && (
                              <p class="mt-1 text-xs text-warning">
                                Ya ha alcanzado la máxima graduación en esta
                                disciplina
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {selDisciplinas.length > 0 && (
                  <div class="mt-3 space-y-1">
                    <p class="tnum text-sm font-medium text-ink">
                      Total inscripción: $
                      {selDisciplinas
                        .reduce((sum, d) => {
                          const gradKey =
                            `grad_${d.toLowerCase()}` as keyof typeof user;
                          const userGrad =
                            (user?.[gradKey] as string) || 'SIN_GRADUACION';
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
                    {selDisciplinas.some((d) => {
                      const gradKey =
                        `grad_${d.toLowerCase()}` as keyof typeof user;
                      return (
                        preciosExamen[
                          computeNextGrad(
                            (user?.[gradKey] as string) || 'SIN_GRADUACION',
                          ) || ''
                        ]?.registro > 0
                      );
                    }) && (
                      <p class="text-xs text-steel">
                        En caso de aprobar, deberá abonar el registro al momento
                        del examen.
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            )}

            {evento.tipo === 'EXAMEN' && (
              <div class="space-y-3 border-t border-steel-soft pt-4">
                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={necesidadesEsp}
                    onChange={(e: Event) =>
                      setNecesidadesEsp((e.target as HTMLInputElement).checked)
                    }
                    class="h-4 w-4"
                  />
                  <span class="text-sm text-ink">
                    Declaro tener una dificultad que requiere consideración
                    especial
                  </span>
                </label>
                {necesidadesEsp && (
                  <>
                    <textarea
                      value={descNecesidades}
                      onInput={(e: Event) =>
                        setDescNecesidades(
                          (e.target as HTMLTextAreaElement).value,
                        )
                      }
                      class={controlClass}
                      rows={2}
                      placeholder="Describa la dificultad (uso de accesorio no reglamentado, incapacidad para realizar un movimiento, etc.)"
                    />
                    <FileUpload
                      label="Certificado médico"
                      currentFile={medicoFile}
                      onFileChange={setMedicoFile}
                    />
                  </>
                )}
              </div>
            )}

            <Button
              onClick={handleInscribir}
              disabled={inscribiendo}
              class="w-full"
            >
              {inscribiendo ? 'Inscribiendo...' : 'Inscribirme'}
            </Button>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
