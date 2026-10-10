"use client";

import { ArrowUpRight, Shield } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export function ClientFooter() {
  const { t, locale } = useTranslation();
  return <footer className="site-footer">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-8 border-b border-line/70 pb-8 md:flex-row md:items-center">
        <div><a href={`/${locale}`} className="brand"><Shield size={24} className="text-accent-soft" aria-hidden="true" /><span>TrustChain<span className="text-positive">.</span></span></a><p className="mt-3 text-sm text-muted">{locale === 'vi' ? 'Kết nối sản phẩm, con người và công nghệ.' : 'Connecting products, people and technology.'}</p></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-4 text-sm text-secondary" aria-label={locale === 'vi' ? 'Liên kết cuối trang' : 'Footer links'}>
          {[['explore', 'exploreCatalog'], ['nfts', 'passportVault'], ['admin', 'disputeArbiter']].map(([path, key]) => <a key={path} href={`/${locale}/${path}`} className="inline-flex items-center gap-1.5 hover:text-accent-soft">{t(`footer.${key}`)}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
        </nav>
      </div>
      <div className="flex flex-col justify-between gap-4 pt-6 text-xs text-muted sm:flex-row sm:items-center"><p>{t('footer.copyright')}</p><LanguageSwitcher /></div>
    </div>
  </footer>;
}
