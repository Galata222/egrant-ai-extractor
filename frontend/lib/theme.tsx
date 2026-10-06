"use client";

import { createContext, useContext, useLayoutEffect, useSyncExternalStore } from "react";

const EVENT = "egrant-theme";
const STORAGE_KEY = "egrant-theme";

export type Theme = "light" | "dark";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
}

function readTheme(): Theme {
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  useLayoutEffect(() => {
    applyTheme(readTheme());
  }, []);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT));
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is missing");
  return value;
}
