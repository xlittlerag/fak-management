import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Pendientes from './Pendientes';
import Asociaciones from './Asociaciones';
import Usuarios from './Usuarios';
import Perfil from './Perfil';
import CuotaAdmin from './CuotaAdmin';

interface CuotaData {
  monto_actual: number | null;
  fecha_vencimiento: string | null;
  usuario_tiene_pago: boolean;
  esta_vencida: boolean;
}

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
    { label: 'Configurar Cuota', path: '/dashboard/admin/cuota', roles: ['ADMIN_GENERAL'] },
    { label: 'Gestionar Asociaciones', path: '/dashboard/asociaciones', roles: ['ADMIN_GENERAL'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.rol));

  function pageTitle(path: string) {
    if (path === '/dashboard') return 'Inicio';
    const labels: Record<string, string> = {
      '/dashboard/perfil': 'Mi Perfil',
      '/dashboard/pendientes': 'Usuarios Pendientes',
      '/dashboard/usuarios': 'Listado de Miembros',
      '/dashboard/admin/cuota': 'Configurar Cuota',
      '/dashboard/asociaciones': 'Gestionar Asociaciones',
    };
    return labels[path] || 'Dashboard';
  }

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
          <h2 class="text-lg font-semibold text-slate-800">{pageTitle(path)}</h2>
          <div class="text-sm text-slate-500">
            {user.email}
          </div>
        </header>

        <div class="p-8">
          {path === '/dashboard' && <DashboardHome />}
          {path === '/dashboard/perfil' && <Perfil />}
          {path === '/dashboard/pendientes' && <Pendientes />}
          {path === '/dashboard/usuarios' && <Usuarios />}
          {path === '/dashboard/admin/cuota' && <CuotaAdmin />}
          {path === '/dashboard/asociaciones' && <Asociaciones />}
        </div>
      </main>
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const [cuota, setCuota] = useState<CuotaData | null>(null);
  const [loadingCuota, setLoadingCuota] = useState(true);
  const [loadingPreference, setLoadingPreference] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    api.get('/usuarios/cuota')
      .then(res => setCuota(res.data))
      .catch(() => {})
      .finally(() => setLoadingCuota(false));
  }, []);

  const handlePay = async () => {
    setCheckoutError('');
    setLoadingPreference(true);
    try {
      const res = await api.post('/pagos/checkout-fee');
      const { preferenceId } = res.data;
      const mp = new (window as any).MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: preferenceId },
        render: { container: '#mp-checkout-container', label: 'Pagar' },
      });
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Error al generar el pago');
    } finally {
      setLoadingPreference(false);
    }
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  function formatMoney(value: number | null) {
    if (value === null) return '—';
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }

  return (
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h3 class="text-xl font-bold mb-2">Bienvenido, {user?.email}</h3>
        <p class="text-slate-600">Este es su panel de control.</p>
      </div>

      {loadingCuota ? (
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <p class="text-slate-400">Cargando información de cuota...</p>
        </div>
      ) : cuota && cuota.monto_actual !== null ? (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100">
            <h4 class="font-semibold text-slate-800">Mi Cuota Federativa</h4>
          </div>
          <div class="px-6 py-4 space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-slate-600">Monto anual</span>
              <span class="font-semibold text-slate-900">{formatMoney(cuota.monto_actual)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600">Fecha de vencimiento</span>
              <span class="text-slate-900">{formatDate(cuota.fecha_vencimiento)}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-600">Estado</span>
              {cuota.usuario_tiene_pago ? (
                <span class="inline-flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                  <span class="w-2 h-2 bg-green-500 rounded-full" />
                  Al día
                </span>
              ) : (
                <span class="inline-flex items-center gap-1 text-red-700 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                  <span class="w-2 h-2 bg-red-500 rounded-full" />
                  Adeuda
                </span>
              )}
            </div>

            {cuota.esta_vencida && !cuota.usuario_tiene_pago && (
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                Su cuota se encuentra vencida. Realice el pago para reactivar su cuenta.
              </div>
            )}

            {checkoutError && (
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {checkoutError}
              </div>
            )}

            {!cuota.usuario_tiene_pago && (
              <div id="mp-checkout-container">
                <button
                  onClick={handlePay}
                  disabled={loadingPreference}
                  class="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
                >
                  {loadingPreference ? 'Generando pago...' : 'Pagar con Mercado Pago'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : cuota ? (
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h4 class="font-semibold text-slate-800">Mi Cuota Federativa</h4>
          <p class="text-slate-400 mt-2">La cuota federativa aún no ha sido configurada.</p>
        </div>
      ) : null}
    </div>
  );
}
