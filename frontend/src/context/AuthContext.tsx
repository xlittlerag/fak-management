import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: number;
  email: string;
  rol: string;
  asociacion_id: number;
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

export const AuthProvider = ({ children }: { children: any }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Expose checkAuth to decide initial landing
  const checkAuth = () => !!localStorage.getItem('token');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      try {
        const decoded = jwtDecode<User & { sub: number }>(savedToken);
        setToken(savedToken);
        setUser({
          ...decoded,
          id: decoded.sub, // Mapping sub to id as per typical NestJS JWT payload
        });
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    const decoded = jwtDecode<User & { sub: number }>(newToken);
    setToken(newToken);
    setUser({
      ...decoded,
      id: decoded.sub,
    });
    window.location.href = '/dashboard';
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
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
