import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Check auth using cookie
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 🔐 LOGIN (email/password)
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });

    // ✅ backend already sets cookie
    setUser(res.data);

    return res.data;
  };

  // 🆕 REGISTER
  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });

    setUser(res.data);

    return res.data;
  };

  // 🔵 GOOGLE LOGIN
  const googleLogin = async (access_token) => {
    const res = await api.post('/auth/google-callback', { access_token });

    // ✅ cookie set by backend
    setUser(res.data);
  };

  // 🚪 LOGOUT
  const logout = async () => {
    await api.post('/auth/logout'); // clears cookie in backend
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        logout,
        googleLogin,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
