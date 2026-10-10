'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const storageKey = 'trustchain-theme';
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setCurrentTheme] = useState<Theme>('dark');
  useEffect(() => {
    setCurrentTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      setCurrentTheme(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    setCurrentTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Theme still works when storage is unavailable. */ }
  };
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
