import { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, getUser, setUser, api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setLoading(false);
      return;
    }
    try {
      const role = getUser()?.role || 'student';
      const path = role === 'faculty' ? '/faculty/profile' : role === 'admin' ? '/admin/profile' : '/student/profile';
      const r = await api.get(path);
      if (r.ok && r.data?.data) {
        const u = r.data.data;
        u.role = u.role || role;
        setUserState(u);
        setUser(u);
      }
    } catch {
      // token invalid - logged out
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refreshUser();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (kind, email, password) => {
    let res;
    if (kind === 'student') res = await api.post('/auth/login', { email, password });
    else if (kind === 'faculty') res = await api.post('/auth/faculty/login', { email, password });
    else res = await api.post('/admin/login', { email, password });

    if (!res.ok) throw new Error(res.data?.message || 'Login failed');

    const newToken = res.data.data.token;
    const entity = res.data.data.student || res.data.data.faculty || res.data.data.admin || {};
    const u = { ...entity, role: kind };
    setToken(newToken);
    setUser(u);
    setUserState(u);
    setTokenState(newToken);
    return u;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUserState(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
