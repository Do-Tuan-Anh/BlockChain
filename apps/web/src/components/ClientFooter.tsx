"use client";

import React from "react";
import { useTranslation } from "../contexts/LanguageContext";

export const ClientFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t border-gray-200 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <p>{t("footer.copyright")}</p>
        <div className="flex space-x-6">
          <a href="/explore" className="hover:text-gray-900">{t("footer.exploreCatalog")}</a>
          <a href="/nfts" className="hover:text-gray-900">{t("footer.passportVault")}</a>
          <a href="/admin" className="hover:text-gray-900">{t("footer.disputeArbiter")}</a>
        </div>
      </div>
    </footer>
  );
};
