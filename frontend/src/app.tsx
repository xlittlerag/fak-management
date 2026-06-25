import { LocationProvider, Router, Route, useLocation } from 'preact-iso';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'preact/hooks';
import Login from './routes/Login';
import AdminLogin from './routes/AdminLogin';
import Register from './routes/Register';
import Dashboard from './routes/Dashboard';
import Eventos from './routes/Eventos';
import EventoDetalle from './routes/EventoDetalle';
import PagoExito from './routes/PagoExito';
import PagoPendiente from './routes/PagoPendiente';
import PagoError from './routes/PagoError';
import NotFound from './routes/_404';

function AppContent() {
  const { checkAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.path === '/' && checkAuth()) {
      location.route('/dashboard');
    }
  }, [location.path]);

  return (
    <Router>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/register" component={Register} />
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
