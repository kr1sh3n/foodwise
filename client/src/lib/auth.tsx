import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import type { Role, User } from './types';

interface AuthCtx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (d: { name: string; email: string; password: string; role: Role; organization?: string; campus?: string }) => Promise<User>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    api<{ user: User }>('/auth/me').then((r) => setUser(r.user)).catch(() => logout()).finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', { body: { email, password } });
    tokenStore.set(r.token); setUser(r.user); return r.user;
  };
  const register: AuthCtx['register'] = async (d) => {
    const r = await api<{ token: string; user: User }>('/auth/register', { body: d });
    tokenStore.set(r.token); setUser(r.user); return r.user;
  };
  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

/** Where to send the user right after they sign in or sign up (read by the GuestOnly route guard). */
export const afterAuth = { path: '/dashboard' };
