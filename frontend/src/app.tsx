import { LocationProvider, Router, Route, useLocation } from 'preact-iso';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'preact/hooks';
import Login from './routes/Login';
import Register from './routes/Register';
import Dashboard from './routes/Dashboard';
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
      <Route path="/register" component={Register} />
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
