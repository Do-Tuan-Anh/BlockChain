'use client';
import { Suspense } from 'react';
import { WalletLogin } from './WalletLogin';
// Keep legacy route entry points working while presenting the wallet-only flow.
export function AuthScreen({ mode: _mode }: { mode: 'login' | 'register' | 'forgot' | 'reset' | 'verify' }) {
  return <Suspense fallback={<p className="page-shell" aria-busy="true">TrustChain?</p>}><WalletLogin /></Suspense>;
}
