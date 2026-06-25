import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Evento {
  id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: Record<string, any>;
  torneo?: {
    costo_inscripcion: number;
    categorias: Array<{ nombre: string }>;
    disciplina: string;
    inscripcion_multiple: boolean;
    info_adicional?: string;
  };
  examen?: {
    disciplinas: string[];
    graduaciones_a_rendir: string[];
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

export default function EventoDetalle() {
  const { path } = useLocation();
  const { user } = useAuth();
  const eventoId = parseInt(path.split('/').pop() || '0');
  const [evento, setEvento] = useState<Evento | null>(null);
  const [inscripcion, setInscripcion] = useState<Inscripcion | null>(null);
  const [preciosExamen, setPreciosExamen] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [categoria, setCategoria] = useState<string[]>([]);
  const [selDisciplinas, setSelDisciplinas] = useState<string[]>([]);
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
        const found = insRes.data.find((i: any) => i.evento_id === eventoId);
        if (found) setInscripcion(found);
        const pxMap: Record<string, number> = {};
        (pxRes.data as Array<{ graduacion: string; costo: number }>).forEach(p => { pxMap[p.graduacion] = p.costo; });
        setPreciosExamen(pxMap);
      })
      .catch(() => setError('Error al cargar el evento'))
      .finally(() => setLoading(false));
  }, [eventoId, user]);

  const handleInscribir = async () => {
    setInscribiendo(true);
    setError('');
    try {
      const body: Record<string, any> = {};
      if (categoria.length > 0) body.categorias = categoria;
      if (evento?.tipo === 'EXAMEN' && selDisciplinas.length > 0) body.disciplinas = selDisciplinas;
      const res = await api.post(`/eventos/${eventoId}/inscribir`, body);
      setInscripcion(res.data);
      setSuccess('Se ha inscripto correctamente al evento');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al inscribirse';
      setError(Array.isArray(msg) ? msg[0] : msg);
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
      const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: res.data.preferenceId },
        render: { container: '#mp-checkout-inscripcion', label: 'Pagar' },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar el pago';
      setError(Array.isArray(msg) ? msg[0] : msg);
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
  const gradRendir: string[] = evento.examen?.graduaciones_a_rendir || [];
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
              <p class="font-medium">{(evento.datos_lugar as any).direccion || ''}{(evento.datos_lugar as any).provincia ? ` - ${(evento.datos_lugar as any).provincia}` : ''}</p>
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
              {categorias.map((c: any) => (
                <span class="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">{c.nombre}</span>
              ))}
            </div>
          </div>
        )}

        {evento.tipo === 'EXAMEN' && gradRendir.length > 0 && (
          <div>
            <p class="text-sm text-slate-500 font-medium mb-2">Graduaciones a rendir</p>
            <div class="flex flex-wrap gap-2">
              {gradRendir.map(g => (
                <span class="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
                  {GRAD_LABELS[g] || g}
                  {preciosExamen[g] !== undefined && ` ($${preciosExamen[g].toLocaleString('es-AR')})`}
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
                {categorias.map((c: any) => {
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
            <>
              <div>
                <label class="block text-sm text-slate-600 mb-2">Disciplinas</label>
                <div class="space-y-1">
                  {disciplinas.map((d: string) => {
                    const selected = selDisciplinas.includes(d);
                    return (
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={selected}
                          onChange={() => {
                            if (selected) {
                              setSelDisciplinas(selDisciplinas.filter((x: string) => x !== d));
                            } else {
                              setSelDisciplinas([...selDisciplinas, d]);
                            }
                          }}
                        />
                        {DISCIPLINA_LABELS[d] || d}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label class="block text-sm text-slate-600 mb-2">Graduaciones a rendir</label>
                <div class="space-y-1">
                  {gradRendir.map((g: string) => {
                    const selected = categoria.includes(g);
                    const costoGrad = preciosExamen[g];
                    return (
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={selected}
                          onChange={() => {
                            if (selected) {
                              setCategoria(categoria.filter((n: string) => n !== g));
                            } else {
                              setCategoria([...categoria, g]);
                            }
                          }}
                        />
                        <span>{GRAD_LABELS[g] || g}</span>
                        {costoGrad !== undefined && (
                          <span class="text-xs text-slate-400">(${costoGrad.toLocaleString('es-AR')})</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {categoria.length > 0 && (
                  <p class="text-sm font-medium text-slate-700 mt-2">
                    Total: ${categoria.reduce((sum, g) => sum + (preciosExamen[g] || 0), 0).toLocaleString('es-AR')}
                  </p>
                )}
              </div>
            </>
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
