'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type Account,
  type SessionUser,
  addAccount,
  findAccount,
  normalizeEmail,
  readAccounts,
  readSession,
  writeAccounts,
  writeSession,
} from '@/lib/auth';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  /** True once the session has hydrated from storage. */
  ready: boolean;
  register: (input: { name: string; email: string }) => AuthResult;
  login: (input: { email: string }) => AuthResult;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readSession());
    setReady(true);
  }, []);

  const register = useCallback(({ name, email }: { name: string; email: string }): AuthResult => {
    const accounts = readAccounts();
    if (findAccount(accounts, email)) {
      return { ok: false, error: 'An account with this email already exists. Try signing in.' };
    }
    const account: Account = { email: normalizeEmail(email), name: name.trim() };
    writeAccounts(addAccount(accounts, account));
    writeSession(account);
    setUser(account);
    return { ok: true };
  }, []);

  const login = useCallback(({ email }: { email: string }): AuthResult => {
    const account = findAccount(readAccounts(), email);
    if (!account) {
      return { ok: false, error: 'No account found for this email. Create one to continue.' };
    }
    writeSession(account);
    setUser(account);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, register, login, logout }),
    [user, ready, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
