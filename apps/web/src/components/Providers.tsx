"use client";

import React from "react";
import { LanguageProvider } from "../contexts/LanguageContext";
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '../contexts/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider><SessionProvider>{children}</SessionProvider></ThemeProvider>
    </LanguageProvider>
  );
}
