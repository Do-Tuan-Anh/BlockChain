"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import en from "../locales/en.json";
import vi from "../locales/vi.json";

export type Locale = "en" | "vi";

const locales: Record<Locale, Record<string, any>> = { en, vi };

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Get initial locale from URL if available, fallback to 'en'
  const getInitialLocale = (): Locale => {
    if (!pathname) return "en";
    const segments = pathname.split("/");
    if (segments[1] === "vi") return "vi";
    if (segments[1] === "en") return "en";
    return "en";
  };

  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  // Still update if URL changes and we didn't catch it in state
  useEffect(() => {
    const urlLocale = getInitialLocale();
    if (urlLocale !== locale) {
      setLocaleState(urlLocale);
    }
  }, [pathname]);

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  useEffect(() => {
    const saved = localStorage.getItem("trustchain-locale") as Locale;
    if (saved && (saved === "en" || saved === "vi") && pathname === "/") {
      // Only auto-restore from localstorage if we are at the root
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("trustchain-locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: any = locales[locale];
      for (const k of keys) {
        value = value?.[k];
      }
      return typeof value === "string" ? value : key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export default LanguageContext;

