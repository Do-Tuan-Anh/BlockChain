"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { BookOpen, ChevronDown, LogOut, Settings, UserRound, UserRoundPen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../contexts/LanguageContext';
import { Avatar } from './Avatar';

export function AccountMenu({ name, image }: { name: string; image?: string | null }) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();
  const items = [
    { label: vi ? 'Trang cá nhân' : 'My profile', href: `/${locale}/profile`, icon: UserRound },
    { label: vi ? 'Chỉnh sửa trang cá nhân' : 'Edit profile', href: `/${locale}/profile/edit`, icon: UserRoundPen },
    { label: vi ? 'Cài đặt' : 'Settings', href: `/${locale}/settings`, icon: Settings },
    { label: vi ? 'Hướng dẫn' : 'Help', href: `/${locale}/help`, icon: BookOpen },
  ];
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div ref={container} className="relative min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      aria-label={`${vi ? 'Menu tài khoản' : 'Account menu'}: ${name}`}
      onClick={() => setOpen(value => !value)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}
      className={`flex min-w-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${open ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
      <Avatar src={image} name={name} className="h-9 w-9 text-sm" />
      <span className="max-w-24 truncate text-sm font-medium text-slate-700 sm:max-w-32">{name}</span>
      <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div ref={menu} id={menuId} role="menu" aria-label={vi ? 'Tài khoản' : 'Account'}
      className="absolute right-0 mt-3 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
      onKeyDown={event => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
          setOpen(false); trigger.current?.focus(); return;
        }
        const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || []);
        const index = entries.indexOf(document.activeElement as HTMLElement);
        const key = event.key;
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
          event.preventDefault();
          const target = key === 'Home' ? 0 : key === 'End' ? entries.length - 1 : (index + (key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
          entries[target]?.focus();
        }
      }}>
      <div role="presentation" className="mb-1 border-b border-slate-100 px-3 py-3">
        <p className="text-xs text-slate-400">{vi ? 'Tài khoản của bạn' : 'Your account'}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{name}</p>
      </div>
      {items.map(({ label, href, icon: Icon }) => <a key={href} role="menuitem" tabIndex={-1} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-700 outline-none hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700"><Icon size={18} className="shrink-0" />{label}</a>)}
      <div role="separator" className="my-1 border-t border-slate-100" />
      <button role="menuitem" tabIndex={-1} type="button" disabled={leaving} onClick={async () => {
        setLeaving(true); setError(false);
        try { await signOut({ callbackUrl: `/${locale}` }); }
        catch { setLeaving(false); setError(true); }
      }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 outline-none hover:bg-red-50 focus:bg-red-50 disabled:opacity-50"><LogOut size={18} />{leaving ? (vi ? 'Đang đăng xuất…' : 'Signing out…') : (vi ? 'Đăng xuất' : 'Sign out')}</button>
      {error && <p role="alert" className="px-3 py-2 text-xs text-red-600">{vi ? 'Chưa thể đăng xuất. Vui lòng thử lại.' : 'Could not sign out. Please try again.'}</p>}
    </div>}
  </div>;
}
