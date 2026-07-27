import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'resume_builder_token';
const USER_KEY = 'resume_builder_user';
const ROLE_KEY = 'resume_builder_role';

const defaultRole = 'Software Engineer';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [selectedRole, setSelectedRole] = useState(() => localStorage.getItem(ROLE_KEY) || defaultRole);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    api
      .get('/auth/profile')
      .then((response) => {
        if (!active) return;
        setUser(response.data);
        setSelectedRole(response.data.role || defaultRole);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        localStorage.setItem(ROLE_KEY, response.data.role || defaultRole);
      })
      .catch(() => {
        if (!active) return;
        logout();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const persistAuth = (payload) => {
    setToken(payload.access_token);
    setUser(payload.user);
    setSelectedRole(payload.user.role || defaultRole);
    localStorage.setItem(TOKEN_KEY, payload.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    localStorage.setItem(ROLE_KEY, payload.user.role || defaultRole);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    persistAuth(response.data);
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    persistAuth(response.data);
    return response.data;
  };

  const updateRole = async (role) => {
    const response = await api.patch('/auth/profile/role', { role });
    setUser(response.data);
    setSelectedRole(response.data.role || role);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data));
    localStorage.setItem(ROLE_KEY, response.data.role || role);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSelectedRole(defaultRole);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      selectedRole,
      loading,
      isAuthenticated: Boolean(token),
      login,
      register,
      updateRole,
      logout,
      refreshProfile: async () => {
        const response = await api.get('/auth/profile');
        setUser(response.data);
        setSelectedRole(response.data.role || defaultRole);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));
        localStorage.setItem(ROLE_KEY, response.data.role || defaultRole);
        return response.data;
      },
      setSelectedRole,
    }),
    [loading, selectedRole, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
