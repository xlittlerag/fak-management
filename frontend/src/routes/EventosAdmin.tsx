import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Spinner } from '../components/Spinner';
import EventoForm, { type EventoAdmin } from '../components/EventoForm';
import { ConfirmModal } from '../components/ConfirmModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function canEditEvent(evento: EventoAdmin, user: { id: number; rol: string } | null): boolean {
  if (!user) return false;
  if (user.rol === 'ADMIN_GENERAL') return true;
  if (user.rol === 'ADMIN_ASOCIACION' && evento.creador_id === user.id) return true;
  return false;
}

export default function EventosAdmin() {
  const { user } = useAuth();
  const { route } = useLocation();
  const [eventos, setEventos] = useState<EventoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [editing, setEditing] = useState<EventoAdmin | null | undefined>(undefined);
  const [showPasados, setShowPasados] = useState(false);
  const [confirmCerrarId, setConfirmCerrarId] = useState<number | null>(null);

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

  const handlePublicar = async (id: number) => {
    try {
      await api.patch(`/eventos/${id}/publicar`);
      fetchEventos();
    } catch {
      setTableError('Error al publicar evento');
    }
  };

  const handleCerrar = async (id: number) => {
    try {
      await api.post(`/eventos/${id}/cerrar-inscripciones`);
      fetchEventos();
    } catch {
      setTableError('Error al cerrar inscripciones');
    }
  };

  if (loading) return <Spinner text="Cargando eventos..." />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventosProximos = eventos.filter(ev => new Date(ev.fecha_inicio) >= today);
  const eventosPasados = eventos.filter(ev => new Date(ev.fecha_inicio) < today);
  const eventosVisibles = showPasados ? eventosPasados : eventosProximos;

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-slate-800">
          {showPasados ? 'Eventos Pasados' : 'Próximos Eventos'}
        </h2>
        <div class="flex gap-2">
          {!isFormOpen && (
            <>
              <button
                onClick={() => setShowPasados(!showPasados)}
                class="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                {showPasados ? 'Ver próximos' : 'Ver eventos pasados'}
              </button>
              <button
                onClick={() => setEditing(null)}
                class="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Crear Evento
              </button>
            </>
          )}
        </div>
      </div>

      {tableError && <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{tableError}</div>}

      {!isFormOpen && (
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
                  <th class="px-4 py-2">Inscripciones</th>
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
                    <td class="px-4 py-2 text-slate-600">{((ev.datos_lugar as { direccion: string })?.direccion ?? '-')}</td>
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
                    <td class="px-4 py-2">
                      <button onClick={() => route(`/dashboard/inscripciones?eventoId=${ev.id}`)} class="text-blue-600 hover:underline text-xs">
                        Ver inscripciones
                      </button>
                    </td>
                    <td class="px-4 py-2 text-right space-x-2">
                      {canEditEvent(ev, user) && (
                        <>
                          <button onClick={() => setEditing(ev)} class="text-blue-600 hover:underline">Editar</button>
                          {!ev.publicado && (
                            <button onClick={() => handlePublicar(ev.id)} class="text-green-600 hover:underline">Publicar</button>
                          )}
                          {ev.tipo === 'TORNEO' && ev.torneo?.inscripciones_abiertas && (
                            <button onClick={() => setConfirmCerrarId(ev.id)} class="text-orange-600 hover:underline">Cerrar insc.</button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {eventosVisibles.length === 0 && (
                  <tr>
                    <td colspan={7} class="px-4 py-8 text-center text-slate-500">
                      {showPasados ? 'No hay eventos pasados.' : 'No hay eventos próximos.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isFormOpen && (
        <EventoForm
          editing={editing}
          user={user}
          onClose={() => setEditing(undefined)}
          onSaved={fetchEventos}
        />
      )}

      {confirmCerrarId !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmCerrarId(null)}
          onConfirm={() => handleCerrar(confirmCerrarId)}
          title="Cerrar inscripciones"
          message="¿Está seguro de cerrar las inscripciones para este evento?"
          confirmText="Cerrar inscripciones"
        />
      )}
    </div>
  );
}
