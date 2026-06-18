import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const [editingGrad, setEditingGrad] = useState<number | null>(null);
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

  const startEditGrad = (user: User) => {
    setEditingGrad(user.id);
    setGradForm({
      grad_kendo: user.grad_kendo || 'SIN_GRADUACION',
      f_grad_kendo: user.f_grad_kendo ? user.f_grad_kendo.split('T')[0] : '',
      grad_iaido: user.grad_iaido || 'SIN_GRADUACION',
      f_grad_iaido: user.f_grad_iaido ? user.f_grad_iaido.split('T')[0] : '',
      grad_jodo: user.grad_jodo || 'SIN_GRADUACION',
      f_grad_jodo: user.f_grad_jodo ? user.f_grad_jodo.split('T')[0] : '',
    });
  };

  const handleSaveGrad = async (id: number) => {
    try {
      await api.patch(`/usuarios/${id}/graduacion`, gradForm);
      setEditingGrad(null);
      fetchUsers();
    } catch (err) {
      alert('Error');
    }
  };

  if (loading) return <div>Cargando...</div>;

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
                K: {user.grad_kendo}<br/>I: {user.grad_iaido}<br/>J: {user.grad_jodo}
              </td>
              <td class="px-4 py-2 text-right">
                {editingGrad === user.id ? (
                  <div class="space-y-1 bg-white p-2 border rounded shadow-md absolute z-10">
                    {/* Modal content would go here, simplified to inline for now */}
                    <button onClick={() => handleSaveGrad(user.id)} class="text-blue-600 font-bold">Guardar</button>
                  </div>
                ) : (
                  <button onClick={() => startEditGrad(user)} class="text-blue-600 hover:underline">Editar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
