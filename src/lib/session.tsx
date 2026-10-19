'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';
import type { Restaurant, Role, User } from './types';

const ACTIVE_RESTAURANT_KEY = 'pos.restaurant';

interface SessionValue {
  user: User | null;
  ready: boolean;
  /** The restaurant every scoped page works against. Fixed for non-superadmins. */
  restaurant: Restaurant | null;
  setRestaurant: (r: Restaurant | null) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export const HOME_BY_ROLE: Record<Role, string> = {
  superadmin: '/restaurants',
  admin: '/dashboard',
  staff: '/floor',
  kitchen: '/kitchen',
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurantState] = useState<Restaurant | null>(null);
  const [ready, setReady] = useState(false);

  const applyUser = useCallback(async (u: User) => {
    setUser(u);
    if (u.role !== 'superadmin') {
      setRestaurantState(typeof u.restaurant === 'object' ? u.restaurant : null);
      return;
    }
    const savedId = localStorage.getItem(ACTIVE_RESTAURANT_KEY);
    if (savedId) {
      const saved = await api<Restaurant>(`/restaurants/${savedId}`).catch(() => null);
      setRestaurantState(saved);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
    setUser(null);
    setRestaurantState(null);
  }, []);

  useEffect(() => {
    async function restore() {
      if (tokenStore.get()) {
        try {
          const { user } = await api<{ user: User }>('/auth/me');
          await applyUser(user);
        } catch {
          tokenStore.clear();
        }
      }
      setReady(true);
    }
    restore();
  }, [applyUser]);

  useEffect(() => {
    window.addEventListener('pos:unauthorized', logout);
    return () => window.removeEventListener('pos:unauthorized', logout);
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: User }>('/auth/login', 'POST', { email, password });
      tokenStore.set(res.token);
      await applyUser(res.user);
      return res.user;
    },
    [applyUser],
  );

  const setRestaurant = useCallback((r: Restaurant | null) => {
    if (r) localStorage.setItem(ACTIVE_RESTAURANT_KEY, r._id);
    else localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
    setRestaurantState(r);
  }, []);

  const value = useMemo(
    () => ({ user, ready, restaurant, setRestaurant, login, logout }),
    [user, ready, restaurant, setRestaurant, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** API path prefix for the active restaurant, or null when none is selected. */
export function useScope() {
  const { restaurant } = useSession();
  return restaurant ? `/restaurants/${restaurant._id}` : null;
}
