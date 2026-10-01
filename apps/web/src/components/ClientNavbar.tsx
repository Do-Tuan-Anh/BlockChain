"use client";

import React from "react";
import { useTranslation } from "../contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const ClientNavbar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <a href="/" className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-xs">
            🛡️
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">
            Trust<span className="text-blue-600">Chain</span>
          </span>
        </a>

        {/* Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-lg items-center relative">
          <input
            type="text"
            placeholder={t("nav.searchPlaceholder")}
            className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
          <span className="absolute right-3 text-gray-400 text-sm">🔍</span>
        </div>

        {/* Navigation Actions */}
        <nav className="flex items-center space-x-3">
          <a
            href="/explore"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition hidden sm:inline-block"
          >
            {t("nav.explore")}
          </a>
          <a
            href="/nfts"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition hidden sm:inline-block"
          >
            {t("nav.passportVault")}
          </a>
          <a
            href="/admin"
            className="text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition hidden md:inline-block"
          >
            {t("nav.arbitration")}
          </a>
          <a
            href="/profile"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 transition hidden sm:inline-block"
          >
            {t("nav.profile")}
          </a>
          <a
            href="/create-listing"
            className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition"
          >
            {t("nav.listProduct")}
          </a>
          <LanguageSwitcher />
          <button
            type="button"
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center space-x-2 shadow-xs"
          >
            <span>{t("nav.connectWallet")}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
