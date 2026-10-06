'use client';
import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation, Locale } from '../contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => <Suspense fallback={<span className="text-xs text-gray-400">English / Tiếng Việt</span>}><LanguageLinks /></Suspense>;

function LanguageLinks() {
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
    <div className="flex items-center space-x-1 text-xs text-gray-400">
      <a
        href={localeHref('en')}
        hrefLang="en"
        aria-current={locale === 'en' ? 'page' : undefined}
        className={locale === 'en' ? 'text-gray-700 font-semibold' : 'hover:text-gray-600 transition'}
      >
        English
      </a>
      <span>/</span>
      <a
        href={localeHref('vi')}
        hrefLang="vi"
        aria-current={locale === 'vi' ? 'page' : undefined}
        className={locale === 'vi' ? 'text-gray-700 font-semibold' : 'hover:text-gray-600 transition'}
      >
        Tiếng Việt
      </a>
    </div>
  );
};
