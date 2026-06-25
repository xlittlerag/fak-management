import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';

interface Inscripcion {
  id: number;
  evento_id: number;
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
  evento: { id: number; tipo: string; fecha_inicio: string };
}

export default function MisInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInscripciones();
  }, []);

  const fetchInscripciones = async () => {
    try {
      const res = await api.get('/mis-inscripciones');
      setInscripciones(res.data);
    } catch {
      setError('Error al cargar inscripciones');
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async (inscripcionId: number) => {
    setPayingId(inscripcionId);
    try {
      const res = await api.post(`/inscripciones/${inscripcionId}/pagar`);
      if (res.data.gratuito) {
        fetchInscripciones();
        return;
      }
      const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: res.data.preferenceId },
        render: { container: `#mp-checkout-${inscripcionId}`, label: 'Pagar' },
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar el pago';
      alert(typeof msg === 'string' ? msg : msg[0]);
    } finally {
      setPayingId(null);
    }
  };

  function estadoLabel(estado: string) {
    const labels: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      APROBADO: 'Aprobado',
      RECHAZADO: 'Rechazado',
    };
    return labels[estado] || estado;
  }

  if (loading) return <div class="p-8 text-slate-400">Cargando...</div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Mis Inscripciones</h2>

      {inscripciones.length === 0 ? (
        <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 text-center text-slate-500">
          No se ha inscripto a ningún evento.
        </div>
      ) : (
        <div class="grid gap-4">
          {inscripciones.map(ins => (
            <div key={ins.id} class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-semibold text-slate-900">{ins.evento?.tipo || 'Evento'}</h3>
                  <p class="text-sm text-slate-500">
                    {ins.evento?.fecha_inicio ? new Date(ins.evento.fecha_inicio).toLocaleDateString('es-AR') : ''}
                  </p>
                  {ins.evento?.tipo === 'EXAMEN' && ins.disciplinas && ins.disciplinas.length > 0 && (
                    <p class="text-sm text-slate-500">Disciplinas: {ins.disciplinas.join(', ')}</p>
                  )}
                  <p class="text-sm text-slate-500 mt-1">{ins.evento?.tipo === 'EXAMEN' ? 'Graduaciones' : 'Categoría'}: {(ins.categorias || []).join(', ') || 'General'}</p>
                </div>
                <div class="text-right">
                  <span class={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    ins.estado_aprob === 'APROBADO' ? 'bg-green-50 text-green-700' :
                    ins.estado_aprob === 'RECHAZADO' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {estadoLabel(ins.estado_aprob)}
                  </span>
                  <span class={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    ins.pagado ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ins.pagado ? 'Pagado' : 'No pagado'}
                  </span>
                </div>
              </div>
              {ins.estado_aprob === 'APROBADO' && !ins.pagado && (
                <div class="mt-4" id={`mp-checkout-${ins.id}`}>
                  <button
                    onClick={() => handlePagar(ins.id)}
                    disabled={payingId === ins.id}
                    class="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                  >
                    {payingId === ins.id ? 'Procesando...' : 'Pagar inscripción'}
                  </button>
                </div>
              )}
              {ins.estado_aprob === 'RECHAZADO' && (
                <p class="mt-2 text-sm text-red-600">Su inscripción fue rechazada.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
