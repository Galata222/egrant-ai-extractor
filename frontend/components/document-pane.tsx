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
    <section aria-labelledby="document-heading" className="rounded-xl border border-[#d6d3d1] bg-white">
      <div className="border-b border-[#d6d3d1] px-4 py-3">
        <h2 id="document-heading" className="font-semibold">
          {copy.document}
        </h2>
        <p className="truncate text-sm text-[#44403c]">{file.name}</p>
      </div>
      <div className="bg-[#e7e5e4] p-3">
        {/* Local uploads and the server page render are not next/image sources. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={copy.preview} className="mx-auto max-h-[70vh] max-w-full rounded-md bg-white" />
      </div>
    </section>
  );
}
