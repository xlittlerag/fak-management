import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { Modal } from '../components/Modal';

interface AuditEntry {
  id: number;
  accion: string;
  entidad: string;
  entidad_id: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  entidad_nombre: string | null;
  datos_previos: unknown | null;
  datos_nuevos: unknown | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditResponse {
  datos: AuditEntry[];
  total: number;
  pagina: number;
  total_paginas: number;
}

export default function AuditoriaAdmin() {
  const { user } = useAuth();
  const { route } = useLocation();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(1);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  if (user?.rol !== 'ADMIN_GENERAL') {
    route('/dashboard');
    return null;
  }

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set('pagina', String(page));
    params.set('limite', '20');
    if (filtroEntidad) params.set('entidad', filtroEntidad);
    if (filtroAccion) params.set('accion', filtroAccion);
    if (filtroDesde) params.set('desde', filtroDesde);
    if (filtroHasta) params.set('hasta', filtroHasta);
    return `/admin/auditoria?${params}`;
  };

  const fetchData = async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(buildUrl(page));
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(pagina); }, [pagina]);

  const handleFilter = () => {
    setPagina(1);
    fetchData(1);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('es-AR');

  const formatJSON = (obj: unknown) =>
    JSON.stringify(obj, null, 2);

  if (loading && !data) {
    return <div class="text-slate-400">Cargando...</div>;
  }

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Auditoría</h2>

      {error && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Entidad</label>
            <input value={filtroEntidad}
              onInput={(e: Event) => setFiltroEntidad((e.target as HTMLInputElement).value)}
              class="px-3 py-1.5 border border-slate-300 rounded text-sm w-36" placeholder="ej: Usuario" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Acción</label>
            <select value={filtroAccion}
              onChange={(e: Event) => setFiltroAccion((e.target as HTMLSelectElement).value)}
              class="px-3 py-1.5 border border-slate-300 rounded text-sm">
              <option value="">Todas</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="UPSERT">UPSERT</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Desde</label>
            <input type="date" value={filtroDesde}
              onInput={(e: Event) => setFiltroDesde((e.target as HTMLInputElement).value)}
              class="px-3 py-1.5 border border-slate-300 rounded text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
            <input type="date" value={filtroHasta}
              onInput={(e: Event) => setFiltroHasta((e.target as HTMLInputElement).value)}
              class="px-3 py-1.5 border border-slate-300 rounded text-sm" />
          </div>
          <button onClick={handleFilter}
            class="px-4 py-1.5 bg-slate-900 text-white rounded text-sm font-medium hover:bg-slate-800 transition-colors">
            Filtrar
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th class="px-4 py-2">ID</th>
                <th class="px-4 py-2">Acción</th>
                <th class="px-4 py-2">Entidad</th>
                <th class="px-4 py-2">Usuario</th>
                <th class="px-4 py-2">IP</th>
                <th class="px-4 py-2">Fecha</th>
                <th class="px-4 py-2 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              {data?.datos.map(entry => (
                <tr key={entry.id} class="hover:bg-slate-50">
                  <td class="px-4 py-2 font-mono">{entry.id}</td>
                  <td class="px-4 py-2">
                    <span class={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      entry.accion === 'CREATE' ? 'bg-green-100 text-green-700' :
                      entry.accion === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                      entry.accion === 'DELETE' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {entry.accion}
                    </span>
                  </td>
                  <td class="px-4 py-2">
                    <span class="text-slate-800">{entry.entidad_nombre ?? `#${entry.entidad_id}`}</span>
                    <span class="ml-1 text-[10px] text-slate-400">({entry.entidad})</span>
                  </td>
                  <td class="px-4 py-2">
                    <span class="text-slate-700">{entry.usuario_nombre ?? '—'}</span>
                    {entry.usuario_id && (
                      <span class="ml-1 text-[10px] text-slate-400">#{entry.usuario_id}</span>
                    )}
                  </td>
                  <td class="px-4 py-2 font-mono">{entry.ip ?? '—'}</td>
                  <td class="px-4 py-2 text-slate-500">{formatDate(entry.created_at)}</td>
                  <td class="px-4 py-2 text-right">
                    <button onClick={() => setSelected(entry)}
                      class="text-blue-600 hover:underline text-xs">
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {(!data || data.datos.length === 0) && (
                <tr>
                  <td colSpan={7} class="px-4 py-8 text-center text-slate-500">
                    No hay registros de auditoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total_paginas > 1 && (
        <div class="flex items-center justify-between text-sm text-slate-600">
          <span>Página {data.pagina} de {data.total_paginas} ({data.total} registros)</span>
          <div class="flex gap-2">
            <button disabled={data.pagina <= 1} onClick={() => setPagina(p => p - 1)}
              class="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Anterior
            </button>
            <button disabled={data.pagina >= data.total_paginas} onClick={() => setPagina(p => p + 1)}
              class="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Siguiente
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)}
        title={selected ? `Auditoría #${selected.id}` : ''}>
        {selected && (
          <div class="space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div><span class="text-slate-500">Acción:</span> <span class="font-medium">{selected.accion}</span></div>
              <div><span class="text-slate-500">Entidad:</span> <span class="font-medium">{selected.entidad}</span></div>
              <div><span class="text-slate-500">Descripción:</span> <span class="font-medium">{selected.entidad_nombre ?? `#${selected.entidad_id}`}</span></div>
              <div><span class="text-slate-500">Entidad ID:</span> <span class="font-mono text-[10px]">{selected.entidad_id}</span></div>
              <div><span class="text-slate-500">Usuario:</span> <span class="font-medium">{selected.usuario_nombre ?? '—'}</span></div>
              <div><span class="text-slate-500">Usuario ID:</span> <span class="font-mono text-[10px]">{selected.usuario_id ?? '—'}</span></div>
              <div><span class="text-slate-500">IP:</span> <span class="font-medium">{selected.ip ?? '—'}</span></div>
              <div class="col-span-2"><span class="text-slate-500">User Agent:</span> <span class="font-medium text-xs">{selected.user_agent ?? '—'}</span></div>
              <div class="col-span-2"><span class="text-slate-500">Fecha:</span> <span class="font-medium">{formatDate(selected.created_at)}</span></div>
            </div>
            {selected.datos_previos && (
              <div>
                <h4 class="text-sm font-semibold text-slate-700 mb-1">Datos previos</h4>
                <pre class="bg-slate-50 p-3 rounded text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">{formatJSON(selected.datos_previos)}</pre>
              </div>
            )}
            {selected.datos_nuevos && (
              <div>
                <h4 class="text-sm font-semibold text-slate-700 mb-1">Datos nuevos</h4>
                <pre class="bg-slate-50 p-3 rounded text-xs font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">{formatJSON(selected.datos_nuevos)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
