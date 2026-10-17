import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { Wordmark } from '../components/ui/Wordmark';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/Spinner';

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
    api
      .get('/eventos')
      .then((res) => setEventos(res.data))
      .catch(() => setError('Error al cargar eventos'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div class="min-h-screen bg-paper">
      <header class="border-b border-steel-soft bg-surface">
        <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-8">
          <a href="/">
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

      <main class="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        <h1 class="font-display text-2xl text-ink">Próximos Eventos</h1>

        {loading ? (
          <Spinner text="Cargando eventos..." />
        ) : error ? (
          <div class="rounded-lg border border-hinomaru/20 bg-hinomaru-soft p-8 text-hinomaru">
            {error}
          </div>
        ) : eventos.length === 0 ? (
          <div class="rounded-lg border border-steel-soft bg-surface shadow-panel">
            <EmptyState title="No hay eventos próximos." />
          </div>
        ) : (
          <div class="grid gap-4">
            {eventos
              .filter((e) => new Date(e.fecha_inicio) > new Date())
              .map((evento) => {
                const costo =
                  evento.torneo?.costo_inscripcion ??
                  evento.seminario?.costo_inscripcion ??
                  0;
                return (
                  <a
                    key={evento.id}
                    href={`/eventos/${evento.id}`}
                    class="block rounded-lg border border-steel-soft bg-surface p-6 shadow-panel transition-shadow hover:shadow-float"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <h3 class="font-display text-lg text-ink">
                          {evento.tipo}
                        </h3>
                        <p class="mt-1 text-sm text-steel">
                          {new Date(evento.fecha_inicio).toLocaleDateString(
                            'es-AR',
                            {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            },
                          )}
                        </p>
                        {evento.datos_lugar && (
                          <p class="text-sm text-steel">
                            {evento.datos_lugar.direccion || ''}
                            {evento.datos_lugar.provincia
                              ? ` - ${evento.datos_lugar.provincia}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <Badge tone="info" class="shrink-0">
                        {evento.tipo}
                      </Badge>
                    </div>
                    {costo > 0 && (
                      <p class="tnum mt-3 text-sm font-medium text-ink">
                        Costo: ${costo.toLocaleString('es-AR')}
                      </p>
                    )}
                  </a>
                );
              })}
          </div>
        )}
      </main>
    </div>
  );
}
