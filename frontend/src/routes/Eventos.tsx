import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';

interface Evento {
  id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: { direccion?: string; provincia?: string };
  torneo?: { costo_inscripcion: number };
  seminario?: { costo_inscripcion: number };
}

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/eventos')
      .then(res => setEventos(res.data))
      .catch(() => setError('Error al cargar eventos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div class="p-8 text-slate-400">Cargando eventos...</div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <h1 class="text-2xl font-bold text-slate-900">Próximos Eventos</h1>

      {eventos.length === 0 ? (
        <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center text-slate-500">
          No hay eventos próximos.
        </div>
      ) : (
        <div class="grid gap-4">
          {eventos
            .filter(e => new Date(e.fecha_inicio) > new Date())
            .map(evento => (
              <a
                key={evento.id}
                href={`/eventos/${evento.id}`}
                class="block bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div class="flex justify-between items-start gap-4">
                  <div class="min-w-0">
                    <h3 class="text-lg font-semibold text-slate-900">{evento.tipo}</h3>
                    <p class="text-sm text-slate-500 mt-1">
                      {new Date(evento.fecha_inicio).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                    {evento.datos_lugar && (
                      <p class="text-sm text-slate-500">
                        {(evento.datos_lugar as any).direccion || ''}
                        {(evento.datos_lugar as any).provincia ? ` - ${(evento.datos_lugar as any).provincia}` : ''}
                      </p>
                    )}
                  </div>
                  <span class="shrink-0 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {evento.tipo}
                  </span>
                </div>
                {(() => {
                  const costo = evento.torneo?.costo_inscripcion ?? evento.seminario?.costo_inscripcion ?? 0;
                  return costo > 0 ? (
                    <p class="text-sm font-medium text-slate-700 mt-3">
                      Costo: ${costo.toLocaleString('es-AR')}
                    </p>
                  ) : null;
                })()}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
