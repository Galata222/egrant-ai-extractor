"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { copyFor, missingCountLabel, type Lang } from "@/lib/copy";

const EVENT = "egrant-lang";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EVENT, onStoreChange);
  return () => window.removeEventListener(EVENT, onStoreChange);
}

function getSnapshot(): Lang {
  return localStorage.getItem("egrant-lang") === "en" ? "en" : "sk";
}

function getServerSnapshot(): Lang {
  return "sk";
}

const LocaleContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setLang(next: Lang) {
    localStorage.setItem("egrant-lang", next);
    document.documentElement.lang = next;
    window.dispatchEvent(new Event(EVENT));
  }

  return <LocaleContext.Provider value={{ lang, setLang }}>{children}</LocaleContext.Provider>;
}

export function useCopy() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("LocaleProvider is missing");
  }
  return {
    ...copyFor(value.lang),
    lang: value.lang,
    setLang: value.setLang,
    missingCount: (count: number) => missingCountLabel(count, value.lang),
  };
}

export function LanguageSwitch() {
  const copy = useCopy();
  return (
    <div role="group" aria-label={copy.language} className="flex overflow-hidden rounded-md border border-[#d6d3d1]">
      <LangButton code="sk" label="SK" />
      <LangButton code="en" label="EN" />
    </div>
  );
}

function LangButton({ code, label }: { code: Lang; label: string }) {
  const copy = useCopy();
  const selected = copy.lang === code;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => copy.setLang(code)}
      className={`h-9 min-w-11 px-2 font-semibold ${
        selected ? "bg-[#0f5132] text-white" : "bg-white text-[#1c1917] hover:bg-[#f5f5f4]"
      }`}
    >
      {label}
    </button>
  );
}
