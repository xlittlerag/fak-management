import { useState, useEffect } from 'preact/hooks';
import { useLocation, lazy } from 'preact-iso';
import { Suspense } from 'preact/compat';
import { useAuth } from '../context/AuthContext';
import api, { apiGet } from '../services/api';
import { loadMercadoPago } from '../lib/mercadopago';
import { getErrorMessage } from '../lib/error';
import type { EventoResumen } from '../types';
import { Wordmark } from '../components/ui/Wordmark';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

// Páginas del dashboard cargadas on-demand: cada sección es un chunk aparte,
// así el usuario sólo descarga lo que visita.
const Asociaciones = lazy(() => import('./Asociaciones'));
const Usuarios = lazy(() => import('./Usuarios'));
const Perfil = lazy(() => import('./Perfil'));
const EventosAdmin = lazy(() => import('./EventosAdmin'));
const InscripcionesAdmin = lazy(() => import('./InscripcionesAdmin'));
const MisInscripciones = lazy(() => import('./MisInscripciones'));
const EventosDashboard = lazy(() => import('./EventosDashboard'));
const Certificados = lazy(() => import('./Certificados'));
const CertificadosPendientesAdmin = lazy(
  () => import('./CertificadosPendientesAdmin'),
);
const DiplomasAdmin = lazy(() => import('./DiplomasAdmin'));
const AuditoriaAdmin = lazy(() => import('./AuditoriaAdmin'));
const AdminConfig = lazy(() => import('./AdminConfig'));
const Reimpresiones = lazy(() => import('./Reimpresiones'));
const MisDiplomas = lazy(() => import('./MisDiplomas'));
const Afiliacion = lazy(() => import('./Afiliacion'));
const AfiliacionesAdmin = lazy(() => import('./AfiliacionesAdmin'));
const BajasAdmin = lazy(() => import('./BajasAdmin'));
const Mesas = lazy(() => import('./Mesas'));
const Admin2FA = lazy(() => import('./Admin2FA'));

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

  const redirectLogin = !loading && !user;
  const redirectUsuarios =
    !loading && !!user && user.rol === 'ADMIN_GENERAL' && path === '/dashboard';
  const redirectPerfil =
    !loading &&
    !!user &&
    user.estado_reg === 'DESAFILIADO' &&
    path !== '/dashboard/perfil' &&
    path !== '/dashboard/afiliacion';

  useEffect(() => {
    if (redirectLogin) route('/login');
  }, [redirectLogin, route]);
  useEffect(() => {
    if (redirectUsuarios) route('/dashboard/usuarios');
  }, [redirectUsuarios, route]);
  useEffect(() => {
    if (redirectPerfil) route('/dashboard/perfil');
  }, [redirectPerfil, route]);

  if (loading) return null;
  if (!user) {
    return null;
  }

  if (redirectUsuarios) {
    return null;
  }

  if (redirectPerfil) {
    return null;
  }

  const isDesafiliado = user.estado_reg === 'DESAFILIADO';

  const menuItems = [
    {
      label: 'Inicio',
      path: '/dashboard',
      roles: ['BASICO', 'ADMIN_ASOCIACION', 'ADMIN_GENERAL'],
    },
    {
      label: 'Mi Perfil',
      path: '/dashboard/perfil',
      roles: ['BASICO', 'ADMIN_ASOCIACION'],
    },
    { label: 'Solicitar Afiliación', path: '/dashboard/afiliacion', roles: [] },
    {
      label: 'Miembros',
      path: '/dashboard/usuarios',
      roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'],
    },
    {
      label: 'Afiliaciones',
      path: '/dashboard/afiliaciones',
      roles: ['ADMIN_ASOCIACION'],
    },
    {
      label: 'Ver Eventos',
      path: '/dashboard/eventos',
      roles: ['BASICO', 'ADMIN_ASOCIACION'],
    },
    {
      label: 'Mis Inscripciones',
      path: '/dashboard/mis-inscripciones',
      roles: ['BASICO', 'ADMIN_ASOCIACION'],
    },
    {
      label: 'Inscripciones',
      path: '/dashboard/inscripciones',
      roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'],
    },
    {
      label: 'Eventos',
      path: '/dashboard/eventos-admin',
      roles: ['ADMIN_GENERAL', 'ADMIN_ASOCIACION'],
    },
    {
      label: 'Mis Diplomas',
      path: '/dashboard/mis-diplomas',
      roles: ['BASICO', 'ADMIN_ASOCIACION'],
    },
    {
      label: 'Mis Certificados',
      path: '/dashboard/certificados',
      roles: ['BASICO'],
    },
    {
      label: 'Certificados Pendientes',
      path: '/dashboard/certificados-pendientes',
      roles: ['ADMIN_ASOCIACION', 'ADMIN_GENERAL'],
    },
    {
      label: 'Gestionar Asociaciones',
      path: '/dashboard/asociaciones',
      roles: ['ADMIN_GENERAL'],
    },
  ];

  const adminSections = [
    {
      title: 'Gestión',
      items: [
        {
          label: 'Miembros',
          path: '/dashboard/usuarios',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Asociaciones',
          path: '/dashboard/asociaciones',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Eventos',
          path: '/dashboard/eventos-admin',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Bajas Pendientes',
          path: '/dashboard/bajas',
          roles: ['ADMIN_GENERAL'],
        },
      ],
    },
    {
      title: 'Certificaciones',
      items: [
        {
          label: 'Cert. Externas',
          path: '/dashboard/certificados-pendientes',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Diplomas Nacionales',
          path: '/dashboard/diplomas-admin',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Reimpresiones',
          path: '/dashboard/reimpresiones',
          roles: ['ADMIN_GENERAL'],
        },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        {
          label: 'Configuración',
          path: '/dashboard/admin/config',
          roles: ['ADMIN_GENERAL'],
        },
      ],
    },
    {
      title: 'Auditoría',
      items: [
        {
          label: 'Auditoría',
          path: '/dashboard/auditoria',
          roles: ['ADMIN_GENERAL'],
        },
        {
          label: 'Seguridad (2FA)',
          path: '/dashboard/seguridad',
          roles: ['ADMIN_GENERAL'],
        },
      ],
    },
  ];

  const filteredMenu = menuItems.filter((item) =>
    item.roles.includes(user.rol),
  );
  const desafiliadoMenu = menuItems.filter(
    (item) =>
      item.path === '/dashboard/perfil' ||
      item.path === '/dashboard/afiliacion',
  );

  function pageTitle(path: string) {
    if (path === '/dashboard') return 'Inicio';
    const labels: Record<string, string> = {
      '/dashboard/perfil': 'Mi Perfil',
      '/dashboard/afiliacion': 'Solicitar Afiliación',
      '/dashboard/afiliaciones': 'Afiliaciones',
      '/dashboard/bajas': 'Bajas Pendientes',
      '/dashboard/usuarios': 'Miembros',
      '/dashboard/eventos': 'Ver Eventos',
      '/dashboard/mis-inscripciones': 'Mis Inscripciones',
      '/dashboard/inscripciones': 'Inscripciones',
      '/dashboard/admin/config': 'Configuración',
      '/dashboard/eventos-admin': 'Gestión de Eventos',
      '/dashboard/certificados': 'Mis Certificados',
      '/dashboard/certificados-pendientes': 'Certificados Pendientes',
      '/dashboard/diplomas-admin': 'Gestión de Diplomas',
      '/dashboard/reimpresiones': 'Solicitudes de Reimpresión',
      '/dashboard/mis-diplomas': 'Mis Diplomas',
      '/dashboard/asociaciones': 'Gestionar Asociaciones',
      '/dashboard/auditoria': 'Auditoría',
      '/dashboard/seguridad': 'Seguridad (2FA)',
      '/dashboard/mesas': 'Mesas examinadoras',
    };
    return labels[path] || 'Dashboard';
  }

  const navLinkClass = (active: boolean) =>
    `relative flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors ${
      active
        ? 'bg-white/10 font-medium text-white'
        : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  const renderLink = (item: { label: string; path: string }) => (
    <a
      key={item.path}
      href={item.path}
      onClick={() => setSidebarOpen(false)}
      class={navLinkClass(path === item.path)}
    >
      {path === item.path && (
        <span
          aria-hidden="true"
          class="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-hinomaru"
        />
      )}
      {item.label}
    </a>
  );

  return (
    <div class="flex h-dvh overflow-hidden bg-paper">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          class="fixed inset-0 z-20 cursor-default bg-ink/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        class={`max-lg:fixed lg:static inset-y-0 left-0 z-30 flex w-64 max-w-[85vw] flex-col bg-ink text-white/80 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div class="border-b border-white/10 p-5">
          <div class="flex items-start justify-between gap-2">
            <Wordmark tone="light" showSubtitle={false} />
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
              class="touch-target -mt-1 -mr-2 shrink-0 rounded-md text-white/50 hover:text-white lg:hidden"
            >
              <svg
                aria-hidden="true"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p class="mt-3 text-xs font-semibold tracking-wider text-white/40 uppercase">
            {user.rol.replace('_', ' ')}
          </p>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
          {isDesafiliado
            ? desafiliadoMenu.map(renderLink)
            : user.rol === 'ADMIN_GENERAL'
              ? adminSections.map((section) => {
                  const visible = section.items.filter((i) =>
                    i.roles.includes(user.rol),
                  );
                  if (visible.length === 0) return null;
                  return (
                    <div key={section.title}>
                      <p class="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                        {section.title}
                      </p>
                      {visible.map(renderLink)}
                    </div>
                  );
                })
              : filteredMenu.map(renderLink)}
        </nav>

        <div class="border-t border-white/10 p-3">
          <button
            onClick={() => {
              logout();
              route('/login');
            }}
            class="w-full rounded-md px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-paper">
        <header class="flex items-center justify-between gap-2 border-b border-steel-soft bg-surface px-3 py-3 sm:gap-4 sm:px-8">
          <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              class="touch-target -ml-2 shrink-0 rounded-md text-steel hover:text-ink lg:hidden"
            >
              <svg
                aria-hidden="true"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 class="truncate font-display text-fluid-lg text-ink">
              {pageTitle(path)}
            </h2>
          </div>
          <div class="hidden max-w-[45%] truncate text-sm text-steel sm:block">
            {user.email}
          </div>
        </header>

        <div class="p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<p class="text-steel">Cargando…</p>}>
            {path === '/dashboard' && <DashboardHome />}
            {path === '/dashboard/perfil' && <Perfil />}
            {path === '/dashboard/afiliacion' && <Afiliacion />}
            {path === '/dashboard/afiliaciones' && <AfiliacionesAdmin />}
            {path === '/dashboard/bajas' && <BajasAdmin />}
            {path === '/dashboard/usuarios' && <Usuarios />}
            {path === '/dashboard/eventos' && <EventosDashboard />}
            {path === '/dashboard/mis-inscripciones' && <MisInscripciones />}
            {path === '/dashboard/inscripciones' && <InscripcionesAdmin />}
            {path === '/dashboard/admin/config' && <AdminConfig />}
            {path === '/dashboard/eventos-admin' && <EventosAdmin />}
            {path === '/dashboard/certificados' && <Certificados />}
            {path === '/dashboard/certificados-pendientes' && (
              <CertificadosPendientesAdmin />
            )}
            {path === '/dashboard/diplomas-admin' && <DiplomasAdmin />}
            {path === '/dashboard/reimpresiones' && <Reimpresiones />}
            {path === '/dashboard/mis-diplomas' && <MisDiplomas />}
            {path === '/dashboard/asociaciones' && <Asociaciones />}
            {path === '/dashboard/auditoria' && <AuditoriaAdmin />}
            {path === '/dashboard/seguridad' && <Admin2FA />}
            {path === '/dashboard/mesas' && <Mesas />}
          </Suspense>
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
  const [simulatedPayment, setSimulatedPayment] = useState<{
    externalReference: string;
  } | null>(null);

  useEffect(() => {
    apiGet<EventoResumen[]>('/eventos')
      .then((data) =>
        setProximos(
          data.filter((e) => new Date(e.fecha_inicio) > new Date()).slice(0, 5),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingProximos(false));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    api
      .get('/usuarios/cuota', { signal: ac.signal })
      .then((res) => setCuota(res.data))
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setLoadingCuota(false);
      });
    return () => ac.abort();
  }, []);

  const handlePay = async () => {
    setCheckoutError('');
    setLoadingPreference(true);
    try {
      const res = await api.post('/pagos/checkout-fee');
      const { preferenceId, simulated, externalReference } = res.data;
      if (simulated) {
        // Modo simulado: mostrar botón de simulación en lugar de MP checkout
        setSimulatedPayment({ externalReference });
        return;
      }
      await loadMercadoPago();
      const mp = new window.MercadoPago(
        import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY,
      );
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

  const handleSimulatePayment = async () => {
    if (!simulatedPayment) return;
    setLoadingPreference(true);
    setCheckoutError('');
    try {
      await api.post('/pagos/simulate', {
        externalReference: simulatedPayment.externalReference,
      });
      route('/pagos/exito');
    } catch (err) {
      setCheckoutError(getErrorMessage(err));
    } finally {
      setLoadingPreference(false);
    }
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function formatMoney(value: number | null) {
    if (value === null) return '—';
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }

  return (
    <div class="space-y-6">
      <Panel frame bodyClass="p-6">
        <h3 class="font-display text-xl text-ink">Bienvenido, {user?.email}</h3>
        <p class="mt-1 text-steel">Este es su panel de control.</p>
      </Panel>

      <div class="grid gap-6 md:grid-cols-2">
        {loadingCuota ? (
          <Panel>
            <p class="text-steel">Cargando información de cuota...</p>
          </Panel>
        ) : cuota && cuota.monto_actual !== null ? (
          <Panel title="Mi Cuota Federativa" bodyClass="space-y-3 p-6">
            <div class="flex items-center justify-between">
              <span class="text-steel">Monto anual</span>
              <span class="tnum font-semibold text-ink">
                {formatMoney(cuota.monto_actual)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-steel">Fecha de vencimiento</span>
              <span class="tnum text-ink">
                {formatDate(cuota.fecha_vencimiento)}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-steel">Estado</span>
              {cuota.usuario_tiene_pago ? (
                <Badge tone="success">
                  <span class="h-2 w-2 rounded-full bg-success" />
                  Al día
                </Badge>
              ) : (
                <Badge tone="danger">
                  <span class="h-2 w-2 rounded-full bg-hinomaru" />
                  Adeuda
                </Badge>
              )}
            </div>

            {cuota.esta_vencida && !cuota.usuario_tiene_pago && (
              <Alert tone="warning">
                Su cuota se encuentra vencida. Realice el pago para reactivar su
                cuenta.
              </Alert>
            )}

            {checkoutError && <Alert tone="error">{checkoutError}</Alert>}

            {!cuota.usuario_tiene_pago && (
              <div id="mp-checkout-container">
                {simulatedPayment ? (
                  <Button
                    onClick={handleSimulatePayment}
                    disabled={loadingPreference}
                    class="w-full"
                  >
                    {loadingPreference
                      ? 'Procesando pago simulado...'
                      : 'Pagar en modo prueba (simulado)'}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePay}
                    disabled={loadingPreference}
                    class="w-full"
                  >
                    {loadingPreference
                      ? 'Generando pago...'
                      : 'Pagar con Mercado Pago'}
                  </Button>
                )}
              </div>
            )}
          </Panel>
        ) : cuota ? (
          <Panel title="Mi Cuota Federativa" bodyClass="p-6">
            <p class="text-steel">
              La cuota federativa aún no ha sido configurada.
            </p>
          </Panel>
        ) : null}

        {loadingProximos ? (
          <Panel>
            <p class="text-steel">Cargando próximos eventos...</p>
          </Panel>
        ) : proximos.length > 0 ? (
          <Panel title="Próximos Eventos" bodyClass="p-0">
            <div class="divide-y divide-steel-soft/60">
              {proximos.map((ev: EventoResumen) => (
                <button
                  key={ev.id}
                  onClick={() => route('/dashboard/eventos')}
                  class="w-full px-6 py-3 text-left transition-colors hover:bg-ai-soft/50"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-ink">{ev.tipo}</span>
                    <span class="tnum text-sm text-steel">
                      {new Date(ev.fecha_inicio).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  {ev.datos_lugar && (
                    <p class="mt-0.5 text-xs text-steel">
                      {ev.datos_lugar.direccion || ''}
                      {ev.datos_lugar.provincia
                        ? ` - ${ev.datos_lugar.provincia}`
                        : ''}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
