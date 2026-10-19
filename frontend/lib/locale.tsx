"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { copyFor, invalidFieldLabel, missingCountLabel, missingFieldLabel, readingFileLabel, type Lang } from "@/lib/copy";

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
    missingField: (label: string) => missingFieldLabel(label, value.lang),
    invalidField: (label: string) => invalidFieldLabel(label, value.lang),
    readingFile: (name: string) => readingFileLabel(name, value.lang),
  };
}

export function LanguageSwitch() {
  const copy = useCopy();
  return (
    <div role="group" aria-label={copy.language} className="flex h-9 items-center rounded-full border border-line bg-card p-0.5">
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
      className={`h-8 min-w-9 rounded-full px-2 text-sm font-medium transition duration-200 ${
        selected ? "bg-ink text-canvas" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
