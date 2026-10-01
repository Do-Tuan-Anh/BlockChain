"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
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
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("trustchain-locale") as Locale;
    if (saved && (saved === "en" || saved === "vi")) {
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
