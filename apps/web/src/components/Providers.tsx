"use client";

import React from "react";
import { LanguageProvider } from "../contexts/LanguageContext";
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { WalletProvider } from '../contexts/WalletContext';
import { WalletSessionGuard } from './WalletSessionGuard';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider><SessionProvider><WalletProvider><WalletSessionGuard>{children}</WalletSessionGuard></WalletProvider></SessionProvider></ThemeProvider>
    </LanguageProvider>
  );
}
