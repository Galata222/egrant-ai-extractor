"use client";

import { useState } from "react";
import { MappingPanel } from "@/components/mapping-panel";
import type { StoredMapping } from "@/lib/form-export";
import { useCopy } from "@/lib/locale";

type UploadPanelProps = {
  error: string | null;
  mapping: StoredMapping;
  onMapping: (value: StoredMapping) => void;
  onFile: (file: File) => void;
  onSample: () => void;
};

export function UploadPanel({ error, mapping, onMapping, onFile, onSample }: UploadPanelProps) {
  const copy = useCopy();
  const [active, setActive] = useState(false);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
      <MappingPanel value={mapping} onChange={onMapping} />
      <h2 className="text-xl font-semibold">{copy.uploadTitle}</h2>
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
        className={`rounded-xl border-2 border-dashed bg-white px-6 py-14 text-center ${
          active ? "border-[#0f5132] bg-[#f3faf6]" : "border-[#a8a29e]"
        }`}
      >
        <p className="text-lg text-[#292524]">{copy.uploadHint}</p>
        <label className="mt-6 inline-flex h-12 cursor-pointer items-center justify-center rounded-md bg-[#0f5132] px-5 font-semibold text-white hover:bg-[#0c3f27]">
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
          {copy.uploadTitle}
        </label>
      </div>
      <button
        type="button"
        onClick={onSample}
        className="h-11 self-start rounded-md border border-[#0f5132] px-4 font-semibold text-[#0f5132] hover:bg-[#f3faf6]"
      >
        {copy.sample}
      </button>
      {error ? (
        <p role="alert" className="rounded-md border border-[#991b1b] bg-[#fef2f2] px-3 py-2 text-[#7f1d1d]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
