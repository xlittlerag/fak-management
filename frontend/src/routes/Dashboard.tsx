import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';
import type { EventoResumen } from '../types';
import Pendientes from './Pendientes';
import Asociaciones from './Asociaciones';
import Usuarios from './Usuarios';
import Perfil from './Perfil';
import CuotaAdmin from './CuotaAdmin';
import EventosAdmin from './EventosAdmin';
import InscripcionesAdmin from './InscripcionesAdmin';
import MisInscripciones from './MisInscripciones';
import EventosDashboard from './EventosDashboard';
import PreciosExamenAdmin from './PreciosExamenAdmin';

interface CuotaData {
  monto_actual: number | null;
  fecha_vencimiento: string | null;
  usuario_tiene_pago: boolean;
  esta_vencida: boolean;
}

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { path, route } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;
  if (!user) {
    route('/login');
    return null;
  }

  const menuItems = [
    { label: 'Inicio', path: '/dashboard', roles: ['BASICO', 'ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Mi Perfil', path: '/dashboard/perfil', roles: ['BASICO', 'ADMIN_ASOCIACION'] },
    { label: 'Usuarios Pendientes', path: '/dashboard/pendientes', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Listado de Miembros', path: '/dashboard/usuarios', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Ver Eventos', path: '/dashboard/eventos', roles: ['BASICO', 'ADMIN_ASOCIACION'] },
    { label: 'Mis Inscripciones', path: '/dashboard/mis-inscripciones', roles: ['BASICO', 'ADMIN_ASOCIACION'] },
    { label: 'Inscripciones Pendientes', path: '/dashboard/inscripciones', roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'] },
    { label: 'Configurar Cuota', path: '/dashboard/admin/cuota', roles: ['ADMIN_GENERAL'] },
    { label: 'Eventos', path: '/dashboard/eventos-admin', roles: ['ADMIN_GENERAL', 'ADMIN_ASOCIACION'] },
    { label: 'Precios de Exámenes', path: '/dashboard/precios-examen', roles: ['ADMIN_GENERAL'] },
    { label: 'Gestionar Asociaciones', path: '/dashboard/asociaciones', roles: ['ADMIN_GENERAL'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.rol));

  function pageTitle(path: string) {
    if (path === '/dashboard') return 'Inicio';
    const labels: Record<string, string> = {
      '/dashboard/perfil': 'Mi Perfil',
      '/dashboard/pendientes': 'Usuarios Pendientes',
      '/dashboard/usuarios': 'Listado de Miembros',
      '/dashboard/eventos': 'Ver Eventos',
      '/dashboard/mis-inscripciones': 'Mis Inscripciones',
      '/dashboard/inscripciones': 'Inscripciones Pendientes',
      '/dashboard/admin/cuota': 'Configurar Cuota',
      '/dashboard/eventos-admin': 'Gestión de Eventos',
      '/dashboard/precios-examen': 'Precios de Exámenes',
      '/dashboard/asociaciones': 'Gestionar Asociaciones',
    };
    return labels[path] || 'Dashboard';
  }

  return (
    <div class="flex h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          class="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside class={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div class="p-6 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <h1 class="text-xl font-bold text-white">Kendo Manager</h1>
            <button onClick={() => setSidebarOpen(false)} class="lg:hidden text-slate-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p class="text-xs mt-1 text-slate-500 uppercase tracking-wider font-semibold">{user.rol.replace('_', ' ')}</p>
        </div>
        
        <nav class="flex-1 p-4 space-y-1">
          {filteredMenu.map(item => (
            <a 
              key={item.path}
              href={item.path} 
              onClick={() => setSidebarOpen(false)}
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
            onClick={() => { logout(); route('/login'); }}
            class="w-full text-left px-4 py-2 text-red-400 hover:bg-red-950/30 rounded transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main class="flex-1 overflow-y-auto min-w-0">
        <header class="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex justify-between items-center gap-4">
          <div class="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} class="lg:hidden text-slate-600 hover:text-slate-900">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 class="text-lg font-semibold text-slate-800">{pageTitle(path)}</h2>
          </div>
          <div class="text-sm text-slate-500 truncate">
            {user.email}
          </div>
        </header>

        <div class="p-4 sm:p-8">
          {path === '/dashboard' && <DashboardHome />}
          {path === '/dashboard/perfil' && <Perfil />}
          {path === '/dashboard/pendientes' && <Pendientes />}
          {path === '/dashboard/usuarios' && <Usuarios />}
          {path === '/dashboard/eventos' && <EventosDashboard />}
          {path === '/dashboard/mis-inscripciones' && <MisInscripciones />}
          {path === '/dashboard/inscripciones' && <InscripcionesAdmin />}
          {path === '/dashboard/admin/cuota' && <CuotaAdmin />}
          {path === '/dashboard/eventos-admin' && <EventosAdmin />}
          {path === '/dashboard/precios-examen' && <PreciosExamenAdmin />}
          {path === '/dashboard/asociaciones' && <Asociaciones />}
        </div>
      </main>
    </div>
  );
}

function DashboardHome() {
  const { user } = useAuth();
  const { route } = useLocation();
  const [cuota, setCuota] = useState<CuotaData | null>(null);
  const [loadingCuota, setLoadingCuota] = useState(true);
  const [loadingPreference, setLoadingPreference] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [proximos, setProximos] = useState<EventoResumen[]>([]);
  const [loadingProximos, setLoadingProximos] = useState(true);

  useEffect(() => {
    api.get('/eventos')
      .then(res => setProximos(res.data.filter((e: EventoResumen) => new Date(e.fecha_inicio) > new Date()).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingProximos(false));
  }, []);

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
      const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
      mp.checkout({
        preference: { id: preferenceId },
        render: { container: '#mp-checkout-container', label: 'Pagar' },
      });
    } catch (err) {
      setCheckoutError(getErrorMessage(err));
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

      {loadingProximos ? (
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <p class="text-slate-400">Cargando próximos eventos...</p>
        </div>
      ) : proximos.length > 0 ? (
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100">
            <h4 class="font-semibold text-slate-800">Próximos Eventos</h4>
          </div>
          <div class="divide-y divide-slate-100">
            {proximos.map((ev: EventoResumen) => (
              <button
                key={ev.id}
                onClick={() => route('/dashboard/eventos')}
                class="w-full text-left px-6 py-3 hover:bg-slate-50 transition-colors"
              >
                <div class="flex justify-between items-center">
                  <span class="font-medium text-slate-900">{ev.tipo}</span>
                  <span class="text-sm text-slate-500">
                    {new Date(ev.fecha_inicio).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {ev.datos_lugar && (
                  <p class="text-xs text-slate-400 mt-0.5">
                    {ev.datos_lugar.direccion || ''}
                    {ev.datos_lugar.provincia ? ` - ${ev.datos_lugar.provincia}` : ''}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
