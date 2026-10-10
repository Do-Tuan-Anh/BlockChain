"use client";

import { Compass, Layers3, Plus, Scale, Search, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslation } from '../contexts/LanguageContext';
import { AccountMenu } from './AccountMenu';

export function ClientNavbar() {
  const { t, locale } = useTranslation();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const user = session?.user?.id ? session.user : null;
  const links = [
    { href: 'explore', label: t('nav.explore'), icon: Compass },
    { href: 'nfts', label: t('nav.passportVault'), icon: Layers3 },
    ...(user?.role === 'ADMIN' ? [{ href: 'admin', label: locale === 'vi' ? 'Phân xử' : 'Arbitration', icon: Scale }] : []),
  ];
  const navigation = links.map(({ href, label, icon: Icon }) => <a key={href} href={`/${locale}/${href}`} className="nav-link" aria-current={pathname === `/${locale}/${href}` ? 'page' : undefined}><Icon size={17} aria-hidden="true" />{label}</a>);

  return <header className="site-header">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-surface focus:p-3">{locale === 'vi' ? 'Đến nội dung chính' : 'Skip to content'}</a>
    <div className="navbar">
      <a href={`/${locale}`} className="brand" aria-label="TrustChain"><span className="brand-mark"><Shield size={23} strokeWidth={1.8} aria-hidden="true" /></span><span>Trust<span className="text-accent-soft">Chain</span><span className="text-positive">.</span></span></a>
      <nav className="hidden items-center gap-1 lg:flex" aria-label={locale === 'vi' ? 'Điều hướng chính' : 'Main navigation'}>{navigation}</nav>
      <form action={`/${locale}/explore`} role="search" className="nav-search">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-muted" aria-hidden="true" />
        <input type="search" name="q" aria-label={t('nav.searchPlaceholder')} placeholder={locale === 'vi' ? 'Tìm sản phẩm…' : 'Search products…'} />
      </form>
      <div className="flex min-w-0 items-center gap-3">
        <a href={`/${locale}/create-listing`} className="btn-secondary hidden whitespace-nowrap lg:inline-flex"><Plus size={16} aria-hidden="true" />{locale === 'vi' ? 'Đăng sản phẩm' : 'List product'}</a>
        {status !== 'loading' && (user ? <AccountMenu name={user.name || t('nav.profile')} image={user.image} /> : <a href={`/${locale}/login`} className="btn-primary whitespace-nowrap">{locale === 'vi' ? 'Đăng nhập' : 'Sign in'}</a>)}
      </div>
    </div>
    <nav className="mobile-nav" aria-label={locale === 'vi' ? 'Điều hướng di động' : 'Mobile navigation'}>{navigation}<a href={`/${locale}/create-listing`} className="nav-link" aria-current={pathname === `/${locale}/create-listing` ? 'page' : undefined}><Plus size={17} aria-hidden="true" />{locale === 'vi' ? 'Đăng sản phẩm' : 'List product'}</a></nav>
  </header>;
}
