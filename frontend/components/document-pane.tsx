"use client";

import { useCopy } from "@/lib/locale";

type DocumentPaneProps = {
  file: File;
  url: string;
  pagePreview: string | null;
};

export function DocumentPane({ file, url, pagePreview }: DocumentPaneProps) {
  const copy = useCopy();
  const src = pagePreview || url;

  return (
    <section aria-labelledby="document-heading" className="bg-card">
      <div className="border-b border-line px-5 py-4">
        <h2 id="document-heading" className="display text-2xl">
          {copy.document}
        </h2>
        <p className="mt-1 truncate text-sm text-muted">{file.name}</p>
      </div>
      <div className="bg-soft p-4">
        {/* Local uploads and the server page render are not next/image sources. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={copy.preview} className="mx-auto max-h-[70vh] max-w-full rounded-2xl bg-card" />
      </div>
    </section>
  );
}
