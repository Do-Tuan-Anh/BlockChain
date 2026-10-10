'use client';
import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation, Locale } from '../contexts/LanguageContext';

export const LanguageSwitcher = ({ inMenu = false }: { inMenu?: boolean }) => <Suspense fallback={<span className="text-xs text-muted">English / Tiếng Việt</span>}><LanguageLinks inMenu={inMenu} /></Suspense>;

function LanguageLinks({ inMenu }: { inMenu: boolean }) {
  const { locale } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const localeHref = (newLocale: Locale) => {
    // Replace the locale segment in the current path
    // pathname is like /vi/explore or /en/orders/1
    const segments = pathname.split('/');
    // segments[0] = '', segments[1] = locale, rest is the path
    if (segments[1] === 'en' || segments[1] === 'vi') {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const query = searchParams.toString();
    return (segments.join('/') || '/' + newLocale) + (query ? `?${query}` : '');
  };

  return (
    <div role={inMenu ? 'group' : undefined} aria-label={inMenu ? (locale === 'vi' ? 'Ngôn ngữ' : 'Language') : undefined} className={inMenu ? 'preference-switch' : 'flex items-center space-x-1 text-xs text-muted'}>
      <a
        href={localeHref('en')}
        hrefLang="en"
        role={inMenu ? 'menuitemradio' : undefined}
        aria-checked={inMenu ? locale === 'en' : undefined}
        tabIndex={inMenu ? -1 : undefined}
        aria-current={locale === 'en' ? 'page' : undefined}
        className={locale === 'en' ? 'text-secondary font-semibold' : 'hover:text-secondary transition'}
      >
        English
      </a>
      {!inMenu && <span>/</span>}
      <a
        href={localeHref('vi')}
        hrefLang="vi"
        role={inMenu ? 'menuitemradio' : undefined}
        aria-checked={inMenu ? locale === 'vi' : undefined}
        tabIndex={inMenu ? -1 : undefined}
        aria-current={locale === 'vi' ? 'page' : undefined}
        className={locale === 'vi' ? 'text-secondary font-semibold' : 'hover:text-secondary transition'}
      >
        Tiếng Việt
      </a>
    </div>
  );
};
