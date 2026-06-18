import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GRADUACIONES } from '../constants';
import { Modal } from '../components/Modal';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  rol: string;
  estado_reg: string;
  grad_kendo: string;
  f_grad_kendo: string;
  grad_iaido: string;
  f_grad_iaido: string;
  grad_jodo: string;
  f_grad_jodo: string;
  asociacion: { nombre: string };
  dojo: { nombre: string };
}

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [gradForm, setGradForm] = useState({
    grad_kendo: '', f_grad_kendo: '',
    grad_iaido: '', f_grad_iaido: '',
    grad_jodo: '', f_grad_jodo: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/usuarios');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRol = async (id: number, rol: string) => {
    try {
      await api.patch(`/usuarios/${id}/rol`, { rol });
      alert('Rol actualizado correctamente');
      fetchUsers();
    } catch (err) {
      alert('Error al actualizar el rol');
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
    } catch (err) {
      alert('Error al actualizar graduación');
    }
  };

  const getGradLabel = (val: string) => {
    return GRADUACIONES.find(g => g.value === val)?.label || val;
  };

  if (loading) return <div>Cargando...</div>;

  const isAdminGeneral = currentUser?.rol === 'ADMIN_GENERAL';

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <table class="w-full text-left border-collapse text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
          <tr>
            <th class="px-4 py-2">Usuario</th>
            <th class="px-4 py-2">Dojo</th>
            <th class="px-4 py-2">K/I/J</th>
            <th class="px-4 py-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {users.filter(u => u.rol !== 'ADMIN_GENERAL').map(user => (
            <tr key={user.id} class="hover:bg-slate-50">
              <td class="px-4 py-2 font-medium">{user.nombre} {user.apellido}<div class="text-[10px] text-slate-400">{user.dni}</div></td>
              <td class="px-4 py-2 text-slate-600">{user.dojo?.nombre || '-'}</td>
              <td class="px-4 py-2 font-mono text-[10px]">
                K: {getGradLabel(user.grad_kendo)}<br/>I: {getGradLabel(user.grad_iaido)}<br/>J: {getGradLabel(user.grad_jodo)}
              </td>
              <td class="px-4 py-2 text-right">
                <div class="flex flex-col items-end gap-2">
                  <button onClick={() => startEditGrad(user)} class="text-blue-600 hover:underline">Editar Grad.</button>
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

      {editingUser !== null && (
        <Modal isOpen={true} onClose={() => setEditingUser(null)} title="Editar Graduaciones">
          <div class="space-y-4">
            {(['kendo', 'iaido', 'jodo'] as const).map(disc => (
              <div key={disc}>
                <label class="block text-sm font-medium text-slate-700 capitalize">{disc}</label>
                <select 
                  value={gradForm[`grad_${disc}` as keyof typeof gradForm]} 
                  onChange={(e: any) => setGradForm({...gradForm, [`grad_${disc}`]: e.target.value})}
                  class="w-full text-sm border p-1 rounded"
                >
                  {GRADUACIONES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <input 
                  type="date" 
                  value={gradForm[`f_grad_${disc}` as keyof typeof gradForm]} 
                  onInput={(e: any) => setGradForm({...gradForm, [`f_grad_${disc}`]: e.target.value})}
                  class="w-full text-sm border p-1 rounded mt-1"
                />
              </div>
            ))}
            <button onClick={handleSaveGrad} class="w-full bg-slate-900 text-white py-2 rounded">Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
