import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../utils/api';

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(r  => setUser(r.data.user))
      .catch(() => localStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  const login  = (token, u) => { localStorage.setItem('token', token); setUser(u); };
  const logout = ()         => { localStorage.clear(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
