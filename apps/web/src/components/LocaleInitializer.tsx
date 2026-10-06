'use client';
import { useEffect } from 'react';
import { useTranslation, Locale } from '../contexts/LanguageContext';

export function LocaleInitializer({ locale }: { locale: Locale }) {
  const { setLocale } = useTranslation();
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  return null;
}
