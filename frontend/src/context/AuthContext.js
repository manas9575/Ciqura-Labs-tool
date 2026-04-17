import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Load user from localStorage on refresh
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // 🔐 LOGIN (JWT)
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });

    const { access_token, user } = res.data;

    // ✅ store token + user
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);

    return user;
  };

  // 🆕 REGISTER
  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });

    const { access_token, user } = res.data;

    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);

    return user;
  };

  // 🔵 GOOGLE LOGIN
  const googleLogin = async (access_token) => {
    const res = await api.post('/auth/google-callback', { access_token });

    const { access_token: jwtToken, user } = res.data;

    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
  };

  // 🚪 LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
        googleLogin
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
