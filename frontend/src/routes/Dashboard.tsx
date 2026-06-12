import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import Pendientes from './Pendientes';
import Asociaciones from './Asociaciones';
import Usuarios from './Usuarios';
import Perfil from './Perfil';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { path } = useLocation();

  if (loading) return null;
  if (!user) {
    window.location.href = '/login';
    return null;
  }

  const menuItems = [
    { label: 'Inicio', path: '/dashboard', roles: ['BASICO', 'ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Mi Perfil', path: '/dashboard/perfil', roles: ['BASICO', 'ADMIN_ASOCIACION'] },
    { label: 'Usuarios Pendientes', path: '/dashboard/pendientes', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Listado de Miembros', path: '/dashboard/usuarios', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Gestionar Asociaciones', path: '/dashboard/asociaciones', roles: ['ADMIN_GENERAL'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.rol));

  return (
    <div class="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div class="p-6 border-b border-slate-800">
          <h1 class="text-xl font-bold text-white">Kendo Manager</h1>
          <p class="text-xs mt-1 text-slate-500 uppercase tracking-wider font-semibold">{user.rol.replace('_', ' ')}</p>
        </div>
        
        <nav class="flex-1 p-4 space-y-1">
          {filteredMenu.map(item => (
            <a 
              key={item.path}
              href={item.path} 
              class={`block px-4 py-2 rounded transition-colors ${
                path === item.path ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div class="p-4 border-t border-slate-800">
          <button 
            onClick={logout}
            class="w-full text-left px-4 py-2 text-red-400 hover:bg-red-950/30 rounded transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 overflow-y-auto">
        <header class="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <h2 class="text-lg font-semibold text-slate-800 capitalize">
            {path.split('/').pop() || 'Dashboard'}
          </h2>
          <div class="text-sm text-slate-500">
            {user.email}
          </div>
        </header>

        <div class="p-8">
          {path === '/dashboard' && <DashboardHome />}
          {path === '/dashboard/perfil' && <Perfil />}
          {path === '/dashboard/pendientes' && <Pendientes />}
          {path === '/dashboard/usuarios' && <Usuarios />}
          {path === '/dashboard/asociaciones' && <Asociaciones />}
          {path !== '/dashboard' && !path.startsWith('/dashboard/') && <DashboardHome />}
        </div>
      </main>
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  return (
    <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 class="text-xl font-bold mb-4">Bienvenido, {user?.email}</h3>
      <p class="text-slate-600">Este es su panel de control administrativo.</p>
    </div>
  );
}
