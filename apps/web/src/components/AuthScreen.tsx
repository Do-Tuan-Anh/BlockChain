"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { authCopy } from '@/lib/auth-copy';
import { useClientReady } from './useClientReady';

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';
const inputClass = 'w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/15 disabled:bg-inset';
const buttonClass = 'flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/15 transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

export function AuthScreen({ mode }: { mode: Mode }) {
  return <Suspense fallback={<div className="p-12 text-center" aria-busy="true">TrustChain…</div>}><AuthForm mode={mode} /></Suspense>;
}

function AuthForm({ mode }: { mode: Mode }) {
  const clientReady = useClientReady();
  const { locale } = useTranslation();
  const copy = authCopy[locale];
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(params.get('error') || '');
  const [success, setSuccess] = useState('');
  const [resend, setResend] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const [providersError, setProvidersError] = useState(false);
  const token = params.get('token') || '';
  const requestedNext = params.get('next') || `/${locale}/profile`;
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\') ? requestedNext : `/${locale}/profile`;
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [verificationAttempt, setVerificationAttempt] = useState(0);
  const verification = useRef<{ key: string; result: Promise<{ ok: boolean; error?: string }> } | null>(null);
  const isNewPassword = mode === 'register' || mode === 'reset';
  const social = mode === 'login' || mode === 'register';

  useEffect(() => {
    if (mode !== 'verify') return;
    setSuccess(''); setError('');
    if (!validToken) { setError('MISSING_TOKEN'); setBusy(false); return; }
    setBusy(true);
    const key = `${token}:${verificationAttempt}`;
    // Share the request across React Strict Mode's effect setup/cleanup cycle.
    if (verification.current?.key !== key) verification.current = { key, result:
      fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        .then(async response => { const data = await response.json(); return { ok: response.ok, error: data.error }; })
        .catch(() => ({ ok: false, error: 'SERVICE_UNAVAILABLE' })) };
    let active = true;
    verification.current.result.then(result => {
      if (!active) return;
      if (result.ok) setSuccess('verified');
      else setError(result.error || 'default');
      setBusy(false);
    });
    return () => { active = false; };
  }, [mode, token, validToken, verificationAttempt]);

  useEffect(() => {
    if (!social) return;
    getProviders().then(value => {
      if (!value) throw new Error('Unavailable');
      setProviders(Object.keys(value));
    }).catch(() => setProvidersError(true)).finally(() => setProvidersLoaded(true));
  }, [social]);

  const errorText = error ? copy.errors[error as keyof typeof copy.errors] || copy.errors.default : '';
  const title = mode === 'verify' && busy && !resend ? copy.verifyingTitle : success ? (mode === 'verify' && success === 'verified' ? copy.verifiedTitle : mode === 'reset' ? copy.resetTitle : copy.checkInbox) : copy[mode];
  const description = copy[`${mode}Desc` as keyof typeof copy] as string;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (mode === 'verify' && !resend) { setVerificationAttempt(value => value + 1); return; }
    setError('');
    if (isNewPassword && !resend && password !== confirm) { setError('PASSWORD_MISMATCH'); return; }
    setBusy(true);
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      if (mode === 'login' && !resend) {
        const result = await signIn('credentials', { identifier: fields.identifier, password, redirect: false, callbackUrl: next });
        if (result?.error || !result?.ok) setError(result?.error || 'default');
        else window.location.assign(next);
      } else {
        const action = resend ? 'resend-verification' : ({ register: 'register', forgot: 'forgot-password', reset: 'reset-password', verify: 'verify-email' } as const)[mode as Exclude<Mode, 'login'>];
        const response = await fetch(`/api/auth/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, password: password || undefined, token: token || undefined }) });
        const data = await response.json();
        if (!response.ok) setError(data.error || 'default');
        else { setSuccess(resend ? 'resendSent' : mode === 'register' ? 'registered' : mode === 'forgot' ? 'resetSent' : mode === 'verify' ? 'verified' : 'resetDone'); setResend(false); }
      }
    } catch { setError('default'); }
    finally { setBusy(false); }
  }

  async function socialSignIn(provider: string) {
    setBusy(true); setError('');
    try { await signIn(provider, { callbackUrl: next }); }
    catch { setError('default'); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <a href={`/${locale}`} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-accent-soft"><ArrowLeft size={16} />{copy.back}</a>
      <div className="auth-layout">
        <aside className="auth-aside relative hidden flex-col justify-between overflow-hidden p-12 text-ink lg:flex">
          <div aria-hidden="true" className="absolute -right-28 -top-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative">
            <div className="mb-16 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-surface/10"><ShieldCheck size={30} /></div>
            <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-accent-soft">{copy.eyebrow}</p>
            <h2 className="whitespace-pre-line text-4xl font-bold leading-tight tracking-tight">{copy.hero}</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted">{copy.intro}</p>
            <ul className="mt-10 space-y-5">{copy.benefits.map(text => <li key={text} className="flex items-center gap-3 text-sm text-muted"><span className="rounded-full bg-accent/10 p-1 text-accent-soft"><Check size={14} /></span>{text}</li>)}</ul>
          </div>
          <div className="relative mt-16 border-t border-white/10 pt-6 text-xs text-muted">TrustChain · {copy.footer}</div>
        </aside>

        <section className="px-6 py-9 sm:px-12 sm:py-12">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent-soft">{success ? <CheckCircle2 size={24} /> : mode === 'verify' || mode === 'forgot' ? <Mail size={23} /> : <LockKeyhole size={22} />}</div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
          <p className="mb-7 mt-3 text-sm leading-6 text-muted">{mode === 'verify' && busy && !resend ? copy.verifyingDesc : success ? copy[success as keyof typeof copy] as string : description}</p>

          {error && <div role="alert" className="mb-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm leading-6 text-danger">{error === 'PASSWORD_MISMATCH' ? copy.passwordMismatch : errorText}</div>}

          {success && !resend ? <div className="space-y-4">
            <a href={`/${locale}/login?next=${encodeURIComponent(next)}`} className={buttonClass}>{copy.loginLink}<ArrowRight size={16} /></a>
            {(mode === 'register' || (mode === 'verify' && success !== 'verified')) && <button onClick={() => { setResend(true); setSuccess(''); }} className="w-full text-sm font-medium text-accent-soft">{copy.resend}</button>}
          </div> : <>
            {social && !resend && <>
              <div className="grid grid-cols-2 gap-3">
                {['google', 'facebook'].map(provider => <button key={provider} title={providersLoaded && !providers.includes(provider) ? copy.socialUnavailable : undefined} disabled={busy || !providers.includes(provider)} onClick={() => socialSignIn(provider)} className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-sm font-semibold transition hover:bg-inset focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40">
                  <span aria-hidden="true" className={`text-xl font-bold ${provider === 'google' ? 'text-secondary' : 'text-accent-soft'}`}>{provider === 'google' ? 'G' : 'f'}</span>{provider === 'google' ? 'Google' : 'Facebook'}
                </button>)}
              </div>
              {providersLoaded && (providersError || providers.filter(p => p !== 'credentials').length === 0) && <p className="mt-2 text-xs text-muted">{providersError ? copy.socialError : copy.socialUnavailable}</p>}
              <div className="my-6 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-elevated" />{copy.or}<div className="h-px flex-1 bg-elevated" /></div>
            </>}

            {resend && <p className="mb-4 text-sm text-muted">{copy.resendDesc}</p>}
            <form onSubmit={submit} className="space-y-4" aria-busy={!clientReady || busy}>
              <fieldset disabled={!clientReady || busy} className="space-y-4">
                {mode === 'register' && !resend && <div><label htmlFor="name" className="mb-1.5 block text-sm font-medium">{copy.name}</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Nguyễn Minh Anh" className={inputClass} /></div>}
                {(mode === 'register' || mode === 'forgot' || resend) && <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium">{copy.email}</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" className={inputClass} /></div>}
                {mode === 'register' && !resend && <div><label htmlFor="phone" className="mb-1.5 block text-sm font-medium">{copy.phone} <span className="font-normal text-muted">({copy.optional})</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={24} placeholder="+84 912 345 678" aria-describedby="phone-hint" className={inputClass} /><p id="phone-hint" className="mt-1.5 text-xs leading-5 text-muted">{copy.phoneHint}</p></div>}
                {mode === 'login' && !resend && <div><label htmlFor="identifier" className="mb-1.5 block text-sm font-medium">{copy.identifier}</label><input id="identifier" name="identifier" autoComplete="username" required maxLength={254} placeholder="you@example.com / 0912 345 678" className={inputClass} /></div>}
                {(mode === 'login' || isNewPassword) && !resend && <div>
                  <div className="mb-1.5 flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium">{copy.password}</label>{mode === 'login' && <a href={`/${locale}/forgot-password`} className="text-xs font-medium text-accent-soft hover:underline">{copy.forgotLink}</a>}</div>
                  <div className="relative"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isNewPassword ? 'new-password' : 'current-password'} required minLength={isNewPassword ? 10 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-12`} /><button type="button" aria-label={showPassword ? copy.hide : copy.show} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 text-muted hover:text-accent-soft">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                  {isNewPassword && <p className={`mt-2 flex items-center gap-1 text-xs ${password.length >= 10 ? 'text-positive' : 'text-muted'}`}><Check size={12} />{copy.passwordHint}</p>}
                </div>}
                {isNewPassword && !resend && <div><label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">{copy.confirm}</label><input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} />{confirm && <p className={`mt-2 text-xs ${confirm === password ? 'text-positive' : 'text-warning'}`}>{confirm === password ? copy.passwordMatch : copy.passwordMismatch}</p>}</div>}
              </fieldset>
              {(mode !== 'verify' || resend || validToken) && <button disabled={!clientReady || busy || (!resend && mode === 'reset' && !validToken)} className={buttonClass}>{busy ? copy.busy : resend ? copy.resend : mode === 'login' ? copy.loginButton : mode === 'register' ? copy.registerButton : mode === 'forgot' ? copy.sendLink : mode === 'reset' ? copy.resetButton : copy.retryVerification}<ArrowRight size={16} /></button>}
            </form>
            {mode === 'reset' && <a href={`/${locale}/forgot-password`} className="mt-5 block text-center text-sm text-accent-soft">{copy.sendLink}</a>}
            {(mode === 'verify' || mode === 'login') && !resend && <button disabled={!clientReady || busy} onClick={() => { setResend(true); setError(''); }} className="mt-5 w-full text-sm font-medium text-accent-soft disabled:opacity-50">{copy.resend}</button>}
            {mode === 'verify' && !resend && !busy && <a href={`/${locale}/login?next=${encodeURIComponent(next)}`} className="mt-4 block text-center text-sm text-secondary">{copy.loginLink}</a>}
            {resend && <button onClick={() => setResend(false)} className="mt-4 w-full text-sm text-muted">{copy.loginLink}</button>}
          </>}
          {social && <p className="mt-7 text-center text-sm text-muted">{mode === 'login' ? copy.noAccount : copy.hasAccount} <a href={`/${locale}/${mode === 'login' ? 'register' : 'login'}?next=${encodeURIComponent(next)}`} className="font-semibold text-accent-soft hover:underline">{mode === 'login' ? copy.registerLink : copy.loginLink}</a></p>}
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} />{copy.secure}</p>
        </section>
      </div>
    </div>
  );
}
