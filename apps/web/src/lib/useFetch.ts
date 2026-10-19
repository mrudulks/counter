'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { errorMessage } from './format';

interface State<T> {
  path: string | null;
  data: T | null;
  error: string | null;
}

/** Loads `path` (skips when null) and optionally re-polls every `pollMs`. */
export function useFetch<T>(path: string | null, pollMs?: number) {
  const [state, setState] = useState<State<T>>({ path: null, data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let active = true;
    const load = () =>
      api<T>(path).then(
        (data) => active && setState({ path, data, error: null }),
        (err) =>
          active &&
          setState((s) => ({ path, data: s.path === path ? s.data : null, error: errorMessage(err) })),
      );
    load();
    const id = pollMs ? setInterval(load, pollMs) : undefined;
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [path, pollMs, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update: T | null | ((prev: T | null) => T | null)) =>
      setState((s) => ({
        ...s,
        data: typeof update === 'function' ? (update as (prev: T | null) => T | null)(s.data) : update,
      })),
    [],
  );

  // Data from a previous path is never shown for the current one
  const current = state.path === path;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: Boolean(path) && !current,
    reload,
    setData,
  };
}
