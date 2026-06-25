import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/error';
import type { InscripcionResumen, CategoriaDef, DatosLugar } from '../types';

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
    graduaciones_a_rendir: Array<{ disciplina: string; grad_min: string; grad_max: string }>;
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

const GRAD_LABELS: Record<string, string> = {
  SIN_GRADUACION: 'Sin graduación', KYU_3: '3° Kyu', KYU_2: '2° Kyu', KYU_1: '1° Kyu',
  DAN_1: '1° Dan', DAN_2: '2° Dan', DAN_3: '3° Dan', DAN_4: '4° Dan',
  DAN_5: '5° Dan', DAN_6: '6° Dan', DAN_7: '7° Dan', DAN_8: '8° Dan',
};

const DISCIPLINA_LABELS: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

const GRAD_RANK: Record<string, number> = {
  SIN_GRADUACION: 0, KYU_3: 1, KYU_2: 2, KYU_1: 3,
  DAN_1: 4, DAN_2: 5, DAN_3: 6, DAN_4: 7,
  DAN_5: 8, DAN_6: 9, DAN_7: 10, DAN_8: 11,
};

function computeNextGrad(currentGrad: string): string | null {
  const rank = GRAD_RANK[currentGrad];
  if (rank === undefined) return null;
  const next = Object.entries(GRAD_RANK).find(([_, r]) => r === rank + 1);
  return next ? next[0] : null;
}

export default function EventoDetalle() {
  const { path } = useLocation();
  const { user } = useAuth();
  const eventoId = parseInt(path.split('/').pop() || '0');
  const [evento, setEvento] = useState<Evento | null>(null);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [preciosExamen, setPreciosExamen] = useState<Record<string, { inscripcion: number; registro: number }>>({});
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [selDisciplinas, setSelDisciplinas] = useState<string[]>([]);
  const [necesidadesEsp, setNecesidadesEsp] = useState(false);
  const [descNecesidades, setDescNecesidades] = useState('');
  const [archivoMedico, setArchivoMedico] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/eventos/${eventoId}`),
      user ? api.get('/mis-inscripciones') : Promise.resolve({ data: [] }),
      api.get('/precios-examen'),
    ])
      .then(([evRes, insRes, pxRes]) => {
        setEvento(evRes.data);
        const found = insRes.data.find((i: InscripcionResumen) => i.evento_id === eventoId);
        if (found) setInscripcion(found);
        const pxMap: Record<string, { inscripcion: number; registro: number }> = {};
        (pxRes.data as Array<{ graduacion: string; costo_inscripcion: number; costo_registro: number }>).forEach(p => { pxMap[p.graduacion] = { inscripcion: p.costo_inscripcion, registro: p.costo_registro }; });
        setPreciosExamen(pxMap);
      })
      .catch(() => setError('Error al cargar el evento'))
      .finally(() => setLoading(false));
  }, [eventoId, user]);

  const handleUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const fd = new FormData();
    fd.append('file', input.files[0]);
    try {
      const res = await api.post('/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setArchivoMedico(res.data.url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleInscribir = async () => {
    setInscribiendo(true);
    setError('');
    try {
      const body: {
        categorias?: string[];
        disciplinas?: string[];
        necesidades_especiales?: boolean;
        descripcion_necesidades?: string;
        archivo_medico_url?: string;
      } = {};
      if (evento?.tipo === 'EXAMEN') {
        if (selDisciplinas.length > 0) body.disciplinas = selDisciplinas;
      } else {
        if (categoria.length > 0) body.categorias = categoria;
      }
      body.necesidades_especiales = necesidadesEsp;
      if (necesidadesEsp && descNecesidades) body.descripcion_necesidades = descNecesidades;
      if (necesidadesEsp && archivoMedico) body.archivo_medico_url = archivoMedico;
      const res = await api.post(`/eventos/${eventoId}/inscribir`, body);
      setInscripcion(res.data);
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
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: res.data.preferenceId },
        render: { container: '#mp-checkout-inscripcion', label: 'Pagar' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'long', year: 'numeric',
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

  if (loading) return <div class="p-8 text-slate-400">Cargando...</div>;
  if (!evento) return <div class="p-8 text-red-600">Evento no encontrado</div>;

  const categorias: Array<{ nombre: string }> = evento.torneo?.categorias || [];
  const costo = evento.torneo?.costo_inscripcion ?? evento.seminario?.costo_inscripcion ?? 0;
  const infoExtra = evento.torneo?.info_adicional ?? evento.examen?.info_adicional ?? evento.seminario?.info_adicional ?? '';
  const disciplinas: string[] = evento.examen?.disciplinas || [];
  const rangosExamen: Array<{ disciplina: string; grad_min: string; grad_max: string }> = evento.examen?.graduaciones_a_rendir || [];
  const puedeInscribirse = user && !inscripcion && new Date(evento.fecha_inicio) > new Date();

  return (
    <div class="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
      <a href="/eventos" class="text-sm text-blue-600 hover:underline">&larr; Volver a eventos</a>

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">{evento.tipo}</h1>
            <p class="text-sm text-slate-500 mt-1">ID: {evento.id}</p>
          </div>
          <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{evento.tipo}</span>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-slate-500">Inicio</p>
            <p class="font-medium">{formatDate(evento.fecha_inicio)}</p>
          </div>
          <div>
            <p class="text-slate-500">Fin</p>
            <p class="font-medium">{formatDate(evento.fecha_fin)}</p>
          </div>
          {evento.datos_lugar && (
            <div class="col-span-2">
              <p class="text-slate-500">Lugar</p>
              <p class="font-medium">{evento.datos_lugar.direccion || ''}{evento.datos_lugar.provincia ? ` - ${evento.datos_lugar.provincia}` : ''}</p>
            </div>
          )}
          {evento.tipo !== 'EXAMEN' && costo > 0 && (
            <div class="col-span-2">
              <p class="text-slate-500">Costo de inscripción</p>
              <p class="font-medium">${costo.toLocaleString('es-AR')}</p>
            </div>
          )}
        </div>

        {infoExtra && (
          <div class="col-span-2">
            <p class="text-sm text-slate-500">Información adicional</p>
            <p class="font-medium text-sm">{infoExtra}</p>
          </div>
        )}

        {evento.tipo === 'EXAMEN' && disciplinas.length > 0 && (
          <div>
            <p class="text-sm text-slate-500 font-medium mb-2">Disciplinas</p>
            <div class="flex flex-wrap gap-2">
              {disciplinas.map(d => (
                <span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">{DISCIPLINA_LABELS[d] || d}</span>
              ))}
            </div>
          </div>
        )}

        {categorias.length > 0 && (
          <div>
            <p class="text-sm text-slate-500 font-medium mb-2">Categorías</p>
            <div class="flex flex-wrap gap-2">
              {categorias.map((c: CategoriaDef) => (
                <span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">{c.nombre}</span>
              ))}
            </div>
          </div>
        )}

        {evento.tipo === 'EXAMEN' && rangosExamen.length > 0 && (
          <div>
            <p class="text-sm text-slate-500 font-medium mb-2">Graduaciones disponibles</p>
            <div class="flex flex-wrap gap-2">
              {rangosExamen.map(r => (
                <span class="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                  {DISCIPLINA_LABELS[r.disciplina] || r.disciplina}: {GRAD_LABELS[r.grad_min] || r.grad_min} - {GRAD_LABELS[r.grad_max] || r.grad_max}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}
      {success && (
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">{success}</div>
      )}

      {inscripcion ? (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-3">
          <h3 class="font-semibold text-slate-800">Su inscripción</h3>
          <div class="space-y-2 text-sm">
            {evento.tipo === 'EXAMEN' && inscripcion.disciplinas && inscripcion.disciplinas.length > 0 && (
              <div class="flex justify-between">
                <span class="text-slate-500">Disciplinas</span>
                <span class="font-medium">{(inscripcion.disciplinas || []).map((d: string) => DISCIPLINA_LABELS[d] || d).join(', ')}</span>
              </div>
            )}
            <div class="flex justify-between">
              <span class="text-slate-500">{evento.tipo === 'EXAMEN' ? 'Graduaciones' : 'Categoría'}</span>
              <span class="font-medium">{(inscripcion.categorias || []).join(', ') || 'General'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Estado</span>
              <span class={`font-medium ${inscripcion.estado_aprob === 'APROBADO' ? 'text-green-600' : inscripcion.estado_aprob === 'RECHAZADO' ? 'text-red-600' : 'text-amber-600'}`}>
                {estadoLabel(inscripcion.estado_aprob)}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Pago</span>
              <span class={`font-medium ${inscripcion.pagado ? 'text-green-600' : 'text-amber-600'}`}>
                {inscripcion.pagado ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
          </div>

          {inscripcion.estado_aprob === 'APROBADO' && !inscripcion.pagado && (evento.tipo !== 'EXAMEN' ? costo > 0 : true) && (
            <div id="mp-checkout-inscripcion">
              <button
                onClick={handlePagar}
                class="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                Pagar inscripción
              </button>
            </div>
          )}
        </div>
      ) : puedeInscribirse ? (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
          <h3 class="font-semibold text-slate-800">Inscribirse</h3>

          {evento.tipo === 'TORNEO' && categorias.length > 0 && (
            <div>
              <label class="block text-sm text-slate-600 mb-1">
                Categorías
                {!evento.torneo?.inscripcion_multiple && <span class="text-xs text-slate-400 ml-1">(seleccione una)</span>}
              </label>
              <div class="space-y-1">
                {categorias.map((c: CategoriaDef) => {
                  const selected = categoria.includes(c.nombre);
                  return (
                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={selected}
                        onChange={() => {
                          if (selected) {
                            setCategoria(categoria.filter((n: string) => n !== c.nombre));
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
            <div>
              <label class="block text-sm text-slate-600 mb-2">
                Disciplinas a rendir
                <span class="text-xs text-slate-400 ml-1">(seleccione una o más)</span>
              </label>
              <div class="space-y-2">
                {disciplinas.map((d: string) => {
                  const selected = selDisciplinas.includes(d);
                  const gradKey = `grad_${d.toLowerCase()}` as keyof typeof user;
                  const userGrad = (user?.[gradKey] as string) || 'SIN_GRADUACION';
                  const nextGrad = computeNextGrad(userGrad);
                  const rango = rangosExamen.find(r => r.disciplina === d);

                  const costoGrad = nextGrad ? preciosExamen[nextGrad] : undefined;
                  const enRango = nextGrad && rango
                    ? (GRAD_RANK[nextGrad] >= GRAD_RANK[rango.grad_min] && GRAD_RANK[nextGrad] <= GRAD_RANK[rango.grad_max])
                    : false;

                  return (
                    <div class={`border rounded-lg p-3 ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                      <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={selected}
                          disabled={!enRango}
                          onChange={() => {
                            if (selected) {
                              setSelDisciplinas(selDisciplinas.filter((x: string) => x !== d));
                            } else {
                              setSelDisciplinas([...selDisciplinas, d]);
                            }
                          }}
                          class="w-4 h-4 mt-0.5 disabled:opacity-40" />
                        <div class="flex-1">
                          <p class="text-sm font-medium text-slate-800">{DISCIPLINA_LABELS[d] || d}</p>
                          {nextGrad && enRango && (
                            <div class="mt-1">
                              <p class="text-xs text-slate-600">
                                Se va a inscribir para rendir: <span class="font-semibold text-slate-800">{GRAD_LABELS[nextGrad] || nextGrad}</span>
                                {costoGrad && <span class="text-slate-400"> (${costoGrad.inscripcion.toLocaleString('es-AR')})</span>}
                              </p>
                              {(costoGrad?.registro ?? 0) > 0 && (
                                <p class="text-[10px] text-slate-400 mt-0.5">
                                  En caso de aprobar, deberá abonar ${(costoGrad?.registro ?? 0).toLocaleString('es-AR')} en concepto de registro
                                </p>
                              )}
                            </div>
                          )}
                          {nextGrad && !enRango && (
                            <p class="text-xs text-amber-600 mt-1">No disponible — su graduación siguiente no está dentro del rango de este examen</p>
                          )}
                          {!nextGrad && (
                            <p class="text-xs text-amber-600 mt-1">Ya ha alcanzado la máxima graduación en esta disciplina</p>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
              {selDisciplinas.length > 0 && (
                <div class="mt-3 space-y-1">
                  <p class="text-sm font-medium text-slate-700">
                    Total inscripción: ${selDisciplinas.reduce((sum, d) => {
                      const gradKey = `grad_${d.toLowerCase()}` as keyof typeof user;
                      const userGrad = (user?.[gradKey] as string) || 'SIN_GRADUACION';
                      const nextGrad = computeNextGrad(userGrad);
                      return sum + ((nextGrad && preciosExamen[nextGrad]?.inscripcion) || 0);
                    }, 0).toLocaleString('es-AR')}
                  </p>
                  {selDisciplinas.some(d => {
                    const gradKey = `grad_${d.toLowerCase()}` as keyof typeof user;
                    return preciosExamen[computeNextGrad((user?.[gradKey] as string) || 'SIN_GRADUACION') || '']?.registro > 0;
                  }) && (
                    <p class="text-xs text-slate-500">
                      En caso de aprobar, deberá abonar el registro al momento del examen.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {evento.tipo === 'EXAMEN' && (
            <div class="border-t border-slate-100 pt-4 space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={necesidadesEsp}
                  onChange={(e: Event) => setNecesidadesEsp((e.target as HTMLInputElement).checked)}
                  class="w-4 h-4" />
                <span class="text-sm text-slate-700">Declaro tener una dificultad que requiere consideración especial</span>
              </label>
              {necesidadesEsp && (
                <>
                  <textarea value={descNecesidades}
                    onInput={(e: Event) => setDescNecesidades((e.target as HTMLTextAreaElement).value)}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" rows={2}
                    placeholder="Describa la dificultad (uso de accesorio no reglamentado, incapacidad para realizar un movimiento, etc.)" />
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Certificado médico (opcional, PDF/JPG)</label>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUpload} class="text-sm" />
                    {archivoMedico && <p class="text-xs text-green-600 mt-1">Archivo subido</p>}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={handleInscribir}
            disabled={inscribiendo}
            class="w-full bg-slate-900 text-white py-2 rounded font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm"
          >
            {inscribiendo ? 'Inscribiendo...' : 'Inscribirme'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
