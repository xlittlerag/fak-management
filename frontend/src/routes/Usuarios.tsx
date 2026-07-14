import { useState, useEffect } from 'preact/hooks';
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
      <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('listado')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'listado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          Listado
        </button>
        <button onClick={() => setTab('pendientes')}
          class={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'pendientes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
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

  const PAGE_SIZE = 50;
  const hasMore = users.length >= PAGE_SIZE;
  const filteredUsers = search
    ? users.filter(u =>
        `${u.nombre} ${u.apellido} ${u.dni}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    try {
      const res = await api.get(`/usuarios?skip=${page * PAGE_SIZE}&take=${PAGE_SIZE}`);
      setUsers(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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

  const getGradLabel = (val: string) => {
    return GRADUACIONES.find(g => g.value === val)?.label || val;
  };

  const getSexoLabel = (val: string) => {
    return SEXOS.find(s => s.value === val)?.label || val;
  };

  if (loading) return <Spinner />;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  const isAdminGeneral = currentUser?.rol === 'ADMIN_GENERAL';

  return (
    <>
      <div class="mb-4">
        <input
          type="text"
          value={search}
          onInput={(e: Event) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Buscar por nombre, apellido o DNI..."
          class="w-full max-w-md px-4 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div class="p-8 text-center text-slate-500">No se encontraron usuarios.</div>
        ) : (
        <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
            <tr>
              <th class="px-4 py-2">Usuario</th>
              <th class="px-4 py-2">Dojo</th>
              <th class="px-4 py-2">K/I/J</th>
              <th class="px-4 py-2">Rol</th>
              <th class="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            {filteredUsers.map(user => (
              <tr key={user.id} class="hover:bg-slate-50">
                <td class="px-4 py-2 font-medium">{user.nombre} {user.apellido}<div class="text-[10px] text-slate-400">{user.dni}</div></td>
                <td class="px-4 py-2 text-slate-600">{user.dojo?.nombre || '-'}</td>
                <td class="px-4 py-2 font-mono text-[10px]">
                  K: {getGradLabel(user.grad_kendo)}<br/>I: {getGradLabel(user.grad_iaido)}<br/>J: {getGradLabel(user.grad_jodo)}
                </td>
                <td class="px-4 py-2">
                  <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tighter ${
                    user.rol === 'ADMIN_GENERAL' ? 'bg-purple-100 text-purple-700' :
                    user.rol === 'ADMIN_ASOCIACION' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.rol.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-4 py-2 text-right">
                  <div class="flex flex-col items-end gap-2">
                    <button onClick={() => setViewingUser(user)} class="text-slate-600 hover:underline">Ver Perfil</button>
                    {isAdminGeneral && <button onClick={() => startEditGrad(user)} class="text-blue-600 hover:underline">Editar Grad.</button>}
                    {isAdminGeneral && user.estado_reg === 'APROBADO' && (
                      user.rol === 'BASICO' ? (
                        <button onClick={() => handleUpdateRol(user.id, 'ADMIN_ASOCIACION')} class="text-indigo-600 hover:underline font-bold">Hacer Admin</button>
                      ) : (
                        <button onClick={() => handleUpdateRol(user.id, 'BASICO')} class="text-amber-600 hover:underline font-bold">Quitar Admin</button>
                      )
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
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">DNI</span><p class="font-medium font-mono">{viewingUser.dni}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Email</span><p class="font-medium">{viewingUser.email}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Sexo Registral</span><p class="font-medium">{getSexoLabel(viewingUser.sexo)}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Fecha Nac.</span><p class="font-medium">{viewingUser.fecha_nacimiento ? new Date(viewingUser.fecha_nacimiento).toLocaleDateString('es-AR') : '-'}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Asociación</span><p class="font-medium">{viewingUser.asociacion?.nombre || '-'}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Dojo</span><p class="font-medium">{viewingUser.dojo?.nombre || '-'}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Domicilio Real</span><p class="font-medium">{viewingUser.calle_altura}{viewingUser.piso_depto ? ` - ${viewingUser.piso_depto}` : ''}{viewingUser.ciudad ? `, ${viewingUser.ciudad}` : ''}</p></div>
              <div><span class="text-slate-500 text-[10px] uppercase font-semibold">Estado</span><p class="font-medium">{viewingUser.estado_pago ? 'Cuota al día' : 'Cuota pendiente'}</p></div>
            </div>
            <div class="border-t border-slate-100 pt-4">
              <span class="text-slate-500 text-[10px] uppercase font-semibold">Graduaciones</span>
              <div class="flex flex-wrap gap-2 mt-2">
                {viewingUser.grad_kendo !== 'SIN_GRADUACION' && <span class="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">Kendo: {getGradLabel(viewingUser.grad_kendo)}</span>}
                {viewingUser.grad_iaido !== 'SIN_GRADUACION' && <span class="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-xs font-medium">Iaido: {getGradLabel(viewingUser.grad_iaido)}</span>}
                {viewingUser.grad_jodo !== 'SIN_GRADUACION' && <span class="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-medium">Jodo: {getGradLabel(viewingUser.grad_jodo)}</span>}
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
              <div key={disc} class="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{disc}</label>
                <div class="grid grid-cols-1 gap-3">
                  <select value={gradForm[`grad_${disc}` as keyof GradForm]}
                    onChange={(e: Event) => setGradForm({...gradForm, [`grad_${disc}`]: (e.target as HTMLSelectElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-slate-500 focus:ring-slate-500 p-2">
                    {GRADUACIONES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <input type="date" value={gradForm[`f_grad_${disc}` as keyof GradForm]}
                    onInput={(e: Event) => setGradForm({...gradForm, [`f_grad_${disc}`]: (e.target as HTMLInputElement).value})}
                    class="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-slate-500 focus:ring-slate-500 p-2" />
                </div>
              </div>
            ))}
            <div class="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)}
                class="w-full bg-slate-100 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleSaveGrad}
                class="w-full bg-slate-900 text-white py-2 rounded-md font-medium hover:bg-slate-800 transition-colors">Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function PendientesAprobacion() {
  const [users, setUsers] = useState<UserPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

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

  const handleAction = async (id: number, accion: 'APROBAR' | 'RECHAZAR') => {
    try {
      await api.patch(`/usuarios/${id}/aprobacion`, { accion });
      setUsers(users.filter(u => u.id !== id));
    } catch {
      setError('Error al procesar la acción');
    }
  };

  if (loading) return <div class="p-8"><Spinner text="Cargando usuarios pendientes..." /></div>;
  if (error) return <div class="p-8 text-red-600">{error}</div>;

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider font-semibold">
          <tr>
            <th class="px-6 py-4">Usuario / DNI</th>
            <th class="px-6 py-4">Correo Electrónico</th>
            <th class="px-6 py-4">Asociación</th>
            <th class="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {users.length === 0 ? (
            <tr><td colspan={4} class="px-6 py-8 text-center text-slate-500">No hay usuarios pendientes de aprobación.</td></tr>
          ) : (
            users.map(user => (
              <tr key={user.id} class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-medium text-slate-900">{user.nombre} {user.apellido}</div>
                  <div class="text-xs text-slate-500 font-mono">{user.dni}</div>
                </td>
                <td class="px-6 py-4 text-sm">{user.email}</td>
                <td class="px-6 py-4 text-sm text-slate-600">{user.asociacion.nombre}</td>
                <td class="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleAction(user.id, 'APROBAR')}
                    class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors">Aprobar</button>
                  <button onClick={() => handleAction(user.id, 'RECHAZAR')}
                    class="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-sm font-medium hover:bg-slate-50 transition-colors">Rechazar</button>
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
