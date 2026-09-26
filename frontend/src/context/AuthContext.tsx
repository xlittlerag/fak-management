import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
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
  refresh: () => Promise<User | null>;
  logout: () => void;
  loading: boolean;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: preact.ComponentChildren }) => {
  // Sesión únicamente en cookie httpOnly: el JWT nunca llega al JS, ni a
  // localStorage ni a memoria. El usuario se obtiene de /auth/session.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => user !== null;

  const refresh = async (): Promise<User | null> => {
    try {
      const res = await api.get<User>('/auth/session');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);

    refresh().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, []);

  const logout = () => {
    // Invalida la cookie httpOnly en el servidor; el estado se limpia de
    // todos modos aunque la llamada falle.
    api.post('/auth/logout').catch(() => undefined).finally(() => {
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, refresh, logout, loading, checkAuth }}>
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
