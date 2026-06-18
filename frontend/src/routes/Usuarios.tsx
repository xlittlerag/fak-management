import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GRADUACIONES } from '../constants';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  rol: string;
  estado_reg: string;
  grad_kendo: string;
  f_grad_kendo: string;
  grad_iaido: string;
  f_grad_iaido: string;
  asociacion: { nombre: string };
}

export default function Usuarios() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGrad, setEditingGrad] = useState<number | null>(null);
  const [gradForm, setGradForm] = useState({
    grad_kendo: '',
    f_grad_kendo: '',
    grad_iaido: '',
    f_grad_iaido: '',
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
    setEditingGrad(user.id);
    setGradForm({
      grad_kendo: user.grad_kendo || 'SIN_GRADUACION',
      f_grad_kendo: user.f_grad_kendo ? user.f_grad_kendo.split('T')[0] : '',
      grad_iaido: user.grad_iaido || 'SIN_GRADUACION',
      f_grad_iaido: user.f_grad_iaido ? user.f_grad_iaido.split('T')[0] : '',
    });
  };

  const handleSaveGrad = async (id: number) => {
    try {
      const payload: any = {};
      if (gradForm.grad_kendo) payload.grad_kendo = gradForm.grad_kendo;
      if (gradForm.f_grad_kendo) payload.f_grad_kendo = gradForm.f_grad_kendo;
      if (gradForm.grad_iaido) payload.grad_iaido = gradForm.grad_iaido;
      if (gradForm.f_grad_iaido) payload.f_grad_iaido = gradForm.f_grad_iaido;

      await api.patch(`/usuarios/${id}/graduacion`, payload);
      setEditingGrad(null);
      fetchUsers();
    } catch (err) {
      alert('Error al actualizar graduación');
    }
  };

  if (loading) return <div>Cargando...</div>;

  const isAdminGeneral = currentUser?.rol === 'ADMIN_GENERAL';

  return (
    <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider font-semibold">
          <tr>
            <th class="px-6 py-4 text-xs">Usuario / DNI</th>
            <th class="px-6 py-4 text-xs">Asociación</th>
            <th class="px-6 py-4 text-xs">Grad. Kendo</th>
            <th class="px-6 py-4 text-xs">Grad. Iaido</th>
            <th class="px-6 py-4 text-xs">Rol</th>
            <th class="px-6 py-4 text-right text-xs">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {users.filter(u => u.rol !== 'ADMIN_GENERAL').map(user => (
            <tr key={user.id} class="hover:bg-slate-50 transition-colors">
              <td class="px-6 py-4">
                <div class="font-medium text-slate-900">{user.nombre} {user.apellido}</div>
                <div class="text-xs text-slate-500 font-mono">{user.dni}</div>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600">{user.asociacion?.nombre}</td>
              <td class="px-6 py-4">
                {editingGrad === user.id ? (
                  <div class="space-y-1">
                    <select 
                      value={gradForm.grad_kendo} 
                      onChange={(e: any) => setGradForm({...gradForm, grad_kendo: e.target.value})}
                      class="text-xs border border-slate-300 rounded px-1 py-0.5 w-full"
                    >
                      {GRADUACIONES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                    <input 
                      type="date" 
                      value={gradForm.f_grad_kendo} 
                      onInput={(e: any) => setGradForm({...gradForm, f_grad_kendo: e.target.value})}
                      class="text-[10px] border border-slate-300 rounded px-1 py-0.5 w-full font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <span class="text-sm font-semibold">{GRADUACIONES.find(g => g.value === user.grad_kendo || g.value === user.grad_kendo.split('_').reverse().join('_'))?.label || user.grad_kendo}</span>
                    {user.f_grad_kendo && <div class="text-[10px] text-slate-400">{new Date(user.f_grad_kendo).toLocaleDateString()}</div>}
                  </div>
                )}
              </td>
              <td class="px-6 py-4">
                {editingGrad === user.id ? (
                  <div class="space-y-1">
                    <select 
                      value={gradForm.grad_iaido} 
                      onChange={(e: any) => setGradForm({...gradForm, grad_iaido: e.target.value})}
                      class="text-xs border border-slate-300 rounded px-1 py-0.5 w-full"
                    >
                      {GRADUACIONES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                    <input 
                      type="date" 
                      value={gradForm.f_grad_iaido} 
                      onInput={(e: any) => setGradForm({...gradForm, f_grad_iaido: e.target.value})}
                      class="text-[10px] border border-slate-300 rounded px-1 py-0.5 w-full font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <span class="text-sm font-semibold">{GRADUACIONES.find(g => g.value === user.grad_iaido || g.value === user.grad_iaido.split('_').reverse().join('_'))?.label || user.grad_iaido}</span>
                    {user.f_grad_iaido && <div class="text-[10px] text-slate-400">{new Date(user.f_grad_iaido).toLocaleDateString()}</div>}
                  </div>
                )}
              </td>
              <td class="px-6 py-4">
                <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tighter ${
                  user.rol === 'ADMIN_GENERAL' ? 'bg-purple-100 text-purple-700' :
                  user.rol === 'ADMIN_ASOCIACION' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {user.rol.replace('_', ' ')}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex flex-col items-end gap-1">
                  {editingGrad === user.id ? (
                    <>
                      <button onClick={() => handleSaveGrad(user.id)} class="text-blue-600 hover:underline text-xs font-bold">Guardar</button>
                      <button onClick={() => setEditingGrad(null)} class="text-slate-400 hover:underline text-xs">Cancelar</button>
                    </>
                  ) : (
                    <>
                      {isAdminGeneral && (
                        <button onClick={() => startEditGrad(user)} class="text-blue-600 hover:underline text-xs">Graduación</button>
                      )}
                      {isAdminGeneral && user.estado_reg === 'APROBADO' && (
                        user.rol === 'BASICO' ? (
                          <button onClick={() => handleUpdateRol(user.id, 'ADMIN_ASOCIACION')} class="text-indigo-600 hover:underline text-xs">Hacer Admin</button>
                        ) : (
                          <button onClick={() => handleUpdateRol(user.id, 'BASICO')} class="text-amber-600 hover:underline text-xs">Quitar Admin</button>
                        )
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
