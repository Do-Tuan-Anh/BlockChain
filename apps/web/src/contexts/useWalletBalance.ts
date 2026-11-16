'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Balance { address: string; scope: string; balanceWei: string; balanceEth: string }
export function useWalletBalance(userId: string, linked: string, scope: string) {
  const key = userId && linked && scope ? `${userId}:${linked.toLowerCase()}:${scope}` : '';
  const currentKey = useRef(key); currentKey.current = key;
  const pending = useRef<{ key: string; controller: AbortController; promise: Promise<void> } | null>(null);
  const [state, setState] = useState<{ key: string; data: Balance | null; loading: boolean; error: boolean }>({ key: '', data: null, loading: false, error: false });
  const refreshBalance = useCallback((): Promise<void> => {
    if (!key) return Promise.resolve();
    if (pending.current?.key === key) return pending.current.promise;
    pending.current?.controller.abort();
    const controller = new AbortController();
    setState(previous => ({ key, data: previous.key === key ? previous.data : null, loading: true, error: false }));
    const promise = (async () => {
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch('/api/chain/balance', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('BALANCE_UNAVAILABLE');
        const data: Balance = await response.json();
        if (data.address.toLowerCase() !== linked.toLowerCase() || data.scope !== scope) throw new Error('BALANCE_SCOPE_MISMATCH');
        if (currentKey.current === key && pending.current?.controller === controller) setState({ key, data, loading: false, error: false });
      } catch {
        if (currentKey.current === key && pending.current?.controller === controller) setState({ key, data: null, loading: false, error: true });
      } finally {
        clearTimeout(timeout);
        if (pending.current?.controller === controller) pending.current = null;
      }
    })();
    pending.current = { key, controller, promise };
    return promise;
  }, [key, linked, scope]);
  useEffect(() => {
    void refreshBalance();
    const visible = () => { if (!document.hidden) void refreshBalance(); };
    const timer = setInterval(visible, 30000);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
      pending.current?.controller.abort();
      pending.current = null;
    };
  }, [refreshBalance]);
  return {
    balance: key && state.key === key ? state.data : null,
    balanceLoading: !!key && (state.key !== key || state.loading),
    balanceError: !!key && state.key === key && state.error,
    refreshBalance,
  };
}
