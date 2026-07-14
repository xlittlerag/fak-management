import { useState, useEffect } from 'preact/hooks';
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
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmPagoManual, setConfirmPagoManual] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => {
    fetchAllInscripciones();
  }, []);

  const fetchAllInscripciones = async () => {
    try {
      const eventosRes = await api.get('/eventos');
      const eventos = eventosRes.data as Array<{ id: number }>;
      const allInscripciones: Inscripcion[] = [];

      for (const ev of eventos) {
        try {
          const res = await api.get(`/eventos/${ev.id}/inscripciones`);
          allInscripciones.push(...res.data);
        } catch {
          // skip eventos sin acceso
        }
      }

      allInscripciones.sort((a, b) => a.id - b.id);
      setInscripciones(allInscripciones);
    } catch {
      setError('Error al cargar inscripciones');
    } finally {
      setLoading(false);
    }
  };

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
      fetchAllInscripciones();
    } catch {
      setError('Error al registrar pago manual');
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando inscripciones..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  const query = search.toLowerCase();
  const pendientes = inscripciones.filter(i => i.estado_aprob === 'PENDIENTE' && (
    !query || i.usuario?.nombre?.toLowerCase().includes(query) || i.usuario?.dni?.includes(query)
  ));
  const totalPages = Math.ceil(pendientes.length / PAGE_SIZE);
  const pagedPendientes = pendientes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Inscripciones Pendientes</h2>

      <input
        type="text"
        value={search}
        onInput={(e: Event) => { setSearch((e.target as HTMLInputElement).value); setPage(0); }}
        placeholder="Buscar por nombre o DNI..."
        class="w-full max-w-md px-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}
      {msg && (
        <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">{msg}</div>
      )}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider font-semibold">
              <tr>
                <th class="px-6 py-4">Usuario</th>
                <th class="px-6 py-4">Evento</th>
                <th class="px-6 py-4">Categoría / Graduación</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {pendientes.length === 0 ? (
                <tr>
                  <td colspan={4} class="px-6 py-8 text-center text-slate-500">
                    No hay inscripciones pendientes.
                  </td>
                </tr>
              ) : (
                pagedPendientes.map(ins => (
                  <tr key={ins.id} class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="font-medium text-slate-900">{ins.usuario?.nombre || 'Usuario #' + ins.usuario_id}</div>
                      <div class="text-xs text-slate-500 font-mono">{ins.usuario?.dni || ''}</div>
                    </td>
                    <td class="px-6 py-4 text-sm">
                      <div>{ins.evento?.tipo || 'Evento #' + ins.evento_id}</div>
                      <div class="text-xs text-slate-400">
                        {ins.evento?.fecha_inicio ? new Date(ins.evento.fecha_inicio).toLocaleDateString('es-AR') : ''}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">
                      {ins.evento?.tipo === 'EXAMEN' && ins.disciplinas && ins.disciplinas.length > 0 && (
                        <div class="text-xs text-slate-400 mb-1">Disc: {ins.disciplinas.join(', ')}</div>
                      )}
                      {(ins.categorias || []).join(', ') || 'General'}
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleAction(ins.id, 'APROBAR')}
                        class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleAction(ins.id, 'RECHAZAR')}
                        class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
                      >
                        Rechazar
                      </button>
                      {!ins.pagado && (
                        <button
                          onClick={() => setConfirmPagoManual(ins.id)}
                          class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
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
