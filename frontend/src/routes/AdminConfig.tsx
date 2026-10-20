import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { GRADUACIONES } from '../constants';
import { ConfirmModal } from '../components/ConfirmModal';
import { getErrorMessage } from '../lib/error';

export default function AdminConfig() {
  return (
    <div class="space-y-8">
      <ConfigCuota />
      <ConfigPreciosExamen />
      <ConfigReimpresion />
      <ConfigFakEmail />
    </div>
  );
}

function ConfigFakEmail() {
  const [fakEmail, setFakEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get('/afiliaciones/config')
      .then((res) => setFakEmail(res.data.fak_email || ''))
      .catch(() => setMsg('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/afiliaciones/config', {
        fak_email: fakEmail.trim() || null,
      });
      setMsg('Email de la federación actualizado correctamente');
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-steel">Cargando configuración...</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
      <h3 class="text-base font-bold text-ink mb-6">Email de la Federación</h3>

      {msg && (
        <div
          class={`px-4 py-3 rounded text-sm border mb-4 ${
            msg === 'Email de la federación actualizado correctamente'
              ? 'bg-success-soft border-success/20 text-success'
              : 'bg-hinomaru-soft border-hinomaru/20 text-hinomaru'
          }`}
        >
          {msg}
        </div>
      )}

      <p class="text-sm text-steel mb-4">
        Recibe las notificaciones de solicitudes de baja de socios y altas
        registradas.
      </p>

      <div class="max-w-md space-y-4">
        <div>
          <label
            htmlFor="config-fak-email"
            class="block text-sm font-medium text-ink mb-1"
          >
            Correo electrónico
          </label>
          <input
            id="config-fak-email"
            type="email"
            value={fakEmail}
            onInput={(e: Event) =>
              setFakEmail((e.target as HTMLInputElement).value)
            }
            placeholder="presidente@kendoargentina.org"
            class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          class="bg-ai text-white py-2 px-6 rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function ConfigCuota() {
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api
      .get('/admin/fee')
      .then((res) => {
        if (res.data) {
          setMonto(String(res.data.monto_actual));
          setFecha(
            res.data.fecha_vencimiento
              ? res.data.fecha_vencimiento.split('T')[0]
              : '',
          );
        }
      })
      .catch(() => setError('No se pudo cargar la configuración actual'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.patch('/admin/fee', {
        monto_actual: parseFloat(monto),
        fecha_vencimiento: new Date(fecha).toISOString(),
      });
      setSuccess('Cuota actualizada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div class="text-steel">Cargando cuota...</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
      <h3 class="text-base font-bold text-ink mb-6">Cuota Federativa</h3>

      {error && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div class="bg-success-soft border border-success/20 text-success px-4 py-3 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} class="max-w-md space-y-4">
        <div>
          <label
            htmlFor="config-cuota-monto"
            class="block text-sm font-medium text-ink mb-1"
          >
            Monto actual ($)
          </label>
          <input
            id="config-cuota-monto"
            type="number"
            step="0.01"
            min="0"
            required
            value={monto}
            onInput={(e: Event) =>
              setMonto((e.currentTarget as HTMLInputElement).value)
            }
            class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
          />
        </div>
        <div>
          <label
            htmlFor="config-cuota-fecha"
            class="block text-sm font-medium text-ink mb-1"
          >
            Fecha de vencimiento
          </label>
          <input
            id="config-cuota-fecha"
            type="date"
            required
            value={fecha}
            onInput={(e: Event) =>
              setFecha((e.currentTarget as HTMLInputElement).value)
            }
            class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          class="bg-ai text-white py-2 px-6 rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

function ConfigPreciosExamen() {
  interface PrecioExamen {
    id: number;
    graduacion: string;
    costo_inscripcion: number;
    costo_registro: number;
  }

  const GRAD_EXAMEN = GRADUACIONES.filter((g) => g.value !== 'SIN_GRADUACION');
  const GRAD_LABELS: Record<string, string> = {};
  GRADUACIONES.forEach((g) => {
    GRAD_LABELS[g.value] = g.label;
  });

  const [precios, setPrecios] = useState<PrecioExamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PrecioExamen | null>(null);
  const [newGraduacion, setNewGraduacion] = useState('');
  const [newCostoIns, setNewCostoIns] = useState('');
  const [newCostoReg, setNewCostoReg] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDeletePrice, setConfirmDeletePrice] = useState<number | null>(
    null,
  );

  const fetchPrecios = async () => {
    try {
      const res = await api.get('/precios-examen');
      setPrecios(res.data);
    } catch {
      setError('Error al cargar precios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrecios();
  }, []);

  const handleAdd = async () => {
    if (!newGraduacion || !newCostoIns || !newCostoReg) return;
    setError('');
    try {
      await api.post('/precios-examen', {
        graduacion: newGraduacion,
        costo_inscripcion: Number(newCostoIns),
        costo_registro: Number(newCostoReg),
      });
      setNewGraduacion('');
      setNewCostoIns('');
      setNewCostoReg('');
      setAdding(false);
      fetchPrecios();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleUpdate = async () => {
    if (!editing || !newCostoIns || !newCostoReg) return;
    setError('');
    try {
      await api.patch(`/precios-examen/${editing.id}`, {
        costo_inscripcion: Number(newCostoIns),
        costo_registro: Number(newCostoReg),
      });
      setEditing(null);
      setNewCostoIns('');
      setNewCostoReg('');
      fetchPrecios();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDeletePrice = async (id: number) => {
    try {
      await api.delete(`/precios-examen/${id}`);
      fetchPrecios();
    } catch {
      setError('Error al eliminar precio');
    }
  };

  if (loading)
    return <div class="text-steel">Cargando precios de exámenes...</div>;

  const disponibles = GRAD_EXAMEN.filter(
    (g) => !precios.find((p) => p.graduacion === g.value),
  );

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 class="text-fluid-lg font-bold text-ink">Precios de Exámenes</h3>
        <button
          onClick={() => {
            setAdding(true);
            setNewGraduacion(disponibles[0]?.value || '');
            setNewCostoIns('');
            setNewCostoReg('');
          }}
          disabled={disponibles.length === 0}
          class="rounded bg-ai px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ai-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar Precio
        </button>
      </div>

      {error && (
        <div class="bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Graduación</th>
              <th class="px-4 py-2">Inscripción</th>
              <th class="px-4 py-2">Registro</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {precios.map((p) => (
              <tr key={p.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">
                  {GRAD_LABELS[p.graduacion] || p.graduacion}
                </td>
                <td class="px-4 py-2">
                  {editing?.id === p.id ? (
                    <input
                      type="number"
                      value={newCostoIns}
                      aria-label="Costo de inscripción"
                      onInput={(e: Event) =>
                        setNewCostoIns((e.target as HTMLInputElement).value)
                      }
                      class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1 sm:w-28"
                    />
                  ) : (
                    `$${p.costo_inscripcion.toLocaleString('es-AR')}`
                  )}
                </td>
                <td class="px-4 py-2">
                  {editing?.id === p.id ? (
                    <input
                      type="number"
                      value={newCostoReg}
                      aria-label="Costo de registro"
                      onInput={(e: Event) =>
                        setNewCostoReg((e.target as HTMLInputElement).value)
                      }
                      class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1 sm:w-28"
                    />
                  ) : (
                    `$${p.costo_registro.toLocaleString('es-AR')}`
                  )}
                </td>
                <td class="px-4 py-2 text-right space-x-2">
                  {editing?.id === p.id ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        class="text-success hover:underline"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditing(null);
                          setNewCostoIns('');
                          setNewCostoReg('');
                        }}
                        class="text-steel hover:underline"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditing(p);
                          setNewCostoIns(String(p.costo_inscripcion));
                          setNewCostoReg(String(p.costo_registro));
                        }}
                        class="text-ai hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeletePrice(p.id)}
                        class="text-hinomaru hover:underline"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {adding && (
              <tr class="bg-paper">
                <td class="px-4 py-2">
                  <select
                    value={newGraduacion}
                    aria-label="Graduación"
                    onChange={(e: Event) =>
                      setNewGraduacion((e.target as HTMLSelectElement).value)
                    }
                    class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1"
                  >
                    {disponibles.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td class="px-4 py-2">
                  <input
                    type="number"
                    value={newCostoIns}
                    aria-label="Costo de inscripción"
                    onInput={(e: Event) =>
                      setNewCostoIns((e.target as HTMLInputElement).value)
                    }
                    class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1 sm:w-28"
                  />
                </td>
                <td class="px-4 py-2">
                  <input
                    type="number"
                    value={newCostoReg}
                    aria-label="Costo de registro"
                    onInput={(e: Event) =>
                      setNewCostoReg((e.target as HTMLInputElement).value)
                    }
                    class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1 sm:w-28"
                  />
                </td>
                <td class="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={handleAdd}
                    class="text-success hover:underline"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setNewGraduacion('');
                      setNewCostoIns('');
                      setNewCostoReg('');
                    }}
                    class="text-steel hover:underline"
                  >
                    Cancelar
                  </button>
                </td>
              </tr>
            )}
            {precios.length === 0 && !adding && (
              <tr>
                <td colSpan={4} class="px-4 py-8 text-center text-steel">
                  No hay precios configurados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmDeletePrice !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDeletePrice(null)}
          onConfirm={() => handleDeletePrice(confirmDeletePrice)}
          title="Eliminar precio"
          message="¿Está seguro de eliminar este precio de examen?"
          confirmText="Eliminar"
          danger
        />
      )}
    </div>
  );
}

function ConfigReimpresion() {
  const [precio, setPrecio] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .get('/admin/diploma/config')
      .then((res) => setPrecio(res.data.precio_reimpresion))
      .catch(() => setMsg('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/admin/diploma/config', { precio_reimpresion: precio });
      setMsg('Precio actualizado correctamente');
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div class="text-steel">Cargando configuración de reimpresión...</div>
    );

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
      <h3 class="text-base font-bold text-ink mb-6">
        Costo de Reimpresión de Diplomas
      </h3>

      {msg && (
        <div
          class={`px-4 py-3 rounded text-sm border mb-4 ${
            msg === 'Precio actualizado correctamente'
              ? 'bg-success-soft border-success/20 text-success'
              : 'bg-hinomaru-soft border-hinomaru/20 text-hinomaru'
          }`}
        >
          {msg}
        </div>
      )}

      <div class="max-w-xs space-y-4">
        <div>
          <label
            htmlFor="config-reimpresion-precio"
            class="block text-sm font-medium text-ink mb-1"
          >
            Precio de reimpresión ($)
          </label>
          <input
            id="config-reimpresion-precio"
            type="number"
            min="0"
            value={precio}
            onInput={(e: Event) =>
              setPrecio(parseFloat((e.target as HTMLInputElement).value) || 0)
            }
            class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          class="bg-ai text-white py-2 px-6 rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
