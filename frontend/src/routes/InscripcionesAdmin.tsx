import { useState, useEffect, useCallback } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { ConfirmModal } from '../components/ConfirmModal';
import { Pagination } from '../components/Pagination';

interface Inscripcion {
  id: number;
  usuario_id: number;
  evento_id: number;
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
  pagado_fuera_sistema: boolean;
  usuario: { id: number; nombre: string; email: string; dni: string };
  evento: { id: number; tipo: string; fecha_inicio: string };
}

export default function InscripcionesAdmin() {
  const { route, query: locationQuery } = useLocation();
  const eventoId = locationQuery.eventoId ?? null;

  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmPagoManual, setConfirmPagoManual] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchInscripciones = useCallback(async (signal?: AbortSignal) => {
    try {
      if (eventoId) {
        const res = await api.get(`/eventos/${eventoId}/inscripciones`, { signal });
        if (signal?.aborted) return;
        setInscripciones(res.data);
      } else {
        const eventosRes = await api.get('/eventos', { signal });
        const eventos = eventosRes.data as Array<{ id: number }>;
        const results = await Promise.allSettled(
          eventos.map((ev) => api.get(`/eventos/${ev.id}/inscripciones`, { signal })),
        );
        if (signal?.aborted) return;
        const allInscripciones: Inscripcion[] = [];
        for (const r of results) {
          // Las rechazadas (p. ej. eventos sin acceso) se omiten
          if (r.status === 'fulfilled' && Array.isArray(r.value.data)) {
            allInscripciones.push(...r.value.data);
          }
        }

        allInscripciones.sort((a, b) => a.id - b.id);
        setInscripciones(allInscripciones);
      }
    } catch {
      if (signal?.aborted) return;
      setError('Error al cargar inscripciones');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void fetchInscripciones(controller.signal);
    return () => controller.abort();
  }, [fetchInscripciones]);

  const handleAction = async (id: number, accion: 'APROBAR' | 'RECHAZAR') => {
    try {
      await api.patch(`/inscripciones/${id}/aprobar`, { accion });
      setInscripciones(prev => prev.filter(i => i.id !== id));
    } catch {
      setError('Error al procesar la acción');
    }
  };

  const handlePagoManual = async (inscripcionId: number) => {
    try {
      await api.post(`/inscripciones/${inscripcionId}/pago-manual`);
      setMsg('Pago registrado fuera del sistema');
      fetchInscripciones();
    } catch {
      setError('Error al registrar pago manual');
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando inscripciones..." /></div>;
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  const query = search.toLowerCase();
  const pendientes = inscripciones.filter(i => i.estado_aprob === 'PENDIENTE' && (
    !query || i.usuario?.nombre?.toLowerCase().includes(query) || i.usuario?.dni?.toLowerCase().includes(query)
  ));
  const totalPages = Math.ceil(pendientes.length / PAGE_SIZE);
  const pagedPendientes = pendientes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-4">
        <label htmlFor="inscripciones-busqueda" class="sr-only">Buscar por nombre o DNI</label>
        <input
          id="inscripciones-busqueda"
          type="text"
          value={search}
          onInput={(e: Event) => { setSearch((e.target as HTMLInputElement).value); setPage(0); }}
          placeholder="Buscar por nombre o DNI..."
          class="w-full max-w-md px-4 py-2 border border-steel-soft rounded text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
        />
        {eventoId && (
          <button onClick={() => route('/dashboard/eventos-admin')} class="text-sm text-ai hover:underline whitespace-nowrap">
            ← Volver a Eventos
          </button>
        )}
      </div>

      {error && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">{error}</div>
      )}
      {msg && (
        <div class="bg-ai-soft border border-ai/20 text-ai px-4 py-3 rounded text-sm">{msg}</div>
      )}

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-paper border-b border-steel-soft text-steel text-sm uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-6 py-4">Usuario</th>
                <th class="px-6 py-4">Evento</th>
                <th class="px-6 py-4">Categoría / Graduación</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-steel-soft/60">
              {pendientes.length === 0 ? (
                <tr>
                  <td colspan={4} class="px-6 py-8 text-center text-steel">
                    No hay inscripciones pendientes.
                  </td>
                </tr>
              ) : (
                pagedPendientes.map(ins => (
                  <tr key={ins.id} class="hover:bg-ai-soft/50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="font-medium text-ink">{ins.usuario?.nombre || 'Usuario #' + ins.usuario_id}</div>
                      <div class="text-xs text-steel font-mono">{ins.usuario?.dni || ''}</div>
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <div>{ins.evento?.tipo || 'Evento #' + ins.evento_id}</div>
                      <div class="text-xs text-steel">
                        {ins.evento?.fecha_inicio ? new Date(ins.evento.fecha_inicio).toLocaleDateString('es-AR') : ''}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-steel">
                      {ins.evento?.tipo === 'EXAMEN' && ins.disciplinas && ins.disciplinas.length > 0 && (
                        <div class="text-xs text-steel mb-1">Disc: {ins.disciplinas.join(', ')}</div>
                      )}
                      {(ins.categorias || []).join(', ') || 'General'}
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleAction(ins.id, 'APROBAR')}
                        class="px-3 py-1 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleAction(ins.id, 'RECHAZAR')}
                        class="px-3 py-1 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors"
                      >
                        Rechazar
                      </button>
                      {!ins.pagado && (
                        <button
                          onClick={() => setConfirmPagoManual(ins.id)}
                          class="px-3 py-1 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors"
                        >
                          Pago manual
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {confirmPagoManual !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmPagoManual(null)}
          onConfirm={() => handlePagoManual(confirmPagoManual)}
          title="Pago manual"
          message="¿Registrar pago fuera del sistema para esta inscripción?"
          confirmText="Registrar pago"
        />
      )}
    </div>
  );
}
