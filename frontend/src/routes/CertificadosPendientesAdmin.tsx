import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Spinner } from '../components/Spinner';
import { Pagination } from '../components/Pagination';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';

const DISCIPLINA_LABELS: Record<string, string> = {
  KENDO: 'Kendo',
  IAIDO: 'Iaido',
  JODO: 'Jodo',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO_ASOCIACION: 'Aprobado (Asociación)',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-warning-soft text-warning border-warning/20',
  APROBADO_ASOCIACION: 'bg-ai-soft text-ai border-ai/20',
  APROBADO: 'bg-success-soft text-success border-success/20',
  RECHAZADO: 'bg-hinomaru-soft text-hinomaru border-hinomaru/20',
};

interface CertificadoAdmin {
  id: number;
  url_archivo: string;
  disciplina: string;
  grad_solicitada: string;
  estado: string;
  created_at: string;
  usuario: { id: number; nombre: string; apellido: string; dni: string };
}

export default function CertificadosPendientesAdmin() {
  const { user } = useAuth();
  const [certificados, setCertificados] = useState<CertificadoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [processing, setProcessing] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const fetchData = () => {
    setLoading(true);
    api
      .get('/certificados')
      .then((res) => setCertificados(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: number, action: string) => {
    setProcessing(id);
    setMsg('');
    try {
      await api.patch(`/certificados/${id}/${action}`);
      setMsg('Estado actualizado correctamente');
      fetchData();
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const isAdminGeneral = user?.rol === 'ADMIN_GENERAL';
  const isAdminAsociacion = user?.rol === 'ADMIN_ASOCIACION';

  const query = search.toLowerCase();
  const filtered = certificados.filter(
    (c) =>
      !query ||
      c.usuario.nombre.toLowerCase().includes(query) ||
      c.usuario.apellido.toLowerCase().includes(query) ||
      c.usuario.dni.toLowerCase().includes(query),
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <Spinner text="Cargando certificaciones..." />;
  if (error)
    return (
      <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">
        {error}
      </div>
    );

  return (
    <div class="space-y-6">
      {msg && (
        <div
          class={`px-4 py-3 rounded text-sm border ${
            msg === 'Estado actualizado correctamente'
              ? 'bg-success-soft border-success/20 text-success'
              : 'bg-hinomaru-soft border-hinomaru/20 text-hinomaru'
          }`}
        >
          {msg}
        </div>
      )}

      <input
        type="text"
        value={search}
        aria-label="Buscar por nombre, apellido o DNI"
        onInput={(e: Event) => {
          setSearch((e.target as HTMLInputElement).value);
          setPage(0);
        }}
        placeholder="Buscar por nombre, apellido o DNI..."
        class="w-full max-w-md px-4 py-2 border border-steel-soft rounded text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
      />

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        <div class="px-6 py-4 border-b border-steel-soft">
          <h3 class="font-semibold text-ink">Certificaciones Externas</h3>
        </div>
        {filtered.length === 0 ? (
          <div class="px-6 py-8 text-center text-steel">
            No hay certificaciones registradas.
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
                  <th class="px-4 py-2">Usuario</th>
                  <th class="px-4 py-2">DNI</th>
                  <th class="px-4 py-2">Disciplina</th>
                  <th class="px-4 py-2">Graduación</th>
                  <th class="px-4 py-2">Estado</th>
                  <th class="px-4 py-2">Fecha</th>
                  <th class="px-4 py-2">Archivo</th>
                  <th class="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    class="border-b border-steel-soft hover:bg-ai-soft/50"
                  >
                    <td class="px-4 py-2 font-medium">
                      {c.usuario.nombre} {c.usuario.apellido}
                    </td>
                    <td class="px-4 py-2 text-steel">{c.usuario.dni}</td>
                    <td class="px-4 py-2">
                      {DISCIPLINA_LABELS[c.disciplina] || c.disciplina}
                    </td>
                    <td class="px-4 py-2">
                      {GRADUACIONES.find((g) => g.value === c.grad_solicitada)
                        ?.label || c.grad_solicitada}
                    </td>
                    <td class="px-4 py-2">
                      <span
                        class={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${ESTADO_COLORS[c.estado] || ''}`}
                      >
                        {ESTADO_LABELS[c.estado] || c.estado}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-steel">
                      {new Date(c.created_at).toLocaleDateString('es-AR')}
                    </td>
                    <td class="px-4 py-2">
                      <a
                        href={c.url_archivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-steel hover:text-ink underline"
                      >
                        Ver PDF
                      </a>
                    </td>
                    <td class="px-4 py-2">
                      <div class="flex gap-1">
                        {c.estado === 'PENDIENTE' && isAdminAsociacion && (
                          <>
                            <button
                              onClick={() =>
                                handleAction(c.id, 'aprobar-asociacion')
                              }
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-surface border border-steel-soft text-ink rounded text-xs font-medium hover:bg-ai-soft/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleAction(c.id, 'rechazar')}
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-surface border border-steel-soft text-ink rounded text-xs font-medium hover:bg-ai-soft/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {c.estado === 'APROBADO_ASOCIACION' &&
                          isAdminGeneral && (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(c.id, 'aprobar-general')
                                }
                                disabled={processing === c.id}
                                class="px-2 py-1 bg-surface border border-steel-soft text-ink rounded text-xs font-medium hover:bg-ai-soft/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Aprobar Definitivamente
                              </button>
                              <button
                                onClick={() => handleAction(c.id, 'rechazar')}
                                disabled={processing === c.id}
                                class="px-2 py-1 bg-surface border border-steel-soft text-ink rounded text-xs font-medium hover:bg-ai-soft/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                        {c.estado === 'APROBADO' && (
                          <span class="text-xs text-success font-medium">
                            Completado
                          </span>
                        )}
                        {c.estado === 'RECHAZADO' && (
                          <span class="text-xs text-hinomaru font-medium">
                            Rechazado
                          </span>
                        )}
                        {c.estado === 'PENDIENTE' && isAdminGeneral && (
                          <span class="text-xs text-steel">
                            Esperando aprobación de asociación
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
