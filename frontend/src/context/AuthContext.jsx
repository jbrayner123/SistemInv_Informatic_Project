import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);

/**
 * Proveedor de autenticación.
 * Persiste { token, rol, username, nombre_completo } en localStorage.
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem('sisteminv_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    const sessionData = {
      token: data.token,
      rol: data.rol,
      username: data.username,
      nombre_completo: data.nombre_completo,
    };
    localStorage.setItem('sisteminv_session', JSON.stringify(sessionData));
    setSession(sessionData);
    return sessionData;
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await api.logout(session.token);
      } catch {
        // El servidor puede estar caído; limpiar sesión local de todas formas.
      }
    }
    localStorage.removeItem('sisteminv_session');
    setSession(null);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
