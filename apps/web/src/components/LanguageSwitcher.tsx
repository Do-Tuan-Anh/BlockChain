"use client";

import React from "react";
import { useTranslation, Locale } from "../contexts/LanguageContext";

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useTranslation();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "vi" : "en");
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm font-medium px-3 py-1.5 rounded-lg transition"
      title={locale === "en" ? "Chuyển sang Tiếng Việt" : "Switch to English"}
    >
      <span className="text-base">{locale === "en" ? "🇬🇧" : "🇻🇳"}</span>
      <span className="text-xs font-semibold text-gray-700">
        {locale === "en" ? "EN" : "VI"}
      </span>
    </button>
  );
};
