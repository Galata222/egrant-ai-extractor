"use client";

import { useState } from "react";
import { MappingPanel } from "@/components/mapping-panel";
import { SiteHeader } from "@/components/site-header";
import type { StoredMapping } from "@/lib/form-export";
import { useCopy } from "@/lib/locale";

const FORMATS = ["PDF", "JPG", "PNG", "XLSX"] as const;

type UploadPanelProps = {
  error: string | null;
  loading: boolean;
  mapping: StoredMapping;
  onMapping: (value: StoredMapping) => void;
  onFile: (file: File) => void;
  onSample: () => void;
};

export function UploadPanel({ error, loading, mapping, onMapping, onFile, onSample }: UploadPanelProps) {
  const copy = useCopy();
  const [active, setActive] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [lead, ...rest] = copy.uploadTitle.split(" ");

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <SiteHeader
        mappingOpen={mappingOpen}
        onToggleMapping={() => setMappingOpen((open) => !open)}
        onSample={onSample}
      />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 pt-16 pb-10">
        {mappingOpen ? (
          <div className="rise mb-12 w-full">
            <MappingPanel value={mapping} onChange={onMapping} />
          </div>
        ) : null}
        <div className="rise h-24 w-[3px] rounded-full bg-gradient-to-b from-[#5b6cff] to-[#9b6bff]" />
        <h1 className="display rise mt-8 text-center text-[56px] leading-[0.92] sm:text-[84px]" style={{ animationDelay: "0.08s" }}>
          <span className="block">{lead}</span>
          {rest.length > 0 ? <span className="block">{rest.join(" ")}</span> : null}
        </h1>
        <p className="rise mt-6 max-w-md text-center text-[15px] text-muted" style={{ animationDelay: "0.16s" }}>
          {copy.uploadHint}
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setActive(true);
          }}
          onDragLeave={() => setActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setActive(false);
            const file = event.dataTransfer.files[0];
            if (file) onFile(file);
          }}
          className={`rise mt-12 flex w-full flex-col items-center rounded-[28px] border bg-card px-8 py-14 text-center transition duration-200 ${
            active ? "border-ink" : "border-line"
          }`}
          style={{ animationDelay: "0.22s" }}
        >
          {loading ? (
            <p role="status" className="display text-4xl">
              {copy.loading}
            </p>
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-soft">
                <UploadIcon />
              </span>
              <div className="mt-8 flex w-[200px] items-center gap-3 text-[11px] tracking-[0.16em] text-muted">
                <span className="h-px flex-1 bg-line" />
                {copy.orWord}
                <span className="h-px flex-1 bg-line" />
              </div>
              <label className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-full bg-ink px-6 text-sm font-medium text-canvas transition duration-200 hover:opacity-85">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onFile(file);
                    event.target.value = "";
                  }}
                />
                {copy.browse}
              </label>
            </>
          )}
          {error ? (
            <p role="alert" className="mt-6 max-w-md text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rise mt-8 grid w-full grid-cols-2 border-t border-line sm:grid-cols-4" style={{ animationDelay: "0.3s" }}>
          {FORMATS.map((format, index) => (
            <div
              key={format}
              className={`border-line px-4 py-8 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b sm:border-b-0" : ""} ${index < 3 ? "sm:border-r" : ""}`}
            >
              <FileIcon />
              <p className="mt-5 text-lg font-medium">{format}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="flex items-center justify-between border-t border-line px-6 py-4 text-[12px] text-muted">
        <p className="tracking-[0.14em] uppercase">{copy.stepUpload}</p>
        <p className="flex items-center gap-2">
          <LockIcon />
          {copy.encrypted}
        </p>
      </footer>
      {loading ? <Toast label={copy.fileAccepted} /> : null}
    </div>
  );
}

function Toast({ label }: { label: string }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
      <p role="status" className="rise flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] text-canvas">
        <CheckIcon />
        {label}
      </p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V5M12 5 8 9M12 5l4 4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 17.5V20h14v-2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M5 3.5h7.2L17 8.2V18.5H5V3.5Z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 3.6V8.3H16.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.2" y="5.2" width="7.6" height="5.4" rx="1" stroke="currentColor" strokeWidth="1" />
      <path d="M3.8 5.2V3.6a2.2 2.2 0 0 1 4.4 0v1.6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.4 7.1 6.2 8.8 9.6 5.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
