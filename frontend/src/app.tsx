import { LocationProvider, Router, Route, useLocation, lazy } from 'preact-iso';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'preact/hooks';
import { Spinner } from './components/Spinner';

// Rutas cargadas on-demand: cada página viaja en su propio chunk en lugar de
// incluirse todas en el bundle inicial.
const Login = lazy(() => import('./routes/Login'));
const AdminLogin = lazy(() => import('./routes/AdminLogin'));
const Register = lazy(() => import('./routes/Register'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Eventos = lazy(() => import('./routes/Eventos'));
const EventoDetalle = lazy(() => import('./routes/EventoDetalle'));
const PagoExito = lazy(() => import('./routes/PagoExito'));
const PagoPendiente = lazy(() => import('./routes/PagoPendiente'));
const PagoError = lazy(() => import('./routes/PagoError'));
const ResetPassword = lazy(() => import('./routes/ResetPassword'));
const NotFound = lazy(() => import('./routes/_404'));

function RouteFallback() {
  return (
    <div class="flex min-h-screen items-center justify-center bg-paper">
      <Spinner text="Cargando…" />
    </div>
  );
}

function AppContent() {
  const { checkAuth } = useAuth();
  const { path, route } = useLocation();

  useEffect(() => {
    if (path === '/' && checkAuth()) {
      route('/dashboard');
    }
  }, [path, route, checkAuth]);

  return (
    <Router>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/eventos" component={Eventos} />
      <Route path="/eventos/:id" component={EventoDetalle} />
      <Route path="/pagos/exito" component={PagoExito} />
      <Route path="/pagos/pending" component={PagoPendiente} />
      <Route path="/pagos/error" component={PagoError} />
      <Route path="/dashboard/:rest*" component={Dashboard} />
      <Route default component={NotFound} />
    </Router>
  );
}

export function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppContent />
      </LocationProvider>
    </AuthProvider>
  );
}

export { RouteFallback };
