import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';

interface UserPending {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  asociacion: { nombre: string };
}

export default function Pendientes() {
  const [users, setUsers] = useState<UserPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/usuarios/pendientes');
      setUsers(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al cargar pendientes';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, accion: 'APROBAR' | 'RECHAZAR') => {
    try {
      await api.patch(`/usuarios/${id}/aprobacion`, { accion });
      setUsers(users.filter(u => u.id !== id));
    } catch {
      alert('Error al procesar la acción');
    }
  };

  if (loading) return <div class="p-8 text-slate-400">Cargando...</div>;
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
            <tr>
              <td colspan={4} class="px-6 py-8 text-center text-slate-500">No hay usuarios pendientes de aprobación.</td>
            </tr>
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
                  <button 
                    onClick={() => handleAction(user.id, 'APROBAR')}
                    class="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Aprobar
                  </button>
                  <button 
                    onClick={() => handleAction(user.id, 'RECHAZAR')}
                    class="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Rechazar
                  </button>
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
