import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  rol: string;
  asociacion_id: number;
  estado_reg?: string;
  grad_kendo?: string;
  grad_iaido?: string;
  grad_jodo?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: preact.ComponentChildren }) => {
  // El JWT vive solo en memoria: nunca se persiste en localStorage, de modo
  // que un XSS no puede exfiltrar la sesión (la cookie httpOnly tampoco es
  // legible desde JS). Al recargar, la sesión se restaura contra /auth/session.
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => user !== null;

  useEffect(() => {
    let cancelled = false;

    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);

    const restore = async () => {
      try {
        const res = await api.get<User>('/auth/session');
        if (!cancelled) {
          setUser(res.data);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    restore();

    return () => {
      cancelled = true;
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, []);

  const login = (newToken: string) => {
    const decoded = jwtDecode<User & { sub: number }>(newToken);
    setToken(newToken);
    setUser({
      ...decoded,
      id: decoded.sub,
    });
  };

  const logout = () => {
    // Invalida la cookie httpOnly en el servidor; el estado en memoria se
    // limpia de todos modos aunque la llamada falle.
    api.post('/auth/logout').catch(() => undefined).finally(() => {
      setToken(null);
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
