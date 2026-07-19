import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';
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
  evento_id: number;
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

export default function EventosDashboard() {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [preciosExamen, setPreciosExamen] = useState<Record<string, { inscripcion: number; registro: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inscribiendo, setInscribiendo] = useState<Record<number, boolean>>({});
  const [payingId, setPayingId] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Record<number, string[]>>({});
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<Record<number, string[]>>({});
  const [necesidadesEsp, setNecesidadesEsp] = useState<Record<number, boolean>>({});
  const [descNecesidades, setDescNecesidades] = useState<Record<number, string>>({});
  const [medicoFile, setMedicoFile] = useState<Record<number, File | null>>({});

  useEffect(() => {
    Promise.all([
      api.get('/eventos'),
      api.get('/mis-inscripciones'),
      api.get('/precios-examen'),
    ])
      .then(([evRes, insRes, pxRes]) => {
        setEventos(evRes.data);
        setInscripciones(insRes.data);
        const pxMap: Record<string, { inscripcion: number; registro: number }> = {};
        (pxRes.data as Array<{ graduacion: string; costo_inscripcion: number; costo_registro: number }>).forEach(p => { pxMap[p.graduacion] = { inscripcion: p.costo_inscripcion, registro: p.costo_registro }; });
        setPreciosExamen(pxMap);
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const getInscripcion = (eventoId: number) =>
    inscripciones.find(i => i.evento_id === eventoId) || null;

  const handleInscribir = async (eventoId: number) => {
    setInscribiendo(prev => ({ ...prev, [eventoId]: true }));
    setError('');
    try {
      const evento = eventos.find(e => e.id === eventoId);
      const body: Record<string, any> = {};
      if (evento?.tipo === 'EXAMEN') {
        const disc = selectedDisciplinas[eventoId];
        if (disc?.length) body.disciplinas = disc;
        if (necesidadesEsp[eventoId]) {
          body.necesidades_especiales = true;
          if (descNecesidades[eventoId]) body.descripcion_necesidades = descNecesidades[eventoId];
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
      setInscripciones(prev => [...prev, res.data]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setInscribiendo(prev => ({ ...prev, [eventoId]: false }));
    }
  };

  const handlePagar = async (ins: Inscripcion) => {
    setPayingId(ins.id);
    setError('');
    try {
      const res = await api.post(`/inscripciones/${ins.id}/pagar`);
      if (res.data.gratuito) {
        setInscripciones(prev =>
          prev.map(i => i.id === ins.id ? { ...i, pagado: true } : i)
        );
        return;
      }
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: res.data.preferenceId },
        render: { container: `#mp-checkout-ev-${ins.id}`, label: 'Pagar' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  function estadoBadge(ins: Inscripcion) {
    if (ins.pagado) return { label: 'Pagado', cls: 'bg-green-50 text-green-700' };
    const map: Record<string, { label: string; cls: string }> = {
      PENDIENTE: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
      APROBADO: { label: 'Aprobado', cls: 'bg-green-50 text-green-700' },
      RECHAZADO: { label: 'Rechazado', cls: 'bg-red-50 text-red-700' },
    };
    return map[ins.estado_aprob] || { label: ins.estado_aprob, cls: 'bg-slate-50 text-slate-700' };
  }

  if (loading) return <Spinner text="Cargando eventos..." />;

  const upcoming = eventos.filter(e => new Date(e.fecha_inicio) > new Date());

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Próximos Eventos</h2>

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {upcoming.length === 0 ? (
        <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center text-slate-500">
          No hay eventos próximos.
        </div>
      ) : (
        <div class="grid gap-4">
          {upcoming.map(evento => {
            const ins = getInscripcion(evento.id);
            const cats: Array<{ nombre: string }> = evento.torneo?.categorias || [];
            const costo = evento.torneo?.costo_inscripcion ?? evento.seminario?.costo_inscripcion ?? 0;
            const infoExtra = evento.torneo?.info_adicional ?? evento.examen?.info_adicional ?? evento.seminario?.info_adicional ?? '';
            const disciplinas: string[] = evento.examen?.disciplinas || [];
            const rangosExamen: Array<{ disciplina: string; grad_min: string; grad_max: string }> = evento.examen?.graduaciones_a_rendir || [];

            return (
              <div key={evento.id} class="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                <div class="flex justify-between items-start">
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-slate-900">{evento.tipo}</h3>
                    <p class="text-sm text-slate-500 mt-1">{formatDate(evento.fecha_inicio)}</p>
                    {evento.datos_lugar && (
                      <p class="text-sm text-slate-500">
                        {evento.datos_lugar.direccion ?? ''}
                        {evento.datos_lugar.provincia ? ` - ${evento.datos_lugar.provincia}` : ''}
                      </p>
                    )}
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    {ins && (
                      <span class={`px-3 py-1 rounded-full text-xs font-medium ${estadoBadge(ins).cls}`}>
                        {estadoBadge(ins).label}
                      </span>
                    )}
                    <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {evento.tipo}
                    </span>
                  </div>
                </div>

                {evento.tipo === 'EXAMEN' && disciplinas.length > 0 && (
                  <div class="flex flex-wrap gap-1">
                    <span class="text-xs text-slate-500 mr-1">Disciplinas:</span>
                    {disciplinas.map(d => (
                      <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">{DISCIPLINA_LABELS[d] || d}</span>
                    ))}
                  </div>
                )}

                {evento.tipo !== 'EXAMEN' && costo > 0 && (
                  <p class="text-sm font-medium text-slate-700">
                    Costo: ${costo.toLocaleString('es-AR')}
                  </p>
                )}

                {infoExtra && (
                  <p class="text-sm text-slate-600 italic">{infoExtra}</p>
                )}

                {evento.tipo === 'TORNEO' && cats.length > 0 && (
                  <div class="flex flex-wrap gap-1">
                    {cats.map((c: CategoriaDef) => (
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{c.nombre}</span>
                    ))}
                  </div>
                )}

                {!ins ? (
                  <div class="space-y-3 pt-2 border-t border-slate-100">
                    {evento.tipo === 'TORNEO' && cats.length > 0 && (
                      <div>
                        <label class="block text-sm text-slate-600 mb-1">
                          Categorías
                          {!evento.torneo?.inscripcion_multiple && <span class="text-xs text-slate-400 ml-1">(seleccione una)</span>}
                        </label>
                        <div class="space-y-1">
                          {cats.map((c: CategoriaDef) => {
                            const selected = (categorias[evento.id] || []).includes(c.nombre);
                            return (
                              <label class="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={selected}
                                  onChange={() => {
                                    const prev = categorias[evento.id] || [];
                                    if (selected) {
                                      const next = prev.filter((n: string) => n !== c.nombre);
                                      setCategorias(prev2 => ({ ...prev2, [evento.id]: next }));
                                    } else {
                                      if (!evento.torneo?.inscripcion_multiple) {
                                        setCategorias(prev2 => ({ ...prev2, [evento.id]: [c.nombre] }));
                                      } else {
                                        setCategorias(prev2 => ({ ...prev2, [evento.id]: [...prev, c.nombre] }));
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
                            const selected = (selectedDisciplinas[evento.id] || []).includes(d);
                            const gradKey = `grad_${d.toLowerCase()}` as 'grad_kendo' | 'grad_iaido' | 'grad_jodo';
                            const userGrad = user?.[gradKey] || 'SIN_GRADUACION';
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
                                      const prev = selectedDisciplinas[evento.id] || [];
                                      if (selected) {
                                        setSelectedDisciplinas(prev2 => ({ ...prev2, [evento.id]: prev.filter((x: string) => x !== d) }));
                                      } else {
                                        setSelectedDisciplinas(prev2 => ({ ...prev2, [evento.id]: [...prev, d] }));
                                      }
                                    }}
                                    class="w-4 h-4 mt-0.5 disabled:opacity-40" />
                                  <div class="flex-1">
                                    <p class="text-sm font-medium text-slate-800">{DISCIPLINA_LABELS[d] || d}</p>
                                    {nextGrad && enRango && (
                                      <div class="mt-1">
                                        <p class="text-xs text-slate-600">
                                          Se va a inscribir para rendir: <span class="font-semibold text-slate-800">{GRAD_LABELS[nextGrad] || nextGrad}</span>
                                          {costoGrad !== undefined && <span class="text-slate-400"> (${costoGrad.inscripcion.toLocaleString('es-AR')})</span>}
                                        </p>
                                      </div>
                                    )}
                                    {nextGrad && !enRango && (
                                      <p class="text-xs text-amber-600 mt-1">No disponible</p>
                                    )}
                                    {!nextGrad && (
                                      <p class="text-xs text-amber-600 mt-1">Máxima graduación alcanzada</p>
                                    )}
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                        {(selectedDisciplinas[evento.id] || []).length > 0 && (
                          <p class="text-sm font-medium text-slate-700 mt-2">
                            Total: ${(selectedDisciplinas[evento.id] || []).reduce((sum, d) => {
                              const gradKey = `grad_${d.toLowerCase()}` as 'grad_kendo' | 'grad_iaido' | 'grad_jodo';
                              const userGrad = user?.[gradKey] || 'SIN_GRADUACION';
                              const nextGrad = computeNextGrad(userGrad);
                              return sum + ((nextGrad && preciosExamen[nextGrad]?.inscripcion) || 0);
                            }, 0).toLocaleString('es-AR')}
                          </p>
                        )}

                        <div class="border-t border-slate-100 pt-4 space-y-3">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={necesidadesEsp[evento.id] || false}
                              onChange={(e: Event) => {
                                const checked = (e.target as HTMLInputElement).checked;
                                setNecesidadesEsp(prev => ({ ...prev, [evento.id]: checked }));
                                if (!checked) {
                                  setDescNecesidades(prev => { const n = { ...prev }; delete n[evento.id]; return n; });
                                  setMedicoFile(prev => { const n = { ...prev }; delete n[evento.id]; return n; });
                                }
                              }}
                              class="w-4 h-4" />
                            <span class="text-sm text-slate-700">Declaro tener una dificultad que requiere consideración especial</span>
                          </label>
                          {necesidadesEsp[evento.id] && (
                            <>
                              <textarea value={descNecesidades[evento.id] || ''}
                                onInput={(e: Event) => setDescNecesidades(prev => ({ ...prev, [evento.id]: (e.target as HTMLTextAreaElement).value }))}
                                class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" rows={2}
                                placeholder="Describa la dificultad (uso de accesorio no reglamentado, incapacidad para realizar un movimiento, etc.)" />
                              <FileUpload
                                label="Certificado médico"
                                currentFile={medicoFile[evento.id] || null}
                                onFileChange={(f) => setMedicoFile(prev => ({ ...prev, [evento.id]: f }))}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleInscribir(evento.id)}
                      disabled={inscribiendo[evento.id]}
                      class="w-full bg-slate-900 text-white py-2 rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {inscribiendo[evento.id] ? 'Inscribiendo...' : 'Inscribirme'}
                    </button>
                  </div>
                ) : ins.estado_aprob === 'APROBADO' && !ins.pagado ? (
                  <div class="pt-2 border-t border-slate-100" id={`mp-checkout-ev-${ins.id}`}>
                    <button
                      onClick={() => handlePagar(ins)}
                      disabled={payingId === ins.id}
                      class="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {payingId === ins.id ? 'Procesando...' : 'Pagar inscripción'}
                    </button>
                  </div>
                ) : ins.estado_aprob === 'RECHAZADO' ? (
                  <p class="pt-2 border-t border-slate-100 text-sm text-red-600">Su inscripción fue rechazada.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
