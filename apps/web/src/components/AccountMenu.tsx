"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { BookOpen, ChevronDown, Globe, LogOut, Moon, Settings, Sun, UserRound, UserRoundPen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../contexts/LanguageContext';
import { Avatar } from './Avatar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTheme } from '../contexts/ThemeContext';

export function AccountMenu({ name, image }: { name: string; image?: string | null }) {
  const { locale } = useTranslation();
  const vi = locale === 'vi';
  const { theme, setTheme } = useTheme();
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
      className={`flex min-w-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${open ? 'border-accent/30 bg-accent/10' : 'border-transparent hover:border-line hover:bg-inset'}`}>
      <Avatar src={image} name={name} className="h-9 w-9 text-sm" />
      <span className="hidden max-w-24 truncate text-sm font-medium text-secondary sm:block sm:max-w-32">{name}</span>
      <ChevronDown size={15} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div ref={menu} id={menuId} role="menu" aria-label={vi ? 'Tài khoản' : 'Account'}
      className="absolute right-0 mt-3 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-surface/95 backdrop-blur-xl p-2 shadow-2xl shadow-black/40"
      onKeyDown={event => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
          setOpen(false); trigger.current?.focus(); return;
        }
        const entries = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)') || []);
        const index = entries.indexOf(document.activeElement as HTMLElement);
        const key = event.key;
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
          event.preventDefault();
          const target = key === 'Home' ? 0 : key === 'End' ? entries.length - 1 : (index + (key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
          entries[target]?.focus();
        }
      }}>
      <div role="presentation" className="mb-1 border-b border-line px-3 py-3">
        <p className="text-xs text-muted">{vi ? 'Tài khoản của bạn' : 'Your account'}</p><p className="mt-1 truncate text-sm font-semibold text-ink">{name}</p>
      </div>
      {items.map(({ label, href, icon: Icon }) => <a key={href} role="menuitem" tabIndex={-1} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-secondary outline-none hover:bg-accent/10 hover:text-accent-soft focus:bg-accent/10 focus:text-accent-soft"><Icon size={18} className="shrink-0" />{label}</a>)}
      <div role="separator" className="my-2 border-t border-line" />
      <div className="px-3 py-2">
        <p id={`${menuId}-theme`} className="mb-3 text-xs font-semibold text-muted">{vi ? 'Giao diện' : 'Appearance'}</p>
        <div role="group" aria-labelledby={`${menuId}-theme`} className="preference-switch">
          <button type="button" role="menuitemradio" aria-checked={theme === 'light'} tabIndex={-1} onClick={() => setTheme('light')}><Sun size={16} aria-hidden="true" />{vi ? 'Sáng' : 'Light'}</button>
          <button type="button" role="menuitemradio" aria-checked={theme === 'dark'} tabIndex={-1} onClick={() => setTheme('dark')}><Moon size={16} aria-hidden="true" />{vi ? 'Tối' : 'Dark'}</button>
        </div>
      </div>
      <div className="px-3 py-3">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted"><Globe size={14} aria-hidden="true" />{vi ? 'Ngôn ngữ' : 'Language'}</p>
        <LanguageSwitcher inMenu />
      </div>
      <div role="separator" className="my-1 border-t border-line" />
      <button role="menuitem" tabIndex={-1} type="button" disabled={leaving} onClick={async () => {
        setLeaving(true); setError(false);
        try { await signOut({ callbackUrl: `/${locale}` }); }
        catch { setLeaving(false); setError(true); }
      }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger outline-none hover:bg-danger/10 focus:bg-danger/10 disabled:opacity-50"><LogOut size={18} />{leaving ? (vi ? 'Đang đăng xuất…' : 'Signing out…') : (vi ? 'Đăng xuất' : 'Sign out')}</button>
      {error && <p role="alert" className="px-3 py-2 text-xs text-danger">{vi ? 'Chưa thể đăng xuất. Vui lòng thử lại.' : 'Could not sign out. Please try again.'}</p>}
    </div>}
  </div>;
}
