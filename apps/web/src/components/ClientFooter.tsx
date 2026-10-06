"use client";

import React from "react";
import { useTranslation } from "../contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const ClientFooter: React.FC = () => {
  const { t, locale } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <p>{t("footer.copyright")}</p>
        <div className="flex space-x-6">
          <a href={`/${locale}/explore`} className="hover:text-gray-900">{t("footer.exploreCatalog")}</a>
          <a href={`/${locale}/nfts`} className="hover:text-gray-900">{t("footer.passportVault")}</a>
          <a href={`/${locale}/admin`} className="hover:text-gray-900">{t("footer.disputeArbiter")}</a>
        </div>
        <LanguageSwitcher />
      </div>
    </footer>
  );
};
