import { useState, useEffect, useCallback } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GRADUACIONES, SEXOS } from '../constants';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { Pagination } from '../components/Pagination';
import { getErrorMessage } from '../lib/error';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  sexo: string;
  fecha_nacimiento: string;
  calle_altura: string;
  piso_depto: string;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  rol: string;
  estado_reg: string;
  estado_pago: boolean;
  grad_kendo: string;
  f_grad_kendo: string;
  grad_iaido: string;
  f_grad_iaido: string;
  grad_jodo: string;
  f_grad_jodo: string;
  asociacion: { nombre: string };
  dojo: { nombre: string };
}

interface UserPending {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  asociacion: { nombre: string };
}

interface GradForm {
  grad_kendo: string; f_grad_kendo: string;
  grad_iaido: string; f_grad_iaido: string;
  grad_jodo: string; f_grad_jodo: string;
}

export default function Usuarios() {
  const [tab, setTab] = useState<'listado' | 'pendientes'>('listado');

  return (
    <div class="space-y-4">
      <div class="flex gap-1 bg-paper p-1 rounded-lg w-fit">
        <button onClick={() => setTab('listado')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'listado' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
          Listado
        </button>
        <button onClick={() => setTab('pendientes')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'pendientes' ? 'bg-surface text-ink shadow-sm' : 'text-steel hover:text-ink'}`}>
          Pendientes de aprobación
        </button>
      </div>
      {tab === 'listado' ? <ListadoMiembros /> : <PendientesAprobacion />}
    </div>
  );
}

function ListadoMiembros() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [gradForm, setGradForm] = useState<GradForm>({
    grad_kendo: '', f_grad_kendo: '',
    grad_iaido: '', f_grad_iaido: '',
    grad_jodo: '', f_grad_jodo: '',
  });
  const [bajaUser, setBajaUser] = useState<User | null>(null);
  const [bajaMotivo, setBajaMotivo] = useState('');

  const PAGE_SIZE = 50;
  const hasMore = users.length >= PAGE_SIZE;
  const filteredUsers = search
    ? users.filter(u =>
        `${u.nombre} ${u.apellido} ${u.dni}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(`/usuarios?skip=${page * PAGE_SIZE}&take=${PAGE_SIZE}`);
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateRol = async (id: number, rol: string) => {
    try {
      await api.patch(`/usuarios/${id}/rol`, { rol });
      fetchUsers();
    } catch {
      setError('Error al actualizar el rol');
    }
  };

  const startEditGrad = (user: User) => {
    setGradForm({
      grad_kendo: user.grad_kendo || 'SIN_GRADUACION',
      f_grad_kendo: user.f_grad_kendo ? user.f_grad_kendo.split('T')[0] : '',
      grad_iaido: user.grad_iaido || 'SIN_GRADUACION',
      f_grad_iaido: user.f_grad_iaido ? user.f_grad_iaido.split('T')[0] : '',
      grad_jodo: user.grad_jodo || 'SIN_GRADUACION',
      f_grad_jodo: user.f_grad_jodo ? user.f_grad_jodo.split('T')[0] : '',
    });
    setEditingUser(user);
  };

  const handleSaveGrad = async () => {
    if (!editingUser) return;
    try {
      await api.patch(`/usuarios/${editingUser.id}/graduacion`, gradForm);
      setEditingUser(null);
      fetchUsers();
    } catch {
      setError('Error al actualizar graduación');
    }
  };

  const handleSolicitarBaja = async () => {
    if (!bajaUser) return;
    try {
      await api.post(`/afiliaciones/baja/${bajaUser.id}`, { motivo: bajaMotivo || undefined });
      setBajaUser(null);
      setBajaMotivo('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getGradLabel = (val: string) => {
    return GRADUACIONES.find(g => g.value === val)?.label || val;
  };

  const getSexoLabel = (val: string) => {
    return SEXOS.find(s => s.value === val)?.label || val;
  };

  if (loading) return <Spinner />;
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  const isAdminGeneral = currentUser?.rol === 'ADMIN_GENERAL';
  const isAdminAsociacion = currentUser?.rol === 'ADMIN_ASOCIACION';

  return (
    <>
      <div class="mb-4">
        <input
          type="text"
          value={search}
          onInput={(e: Event) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Buscar por nombre, apellido o DNI..."
          class="w-full max-w-md px-4 py-2 border border-steel-soft rounded text-sm focus:outline-none focus:ring-2 focus:ring-ai/20"
        />
      </div>
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div class="p-8 text-center text-steel">No se encontraron usuarios.</div>
        ) : (
        <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-paper border-b border-steel-soft text-steel uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario</th>
              <th class="px-4 py-2">Dojo</th>
              <th class="px-4 py-2">K/I/J</th>
              <th class="px-4 py-2">Rol</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-steel-soft/60">
            {filteredUsers.map(user => (
              <tr key={user.id} class="hover:bg-ai-soft/50">
                <td class="px-4 py-2 font-medium">{user.nombre} {user.apellido}<div class="text-[10px] text-steel">{user.dni}</div></td>
                <td class="px-4 py-2 text-steel">{user.dojo?.nombre || '-'}</td>
                <td class="px-4 py-2 font-mono text-[10px]">
                  K: {getGradLabel(user.grad_kendo)}<br/>I: {getGradLabel(user.grad_iaido)}<br/>J: {getGradLabel(user.grad_jodo)}
                </td>
                <td class="px-4 py-2">
                  <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tighter ${
                    user.rol === 'ADMIN_GENERAL' ? 'bg-purple-100 text-purple-700' :
                    user.rol === 'ADMIN_ASOCIACION' ? 'bg-ai-soft text-ai' :
                    'bg-paper text-ink'
                  }`}>
                    {user.rol.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <div class="flex flex-col items-end gap-2">
                    <button onClick={() => setViewingUser(user)} class="text-steel hover:underline">Ver Perfil</button>
                    {isAdminGeneral && <button onClick={() => startEditGrad(user)} class="text-ai hover:underline">Editar Grad.</button>}
                    {isAdminGeneral && user.estado_reg === 'APROBADO' && (
                      user.rol === 'BASICO' ? (
                        <button onClick={() => handleUpdateRol(user.id, 'ADMIN_ASOCIACION')} class="text-ai hover:underline font-bold">Hacer Admin</button>
                      ) : (
                        <button onClick={() => handleUpdateRol(user.id, 'BASICO')} class="text-warning hover:underline font-bold">Quitar Admin</button>
                      )
                    )}
                    {isAdminAsociacion && user.estado_reg === 'APROBADO' && user.rol === 'BASICO' && (
                      <button onClick={() => { setBajaUser(user); setBajaMotivo(''); }} class="text-hinomaru hover:underline font-bold">Solicitar baja</button>
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

      <div class="mt-4">
        <Pagination page={page} hasNext={hasMore} onPageChange={setPage} />
      </div>

      {viewingUser !== null && (
        <Modal isOpen={true} onClose={() => setViewingUser(null)}
          title="Perfil del Usuario"
          subtitle={`${viewingUser.nombre} ${viewingUser.apellido}`}>
          <div class="space-y-4 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div><span class="text-steel text-[10px] uppercase font-semibold">DNI</span><p class="font-medium font-mono">{viewingUser.dni}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Email</span><p class="font-medium">{viewingUser.email}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Sexo Registral</span><p class="font-medium">{getSexoLabel(viewingUser.sexo)}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Fecha Nac.</span><p class="font-medium">{viewingUser.fecha_nacimiento ? new Date(viewingUser.fecha_nacimiento).toLocaleDateString('es-AR') : '-'}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Asociación</span><p class="font-medium">{viewingUser.asociacion?.nombre || '-'}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Dojo</span><p class="font-medium">{viewingUser.dojo?.nombre || '-'}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Domicilio Real</span><p class="font-medium">{viewingUser.calle_altura}{viewingUser.piso_depto ? ` - ${viewingUser.piso_depto}` : ''}{viewingUser.ciudad ? `, ${viewingUser.ciudad}` : ''}</p></div>
              <div><span class="text-steel text-[10px] uppercase font-semibold">Estado</span><p class="font-medium">{viewingUser.estado_pago ? 'Cuota al día' : 'Cuota pendiente'}</p></div>
            </div>
            <div class="border-t border-steel-soft pt-4">
              <span class="text-steel text-[10px] uppercase font-semibold">Graduaciones</span>
              <div class="flex flex-wrap gap-2 mt-2">
                {viewingUser.grad_kendo !== 'SIN_GRADUACION' && <span class="bg-warning-soft text-warning px-3 py-1 rounded-full text-xs font-medium">Kendo: {getGradLabel(viewingUser.grad_kendo)}</span>}
                {viewingUser.grad_iaido !== 'SIN_GRADUACION' && <span class="bg-ai-soft text-ai px-3 py-1 rounded-full text-xs font-medium">Iaido: {getGradLabel(viewingUser.grad_iaido)}</span>}
                {viewingUser.grad_jodo !== 'SIN_GRADUACION' && <span class="bg-success-soft text-success px-3 py-1 rounded-full text-xs font-medium">Jodo: {getGradLabel(viewingUser.grad_jodo)}</span>}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editingUser !== null && (
        <Modal isOpen={true} onClose={() => setEditingUser(null)}
          title="Editar graduaciones"
          subtitle={`${editingUser.nombre} ${editingUser.apellido}`}>
          <div class="space-y-6">
            {(['kendo', 'iaido', 'jodo'] as const).map(disc => (
              <div key={disc} class="bg-paper p-4 rounded-lg border border-steel-soft">
                <label class="block text-xs font-bold text-steel uppercase tracking-wider mb-3">{disc}</label>
                <div class="grid grid-cols-1 gap-3">
                  <select value={gradForm[`grad_${disc}` as keyof GradForm]}
                    onChange={(e: Event) => setGradForm({...gradForm, [`grad_${disc}`]: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-steel-soft rounded-md shadow-sm focus:border-ai focus:ring-ai/20 p-2">
                    {GRADUACIONES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <input type="date" value={gradForm[`f_grad_${disc}` as keyof GradForm]}
                    onInput={(e: Event) => setGradForm({...gradForm, [`f_grad_${disc}`]: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-steel-soft rounded-md shadow-sm focus:border-ai focus:ring-ai/20 p-2" />
                </div>
              </div>
            ))}
            <div class="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)}
                class="w-full bg-paper text-ink py-2 rounded-md font-medium hover:bg-ai-soft transition-colors">Cancelar</button>
              <button onClick={handleSaveGrad}
                class="w-full bg-ai text-white py-2 rounded-md font-medium hover:bg-ai-strong transition-colors">Guardar</button>
            </div>
          </div>
        </Modal>
      )}

      {bajaUser && (
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-surface rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 class="text-lg font-bold text-ink mb-4">Solicitar baja de socio</h3>
            <p class="text-sm text-steel mb-4">¿Desea solicitar la baja de <strong>{bajaUser.nombre} {bajaUser.apellido}</strong>? La solicitud quedará pendiente de aprobación de la federación.</p>
            <div class="mb-4">
              <label htmlFor="usuarios-baja-motivo" class="block text-sm font-medium text-ink mb-1">Motivo (opcional)</label>
              <textarea
                id="usuarios-baja-motivo"
                value={bajaMotivo}
                onInput={(e: Event) => setBajaMotivo((e.target as HTMLTextAreaElement).value)}
                rows={3}
                class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              />
            </div>
            <div class="flex gap-3">
              <button onClick={() => setBajaUser(null)} class="w-full bg-paper text-ink py-2 rounded-md font-medium hover:bg-ai-soft transition-colors">Cancelar</button>
              <button onClick={handleSolicitarBaja} class="w-full bg-hinomaru text-white py-2 rounded-md font-medium hover:bg-hinomaru/90 transition-colors">Solicitar baja</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PendientesAprobacion() {
  const [users, setUsers] = useState<UserPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/usuarios/pendientes');
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAction = async (id: number, accion: 'APROBAR' | 'RECHAZAR') => {
    try {
      await api.patch(`/usuarios/${id}/aprobacion`, { accion });
      setUsers(users.filter(u => u.id !== id));
    } catch {
      setError('Error al procesar la acción');
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando usuarios pendientes..." /></div>;
  if (error) return <div class="p-8 text-hinomaru">{error}</div>;

  return (
    <div class="bg-surface rounded-lg shadow-sm border border-steel-soft overflow-hidden">
      <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-paper border-b border-steel-soft text-steel text-sm uppercase tracking-wider font-semibold">
          <tr>
            <th class="px-6 py-4">Usuario / DNI</th>
            <th class="px-6 py-4">Correo Electrónico</th>
            <th class="px-6 py-4">Asociación</th>
            <th class="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-steel-soft/60">
          {users.length === 0 ? (
            <tr><td colspan={4} class="px-6 py-8 text-center text-steel">No hay usuarios pendientes de aprobación.</td></tr>
          ) : (
            users.map(user => (
              <tr key={user.id} class="hover:bg-ai-soft/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-medium text-ink">{user.nombre} {user.apellido}</div>
                  <div class="text-xs text-steel font-mono">{user.dni}</div>
                </td>
                <td class="px-6 py-4 text-sm">{user.email}</td>
                <td class="px-6 py-4 text-sm text-steel">{user.asociacion.nombre}</td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleAction(user.id, 'APROBAR')}
                    class="px-3 py-1 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors">Aprobar</button>
                  <button onClick={() => handleAction(user.id, 'RECHAZAR')}
                    class="px-3 py-1 bg-surface border border-steel-soft text-ink rounded text-sm font-medium hover:bg-ai-soft/50 transition-colors">Rechazar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
