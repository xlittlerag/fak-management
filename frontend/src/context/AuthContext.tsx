import { createContext } from 'preact';
import {
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'preact/hooks';
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

export const AuthProvider = ({
  children,
}: {
  children: preact.ComponentChildren;
}) => {
  // Sesión únicamente en cookie httpOnly: el JWT nunca llega al JS, ni a
  // localStorage ni a memoria. El usuario se obtiene de /auth/session.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(() => user !== null, [user]);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const res = await api.get<User>('/auth/session');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

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
  }, [refresh]);

  const logout = useCallback(() => {
    // Invalida la cookie httpOnly en el servidor; el estado se limpia de
    // todos modos aunque la llamada falle.
    api
      .post('/auth/logout')
      .catch(() => undefined)
      .finally(() => {
        setUser(null);
      });
  }, []);

  // Valor estable: evita re-renderizar a todos los consumidores cuando el
  // provider se re-renderiza sin que cambie la sesión.
  const value = useMemo(
    () => ({ user, refresh, logout, loading, checkAuth }),
    [user, refresh, logout, loading, checkAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
