"use client";

import Link from "next/link";
import { LanguageSwitch, useCopy } from "@/lib/locale";
import { useTheme } from "@/lib/theme";

type SiteHeaderProps = {
  mappingOpen?: boolean;
  onToggleMapping?: () => void;
  onSample?: () => void;
};

const outlineButton =
  "inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-card px-3.5 text-[13px] font-medium transition duration-200 hover:bg-soft";
const solidButton =
  "inline-flex h-9 shrink-0 items-center rounded-full bg-ink px-4 text-[13px] font-medium text-canvas transition duration-200 hover:opacity-85";

export function SiteHeader({ mappingOpen = false, onToggleMapping, onSample }: SiteHeaderProps) {
  const copy = useCopy();
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-30 bg-canvas/85 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 rounded-full border border-line bg-card px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Mark />
          <span className="min-w-0">
            <span className="display block text-[17px] leading-none tracking-[-0.04em]">{copy.brand}</span>
            <span className="mt-1 hidden truncate text-[11px] text-muted sm:block">{copy.navTagline}</span>
          </span>
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-2">
          {onToggleMapping ? (
            <button type="button" aria-expanded={mappingOpen} onClick={onToggleMapping} className={outlineButton}>
              {copy.mappingTitle}
            </button>
          ) : (
            <Link href="/" className={outlineButton}>
              {copy.mappingTitle}
            </Link>
          )}
          {onSample ? (
            <button type="button" onClick={onSample} className={solidButton}>
              {copy.sampleShort}
            </button>
          ) : (
            <Link href="/" className={solidButton}>
              {copy.sampleShort}
            </Link>
          )}
          <LanguageSwitch />
          <button
            type="button"
            aria-pressed={dark}
            aria-label={dark ? copy.themeLight : copy.themeDark}
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card transition duration-200 hover:bg-soft"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </nav>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="shrink-0">
      <path d="M13 2.2 15.2 10.2 13 13 10.8 10.2Z" fill="#7c5cff" />
      <path d="M23.8 13 15.8 15.2 13 13 15.8 10.8Z" fill="#3b82f6" />
      <path d="M13 23.8 10.8 15.8 13 13 15.2 15.8Z" fill="#22c55e" />
      <path d="M2.2 13 10.2 10.8 13 13 10.2 15.2Z" fill="#a855f7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M12.2 9.4A5.2 5.2 0 0 1 5.6 2.6 5.4 5.4 0 1 0 12.2 9.4Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="2.4" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 1.4v1.6M7.5 12v1.6M1.4 7.5h1.6M12 7.5h1.6M3.2 3.2l1.1 1.1M10.7 10.7l1.1 1.1M11.8 3.2 10.7 4.3M4.3 10.7 3.2 11.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
