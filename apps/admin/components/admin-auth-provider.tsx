'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type StaffUser,
  nameFromEmail,
  normalizeEmail,
  readStaffSession,
  writeStaffSession,
} from '@/lib/admin-auth';

interface AdminAuthContextValue {
  user: StaffUser | null;
  /** True once the session has hydrated from storage. */
  ready: boolean;
  /** Start a demo staff session (no real credential check — preview only). */
  login: (input: { email: string }) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readStaffSession());
    setReady(true);
  }, []);

  const login = useCallback(({ email }: { email: string }) => {
    const staff: StaffUser = { email: normalizeEmail(email), name: nameFromEmail(email) };
    writeStaffSession(staff);
    setUser(staff);
  }, []);

  const logout = useCallback(() => {
    writeStaffSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
}
