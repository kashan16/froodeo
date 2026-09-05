'use client';

import type { User } from '@/app/api/types';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Kept in a module-level variable, never localStorage. A 15-minute access
// token in localStorage is readable by any injected/XSS script; a JS
// variable resets on reload and gets silently re-fetched via the httpOnly
// refresh cookie instead.
let inMemoryAccessToken: string | null = null;

export async function apiFetch(url: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    if (refreshed.ok) {
      const { accessToken } = await refreshed.json();
      inMemoryAccessToken = accessToken;
      return apiFetch(url, options, false);
    }
  }
  return res;
}

export function hasAccessToken(): boolean {
  return inMemoryAccessToken !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('no session');
        const { accessToken, user: u } = await res.json();
        inMemoryAccessToken = accessToken;
        setUser(u);
      } catch {
        inMemoryAccessToken = null;
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to send OTP');
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Invalid OTP');
    const { accessToken, user: u } = await res.json();
    inMemoryAccessToken = accessToken;
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    inMemoryAccessToken = null;
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}