import { useState, useEffect } from 'preact/hooks';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import { GRADUACIONES } from '../constants';

const DISCIPLINA_LABELS: Record<string, string> = {
  KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO_ASOCIACION: 'Aprobado (Asociación)',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
};

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APROBADO_ASOCIACION: 'bg-blue-50 text-blue-700 border-blue-200',
  APROBADO: 'bg-green-50 text-green-700 border-green-200',
  RECHAZADO: 'bg-red-50 text-red-700 border-red-200',
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

  const fetchData = () => {
    setLoading(true);
    api.get('/certificados')
      .then(res => setCertificados(res.data))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

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

  if (loading) return <div class="text-slate-400">Cargando certificaciones pendientes...</div>;
  if (error) return <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>;

  return (
    <div class="space-y-6">
      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg === 'Estado actualizado correctamente'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {msg}
        </div>
      )}

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="font-semibold text-slate-800">Certificaciones Externas</h3>
        </div>
        {certificados.length === 0 ? (
          <div class="px-6 py-8 text-center text-slate-400">No hay certificaciones registradas.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
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
                {certificados.map(c => (
                  <tr key={c.id} class="border-b border-slate-100 hover:bg-slate-50">
                    <td class="px-4 py-2 font-medium">{c.usuario.nombre} {c.usuario.apellido}</td>
                    <td class="px-4 py-2 text-slate-500">{c.usuario.dni}</td>
                    <td class="px-4 py-2">{DISCIPLINA_LABELS[c.disciplina] || c.disciplina}</td>
                    <td class="px-4 py-2">{GRADUACIONES.find(g => g.value === c.grad_solicitada)?.label || c.grad_solicitada}</td>
                    <td class="px-4 py-2">
                      <span class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${ESTADO_COLORS[c.estado] || ''}`}>
                        {ESTADO_LABELS[c.estado] || c.estado}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-slate-500">{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                    <td class="px-4 py-2">
                      <a href={c.url_archivo} target="_blank" class="text-slate-600 hover:text-slate-900 underline">
                        Ver PDF
                      </a>
                    </td>
                    <td class="px-4 py-2">
                      <div class="flex gap-1">
                        {c.estado === 'PENDIENTE' && isAdminAsociacion && (
                          <>
                            <button
                              onClick={() => handleAction(c.id, 'aprobar-asociacion')}
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleAction(c.id, 'rechazar')}
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {c.estado === 'APROBADO_ASOCIACION' && isAdminGeneral && (
                          <>
                            <button
                              onClick={() => handleAction(c.id, 'aprobar-general')}
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              Aprobar Definitivamente
                            </button>
                            <button
                              onClick={() => handleAction(c.id, 'rechazar')}
                              disabled={processing === c.id}
                              class="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {c.estado === 'APROBADO' && (
                          <span class="text-[10px] text-green-600 font-medium">Completado</span>
                        )}
                        {c.estado === 'RECHAZADO' && (
                          <span class="text-[10px] text-red-600 font-medium">Rechazado</span>
                        )}
                        {c.estado === 'PENDIENTE' && isAdminGeneral && (
                          <span class="text-[10px] text-slate-400">Esperando aprobación de asociación</span>
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
    </div>
  );
}
