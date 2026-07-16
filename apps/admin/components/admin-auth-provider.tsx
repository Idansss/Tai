'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  apiLogin,
  apiLogout,
  apiSession,
  hasPermission,
  type AdminIdentity,
  type LoginInput,
  type Permission,
} from '@/lib/admin-auth';

interface AdminAuthContextValue {
  user: AdminIdentity | null;
  /** True once the session has been checked with the server. */
  ready: boolean;
  /** Authenticate against the server; returns an error message on failure. */
  login: (input: LoginInput) => Promise<string | null>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void apiSession().then((identity) => {
      if (active) {
        setUser(identity);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput): Promise<string | null> => {
    const result = await apiLogin(input);
    if (result.ok && result.identity) {
      setUser(result.identity);
      return null;
    }
    return result.error ?? 'Sign in failed.';
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const can = useCallback((permission: Permission) => hasPermission(user, permission), [user]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ user, ready, login, logout, can }),
    [user, ready, login, logout, can],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
