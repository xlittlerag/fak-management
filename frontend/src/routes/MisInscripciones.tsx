import { useState, useEffect } from 'preact/hooks';
import { Spinner } from '../components/Spinner';
import api from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { getErrorMessage } from '../lib/error';

interface Inscripcion {
  id: number;
  evento_id: number;
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
  pagado_fuera_sistema: boolean;
  necesidades_especiales: boolean;
  descripcion_necesidades: string;
  archivo_medico_url: string;
  evento: { id: number; tipo: string; fecha_inicio: string };
}

export default function MisInscripciones() {
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCats, setEditCats] = useState<string[]>([]);
  const [editNecesidades, setEditNecesidades] = useState(false);
  const [editDescNecesidades, setEditDescNecesidades] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmBaja, setConfirmBaja] = useState<number | null>(null);

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
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: res.data.preferenceId },
        render: { container: `#mp-checkout-${inscripcionId}`, label: 'Pagar' },
      });
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setPayingId(null);
    }
  };

  const startEdit = (ins: Inscripcion) => {
    setEditingId(ins.id);
    setEditCats([...ins.categorias]);
    setEditNecesidades(ins.necesidades_especiales);
    setEditDescNecesidades(ins.descripcion_necesidades || '');
    setEditFile(null);
    setMsg('');
  };

  const handleSaveEdit = async (inscripcionId: number) => {
    setSavingEdit(true);
    try {
      const res = await api.patch(`/inscripciones/${inscripcionId}`, {
        categorias: editCats,
        necesidades_especiales: editNecesidades,
        descripcion_necesidades: editDescNecesidades || undefined,
      });
      setMsg(res.data.mensaje || 'Inscripción modificada');

      if (editFile) {
        const fd = new FormData();
        fd.append('archivo_medico', editFile);
        await api.patch(`/inscripciones/${inscripcionId}/archivo-medico`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setEditingId(null);
      fetchInscripciones();
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBaja = async (inscripcionId: number) => {
    try {
      const res = await api.delete(`/inscripciones/${inscripcionId}`);
      setMsg(res.data.mensaje || 'Se ha dado de baja del evento');
      fetchInscripciones();
    } catch (err) {
      setMsg(getErrorMessage(err));
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

  if (loading) return <Spinner text="Cargando inscripciones..." />;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-800">Mis Inscripciones</h2>

      {msg && (
        <div class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">{msg}</div>
      )}

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

              {editingId === ins.id ? (
                <div class="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Categorías / Graduaciones</label>
                    <input type="text" value={editCats.join(', ')}
                      onInput={(e: Event) => setEditCats((e.target as HTMLInputElement).value.split(',').map(s => s.trim()))}
                      class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" />
                  </div>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" checked={editNecesidades}
                      onChange={(e: Event) => setEditNecesidades((e.target as HTMLInputElement).checked)}
                      class="w-4 h-4" />
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Necesidades especiales</span>
                  </div>
                  {editNecesidades && (
                    <>
                      <textarea value={editDescNecesidades}
                        onInput={(e: Event) => setEditDescNecesidades((e.target as HTMLTextAreaElement).value)}
                        class="w-full text-sm border-slate-300 rounded-md shadow-sm p-2" rows={2}
                        placeholder="Describa la necesidad especial" />
                      <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Certificado médico (PDF/JPG/PNG)</label>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e: Event) => setEditFile((e.target as HTMLInputElement).files?.[0] || null)} class="text-sm" />
                        {editFile && <p class="text-xs text-green-600 mt-1">Archivo seleccionado: {editFile.name}</p>}
                      </div>
                    </>
                  )}
                  <div class="flex gap-2">
                    <button onClick={() => setEditingId(null)}
                      class="px-4 py-1.5 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200">Cancelar</button>
                    <button onClick={() => handleSaveEdit(ins.id)} disabled={savingEdit}
                      class="px-4 py-1.5 bg-slate-900 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                      {savingEdit ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div class="mt-3 flex gap-2">
                  {ins.estado_aprob !== 'RECHAZADO' && (
                    <button onClick={() => startEdit(ins)}
                      class="text-xs text-blue-600 hover:underline">Editar</button>
                  )}
                  {ins.estado_aprob !== 'RECHAZADO' && (
                    <button onClick={() => setConfirmBaja(ins.id)}
                      class="text-xs text-red-600 hover:underline">Darse de baja</button>
                  )}
                </div>
              )}

              {ins.estado_aprob === 'APROBADO' && !ins.pagado && editingId !== ins.id && (
                <div class="mt-4" id={`mp-checkout-${ins.id}`}>
                  <button
                    onClick={() => handlePagar(ins.id)}
                    disabled={payingId === ins.id}
                    class="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
      {confirmBaja !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmBaja(null)}
          onConfirm={() => handleBaja(confirmBaja)}
          title="Darse de baja"
          message="¿Está seguro de darse de baja de este evento?"
          confirmText="Darme de baja"
          danger
        />
      )}
    </div>
  );
}