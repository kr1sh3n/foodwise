import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Fetch JSON from the API; `reload()` refetches. Optional polling interval. */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);
  const reload = useCallback(async (silent = false) => {
    if (!path) return;
    const id = ++seq.current;
    if (!silent) setLoading(true);
    try { const d = await api<T>(path); if (id === seq.current) { setData(d); setError(null); } }
    catch (e) { if (id === seq.current) setError((e as Error).message); }
    finally { if (id === seq.current) setLoading(false); }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!pollMs || !path) return;
    const t = setInterval(() => document.visibilityState === 'visible' && reload(true), pollMs);
    return () => clearInterval(t);
  }, [pollMs, path, reload]);
  return { data, error, loading, reload, setData };
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), intervalMs); return () => clearInterval(t); }, [intervalMs]);
  return now;
}

export function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}
