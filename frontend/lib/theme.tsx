"use client";

import { createContext, useContext, useLayoutEffect, useSyncExternalStore } from "react";

const EVENT = "egrant-theme";
const STORAGE_KEY = "egrant-theme";

export type Theme = "light" | "dark";
export type TextSize = "regular" | "large";

const TEXT_KEY = "egrant-text";

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

function readTextSize(): TextSize {
  return localStorage.getItem(TEXT_KEY) === "large" ? "large" : "regular";
}

function getTextServerSnapshot(): TextSize {
  return "regular";
}

function applyTextSize(size: TextSize) {
  if (size === "large") document.documentElement.dataset.text = "large";
  else delete document.documentElement.dataset.text;
}

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);
  const textSize = useSyncExternalStore(subscribe, readTextSize, getTextServerSnapshot);

  useLayoutEffect(() => {
    applyTheme(readTheme());
    applyTextSize(readTextSize());
  }, []);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT));
  }

  function setTextSize(next: TextSize) {
    localStorage.setItem(TEXT_KEY, next);
    applyTextSize(next);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, textSize, setTextSize }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("ThemeProvider is missing");
  return value;
}
