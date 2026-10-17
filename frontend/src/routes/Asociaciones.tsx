import { useState, useEffect } from 'preact/hooks';
import { Fragment } from 'preact';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import api from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { getErrorMessage } from '../lib/error';

interface Dojo {
  id: number;
  nombre: string;
}

interface Asociacion {
  id: number;
  nombre: string;
  dojos?: Dojo[];
}

export default function Asociaciones() {
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newDojoNombre, setNewDojoNombre] = useState('');
  const [editingDojoId, setEditingDojoId] = useState<number | null>(null);
  const [editingDojoNombre, setEditingDojoNombre] = useState('');
  const [confirmDeleteDojo, setConfirmDeleteDojo] = useState<number | null>(null);

  const [editing, setEditing] = useState<Asociacion | null | undefined>(undefined);
  const [formNombre, setFormNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const fetchAsociaciones = async () => {
    try {
      const res = await api.get('/asociaciones');
      const assocData = await Promise.all(res.data.map(async (a: Asociacion) => {
        const dojosRes = await api.get(`/dojos/asociacion/${a.id}`);
        return { ...a, dojos: dojosRes.data };
      }));
      setAsociaciones(assocData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsociaciones();
  }, []);

  const handleCreateDojo = async (asociacion_id: number) => {
    if (!newDojoNombre.trim()) return;
    try {
      await api.post('/dojos', { nombre: newDojoNombre, asociacion_id });
      setNewDojoNombre('');
      fetchAsociaciones();
    } catch {
      setError('Error al crear dojo');
    }
  };

  const handleUpdateDojo = async (id: number) => {
    try {
      await api.patch(`/dojos/${id}`, { nombre: editingDojoNombre });
      setEditingDojoId(null);
      fetchAsociaciones();
    } catch {
      setError('Error al actualizar dojo');
    }
  };

  const handleDeleteDojo = async (id: number) => {
    try {
      await api.delete(`/dojos/${id}`);
      fetchAsociaciones();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openCreate = () => {
    setFormNombre('');
    setEditing(null);
  };

  const openEdit = (a: Asociacion) => {
    setFormNombre(a.nombre);
    setEditing(a);
  };

  const handleSave = async () => {
    if (!formNombre.trim()) return;
    setSaving(true);
    setMsg('');
    try {
      if (editing === null) {
        await api.post('/asociaciones', { nombre: formNombre.trim() });
        setMsg('Asociación creada correctamente');
      } else if (editing) {
        await api.patch(`/asociaciones/${editing.id}`, { nombre: formNombre.trim() });
        setMsg('Asociación actualizada correctamente');
      }
      setEditing(undefined);
      setFormNombre('');
      await fetchAsociaciones();
    } catch (err) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteId === null) return;
    try {
      await api.delete(`/asociaciones/${confirmDeleteId}`);
      setMsg('Asociación eliminada correctamente');
      setConfirmDeleteId(null);
      await fetchAsociaciones();
    } catch (err) {
      setMsg(getErrorMessage(err));
      setConfirmDeleteId(null);
    }
  };

  if (loading) return <Spinner text="Cargando asociaciones..." />;
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="space-y-6">
      {msg && (
        <div class={`px-4 py-3 rounded text-sm border ${
          msg === 'Asociación creada correctamente'
          || msg === 'Asociación actualizada correctamente'
          || msg === 'Asociación eliminada correctamente'
            ? 'bg-success-soft border-success/20 text-success'
            : 'bg-hinomaru-soft border-hinomaru/20 text-hinomaru'
        }`}>
          {msg}
        </div>
      )}

      <div class="flex justify-end">
        <button
          onClick={openCreate}
          class="px-4 py-2 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong transition-colors"
        >
          Crear Asociación
        </button>
      </div>

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        {asociaciones.length === 0 ? (
          <div class="px-6 py-8 text-center text-steel">No hay asociaciones registradas.</div>
        ) : (
          <table class="w-full text-left border-collapse">
            <thead class="bg-paper border-b border-steel-soft text-steel text-sm font-semibold">
              <tr>
                <th class="px-6 py-4">Nombre Asociación</th>
                <th class="px-6 py-4">Dojos</th>
                <th class="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-steel-soft/60">
              {asociaciones.map(a => (
                <Fragment key={a.id}>
                  <tr class="hover:bg-ai-soft/50 transition-colors">
                    <td class="px-6 py-4 font-medium text-ink">{a.nombre}</td>
                    <td class="px-6 py-4 text-sm text-steel">{a.dojos?.length || 0} dojos</td>
                    <td class="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEdit(a)}
                        class="px-3 py-1 bg-paper hover:bg-ai-soft text-ink rounded-full text-xs font-medium transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(a.id)}
                        class="px-3 py-1 bg-hinomaru-soft hover:bg-hinomaru/10 text-hinomaru rounded-full text-xs font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        class="px-3 py-1 bg-paper hover:bg-ai-soft text-ink rounded-full text-xs font-medium transition-colors"
                      >
                        {expanded === a.id ? 'Ocultar Dojos' : 'Gestionar Dojos'}
                      </button>
                    </td>
                  </tr>
                  {expanded === a.id && (
                    <tr class="bg-paper/50">
                      <td colSpan={3} class="px-6 py-4">
                        <div class="space-y-4">
                          <div class="bg-surface p-4 rounded-lg border border-steel-soft shadow-sm">
                              <h5 class="text-xs font-bold text-steel uppercase mb-3">Dojos vinculados</h5>
                              <ul class="space-y-2">
                              {a.dojos?.map(d => (
                                  <li key={d.id} class="flex items-center justify-between text-sm text-ink bg-paper p-2 rounded border border-steel-soft">
                                  {editingDojoId === d.id ? (
                                      <input
                                      id={`editar-dojo-${d.id}`}
                                      aria-label="Nombre del dojo"
                                      value={editingDojoNombre}
                                      onInput={(e: Event) => setEditingDojoNombre((e.target as HTMLInputElement).value)}
                                      class="text-sm px-2 py-1 border border-steel-soft rounded flex-1 mr-2"
                                      />
                                  ) : <span class="font-medium">{d.nombre}</span>}

                                  <div class="flex gap-2">
                                      {editingDojoId === d.id ? (
                                      <button onClick={() => handleUpdateDojo(d.id)} class="text-ai hover:underline text-xs font-bold px-2 py-1 bg-ai-soft rounded">Guardar</button>
                                      ) : (
                                      <button onClick={() => {setEditingDojoId(d.id); setEditingDojoNombre(d.nombre);}} class="text-steel hover:underline text-xs px-2 py-1 bg-paper rounded">Editar</button>
                                      )}
                                      <button onClick={() => setConfirmDeleteDojo(d.id)} class="text-hinomaru hover:underline text-xs px-2 py-1 bg-hinomaru-soft rounded">Eliminar</button>
                                  </div>
                                  </li>
                              ))}
                              </ul>
                          </div>

                          <div class="flex gap-2 items-center bg-surface p-3 rounded-lg border border-steel-soft">
                            <input
                              id={`nuevo-dojo-${a.id}`}
                              aria-label="Nombre del nuevo dojo"
                              placeholder="Nombre del nuevo dojo..."
                              value={newDojoNombre}
                              onInput={(e: Event) => setNewDojoNombre((e.target as HTMLInputElement).value)}
                              class="text-sm px-3 py-1.5 border border-steel-soft rounded flex-1"
                            />
                            <button
                              onClick={() => handleCreateDojo(a.id)}
                              class="px-4 py-1.5 bg-ai text-white rounded text-xs font-bold hover:bg-ai-strong"
                            >
                              Añadir Dojo
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={editing !== undefined}
        onClose={() => { setEditing(undefined); setMsg(''); }}
        title={editing === null ? 'Crear Asociación' : 'Editar Asociación'}
        subtitle={editing ? editing.nombre : undefined}
      >
        <div class="space-y-4">
          <div>
            <label htmlFor="asociacion-nombre" class="block text-sm font-medium text-ink mb-1">Nombre</label>
            <input
              id="asociacion-nombre"
              value={formNombre}
              onInput={(e: Event) => setFormNombre((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              placeholder="Nombre de la asociación"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              onClick={() => { setEditing(undefined); setMsg(''); }}
              class="px-4 py-2 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formNombre.trim()}
              class="px-4 py-2 bg-ai text-white rounded text-sm font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {confirmDeleteId !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={handleDelete}
          title="Eliminar asociación"
          message="¿Está seguro de eliminar esta asociación? No se podrá eliminar si tiene dojos activos."
          confirmText="Eliminar"
          danger
        />
      )}

      {confirmDeleteDojo !== null && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmDeleteDojo(null)}
          onConfirm={() => handleDeleteDojo(confirmDeleteDojo)}
          title="Eliminar dojo"
          message="¿Está seguro de eliminar este dojo?"
          confirmText="Eliminar"
          danger
        />
      )}
    </div>
  );
}
