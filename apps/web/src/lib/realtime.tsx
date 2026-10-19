'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { BASE_URL, tokenStore } from './api';
import { useSession } from './session';
import type { Order } from './types';

export type OrderEventType = 'created' | 'items-added' | 'items-updated' | 'completed' | 'cancelled';

export interface OrderEvent {
  type: OrderEventType;
  order: Order;
  itemIds?: string[];
  actor: { id: string; name: string };
}

type Listener = (event: OrderEvent) => void;

interface RealtimeValue {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeValue>({ connected: false, subscribe: () => () => {} });

// Socket.IO lives on the API server's origin, not under /api
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? new URL(BASE_URL).origin;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, restaurant } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set<Listener>());

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // One socket per signed-in user
  useEffect(() => {
    if (!user) return;
    const s = io(SOCKET_URL, { auth: { token: tokenStore.get() } });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('order:event', (event: OrderEvent) => listeners.current.forEach((l) => l(event)));
    socketRef.current = s;
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Superadmins pick a restaurant at runtime; (re)join its room whenever we (re)connect
  useEffect(() => {
    if (connected && user?.role === 'superadmin' && restaurant) {
      socketRef.current?.emit('restaurant:join', restaurant._id);
    }
  }, [connected, user, restaurant]);

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeStatus() {
  return useContext(RealtimeContext).connected;
}

/** Calls `handler` for every order event in the active restaurant. */
export function useOrderEvents(handler: Listener) {
  const { subscribe } = useContext(RealtimeContext);
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
